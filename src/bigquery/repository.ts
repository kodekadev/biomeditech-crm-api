import type { TableConfig } from "../config/tables.js";
import { HttpError } from "../http/errors.js";
import { nowIso, partitionDate } from "../utils/date.js";
import { createId } from "../utils/ids.js";
import { bigquery, tableRef } from "./client.js";

type QueryParams = Record<string, string | number | boolean | null>;
type RecordBody = Record<string, unknown>;

const clampLimit = (limit: unknown) => {
  const parsed = Number(limit ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 1), 200);
};

const clampOffset = (offset: unknown) => {
  const parsed = Number(offset ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(Math.trunc(parsed), 0);
};

const normalizeBoolean = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const pickKnownFields = (config: TableConfig, body: RecordBody) => {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => config.fields.includes(key))
  ) as RecordBody;
};

const timestampFields = new Set([
  "creado_en",
  "actualizado_en",
  "gestionado_en",
  "emitida_en",
  "enviada_en",
  "aprobada_en",
  "rechazada_en",
  "enviado_en",
  "ultimo_acceso"
]);

const dateFields = new Set(["_fecha_particion", "vence_en"]);

const normalizeBigQueryValue = (field: string, value: unknown) => {
  if (typeof value !== "string" || value === "") return value;

  if (timestampFields.has(field)) {
    return new Date(value).toISOString();
  }

  if (dateFields.has(field)) {
    return new Date(value).toISOString().slice(0, 10);
  }

  return value;
};

const normalizeRecord = (record: RecordBody) => {
  return Object.fromEntries(
    Object.entries(record).map(([field, value]) => [field, normalizeBigQueryValue(field, value)])
  ) as RecordBody;
};

const validateRequired = (config: TableConfig, body: RecordBody) => {
  const missing = config.required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length > 0) {
    throw new HttpError(400, "Faltan campos requeridos", { missing });
  }
};

export class BigQueryRepository {
  constructor(private readonly config: TableConfig) {}

  async list(query: Record<string, unknown>) {
    const params: QueryParams = {
      limit: clampLimit(query.limit),
      offset: clampOffset(query.offset)
    };

    const where: string[] = [];

    for (const filter of this.config.filters) {
      if (query[filter] !== undefined && query[filter] !== "") {
        const paramName = `filter_${filter}`;
        where.push(`${filter} = @${paramName}`);
        params[paramName] = normalizeBoolean(query[filter]) as string | boolean;
      }
    }

    if (query.search && this.config.searchable.length > 0) {
      const parts = this.config.searchable.map((field) => `LOWER(CAST(${field} AS STRING)) LIKE @search`);
      where.push(`(${parts.join(" OR ")})`);
      params.search = `%${String(query.search).toLowerCase()}%`;
    }

    const sql = `
      SELECT *
      FROM ${tableRef(this.config.table)}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${this.config.orderBy} DESC
      LIMIT @limit OFFSET @offset
    `;

    const [rows] = await bigquery.query({ query: sql, params });
    return rows;
  }

  async getById(id: string) {
    const sql = `
      SELECT *
      FROM ${tableRef(this.config.table)}
      WHERE id = @id
      LIMIT 1
    `;
    const [rows] = await bigquery.query({ query: sql, params: { id } });
    return rows[0] ?? null;
  }

  async create(body: RecordBody) {
    const record = pickKnownFields(this.config, body);
    record.id = record.id ?? createId(this.config.idPrefix);
    record.creado_en = record.creado_en ?? nowIso();
    record._fecha_particion = record._fecha_particion ?? partitionDate(record.creado_en as string);

    validateRequired(this.config, record);
    const normalized = normalizeRecord(record);

    const entries = Object.entries(normalized);
    const columns = entries.map(([field]) => field).join(", ");
    const values = entries.map(([field]) => `@${field}`).join(", ");
    const params = Object.fromEntries(entries) as QueryParams;

    const sql = `
      INSERT INTO ${tableRef(this.config.table)} (${columns})
      VALUES (${values})
    `;

    await bigquery.query({ query: sql, params });
    return normalized;
  }

  async update(id: string, body: RecordBody) {
    const record = pickKnownFields(this.config, body);
    delete record.id;
    delete record.creado_en;
    delete record._fecha_particion;

    if (Object.keys(record).length === 0) {
      throw new HttpError(400, "No hay campos validos para actualizar");
    }

    const existing = await this.getById(id);
    if (!existing) {
      throw new HttpError(404, "Registro no encontrado");
    }

    if (this.config.hasUpdatedAt) {
      record.actualizado_en = nowIso();
    }

    const normalized = normalizeRecord(record);
    const entries = Object.entries(normalized);
    const setClause = entries.map(([field]) => `${field} = @${field}`).join(", ");
    const params = Object.fromEntries(entries) as QueryParams;
    params.id = id;

    const sql = `
      UPDATE ${tableRef(this.config.table)}
      SET ${setClause}
      WHERE id = @id
    `;

    await bigquery.query({ query: sql, params });
    return this.getById(id);
  }

  async delete(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new HttpError(404, "Registro no encontrado");
    }

    const sql = `
      DELETE FROM ${tableRef(this.config.table)}
      WHERE id = @id
    `;

    await bigquery.query({ query: sql, params: { id } });
    return { id, deleted: true };
  }
}
