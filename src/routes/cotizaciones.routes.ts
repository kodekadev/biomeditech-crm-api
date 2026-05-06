import { Router } from "express";
import { bigquery, tableRef } from "../bigquery/client.js";
import { asyncHandler, HttpError } from "../http/errors.js";
import { nowIso, partitionDate } from "../utils/date.js";
import { createId } from "../utils/ids.js";

export const cotizacionesRouter = Router();

// ── correlativo: COT-DDMMyyNNN ──────────────────────────────────────────────

async function nextCorrelativo(): Promise<string> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const prefix = `COT-${dd}${mm}${yy}`;

  const sql = `
    SELECT numero
    FROM ${tableRef("cotizaciones")}
    WHERE numero LIKE @prefix
    ORDER BY numero DESC
    LIMIT 1
  `;
  const [rows] = await bigquery.query({ query: sql, params: { prefix: `${prefix}%` } });

  let seq = 1;
  if (rows.length > 0) {
    const last = String(rows[0].numero ?? "");
    const lastSeq = parseInt(last.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(2, "0")}`;
}

// ── GET /api/cotizaciones ────────────────────────────────────────────────────

cotizacionesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const sql = `
      SELECT *
      FROM ${tableRef("cotizaciones")}
      ORDER BY creado_en DESC
      LIMIT @limit OFFSET @offset
    `;
    const [rows] = await bigquery.query({ query: sql, params: { limit, offset } });
    res.json({ data: rows });
  })
);

// ── GET /api/cotizaciones/:id ────────────────────────────────────────────────
// Returns header + items array

cotizacionesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [[header], [items]] = await Promise.all([
      bigquery.query({
        query: `SELECT * FROM ${tableRef("cotizaciones")} WHERE id = @id LIMIT 1`,
        params: { id },
      }),
      bigquery.query({
        query: `SELECT * FROM ${tableRef("servicios_cotizacion")} WHERE cotizacion_id = @id ORDER BY linea_numero`,
        params: { id },
      }),
    ]);

    if (!header[0]) throw new HttpError(404, "Cotización no encontrada");
    res.json({ data: { ...header[0], items } });
  })
);

// ── POST /api/cotizaciones ───────────────────────────────────────────────────
// Body: { cliente_id, notas_cliente?, items: [{codigo, equipo, descripcion, descripcion_larga?, precio_unitario, cantidad, descuento_pct?}] }

cotizacionesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as {
      cliente_id: string;
      notas_cliente?: string;
      notas_internas?: string;
      forma_pago?: string;
      validez_dias?: number;
      items?: Array<{
        producto_id?: string;
        codigo?: string;
        descripcion: string;
        descripcion_larga?: string;
        tipo_servicio?: string;
        precio_unitario: number;
        cantidad?: number;
        descuento_pct?: number;
      }>;
      // legacy single-line fields kept for backward compat
      numero?: string;
      subtotal_neto?: number;
      iva?: number;
      total_con_iva?: number;
    };

    if (!body.cliente_id) throw new HttpError(400, "cliente_id es requerido");

    const items = body.items ?? [];

    // Compute totals from items (if multi-line), else fall back to legacy fields
    let subtotalNeto: number;
    if (items.length > 0) {
      subtotalNeto = items.reduce((acc, it) => {
        const cant = it.cantidad ?? 1;
        const disc = it.descuento_pct ?? 0;
        return acc + Math.round(it.precio_unitario * cant * (1 - disc / 100));
      }, 0);
    } else {
      subtotalNeto = Number(body.subtotal_neto ?? 0);
    }

    const iva = Math.round(subtotalNeto * 0.19);
    const total = subtotalNeto + iva;
    const numero = body.numero ?? (await nextCorrelativo());
    const now = nowIso();
    const cotId = createId("Q");

    const cotRecord = {
      id: cotId,
      numero,
      cliente_id: body.cliente_id,
      estado: "emitida",
      subtotal_neto: subtotalNeto,
      iva,
      total_con_iva: total,
      moneda: "CLP",
      forma_pago: body.forma_pago ?? "50% inicio - 50% entrega",
      validez_dias: body.validez_dias ?? 30,
      diagnostico_incluido: true,
      notas_cliente: body.notas_cliente ?? "",
      notas_internas: body.notas_internas ?? "",
      emitida_en: now,
      creado_en: now,
      _fecha_particion: partitionDate(now),
    };

    const cols = Object.keys(cotRecord).join(", ");
    const vals = Object.keys(cotRecord).map((k) => `@${k}`).join(", ");
    await bigquery.query({
      query: `INSERT INTO ${tableRef("cotizaciones")} (${cols}) VALUES (${vals})`,
      params: cotRecord as Record<string, unknown>,
    });

    // Insert items
    const insertedItems: unknown[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const cant = it.cantidad ?? 1;
      const disc = it.descuento_pct ?? 0;
      const subtotal = Math.round(it.precio_unitario * cant * (1 - disc / 100));

      const itemRecord = {
        id: createId("SC"),
        cotizacion_id: cotId,
        producto_id: it.producto_id ?? "",
        linea_numero: i + 1,
        descripcion: it.descripcion,
        descripcion_larga: it.descripcion_larga ?? "",
        tipo_servicio: it.tipo_servicio ?? it.codigo ?? "",
        precio_unitario: it.precio_unitario,
        cantidad: cant,
        descuento_pct: disc,
        subtotal,
        creado_en: now,
        _fecha_particion: partitionDate(now),
      };

      const ic = Object.keys(itemRecord).join(", ");
      const iv = Object.keys(itemRecord).map((k) => `@${k}`).join(", ");
      await bigquery.query({
        query: `INSERT INTO ${tableRef("servicios_cotizacion")} (${ic}) VALUES (${iv})`,
        params: itemRecord as Record<string, unknown>,
      });
      insertedItems.push(itemRecord);
    }

    res.status(201).json({ data: { ...cotRecord, items: insertedItems } });
  })
);

// ── PATCH /api/cotizaciones/:id ──────────────────────────────────────────────

cotizacionesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const allowed = ["estado", "notas_cliente", "notas_internas", "forma_pago", "validez_dias", "aprobada_en", "rechazada_en", "motivo_rechazo"];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) throw new HttpError(400, "Sin campos válidos");
    updates.actualizado_en = nowIso();
    updates.id = id;

    const set = Object.keys(updates).filter(k => k !== "id").map(k => `${k} = @${k}`).join(", ");
    await bigquery.query({
      query: `UPDATE ${tableRef("cotizaciones")} SET ${set} WHERE id = @id`,
      params: updates as Record<string, unknown>,
    });

    const [rows] = await bigquery.query({
      query: `SELECT * FROM ${tableRef("cotizaciones")} WHERE id = @id LIMIT 1`,
      params: { id },
    });
    res.json({ data: rows[0] ?? null });
  })
);

// ── DELETE /api/cotizaciones/:id ─────────────────────────────────────────────

cotizacionesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await bigquery.query({
      query: `DELETE FROM ${tableRef("servicios_cotizacion")} WHERE cotizacion_id = @id`,
      params: { id },
    });
    await bigquery.query({
      query: `DELETE FROM ${tableRef("cotizaciones")} WHERE id = @id`,
      params: { id },
    });
    res.json({ data: { id, deleted: true } });
  })
);
