import { Router } from "express";
import { z } from "zod";
import { BigQueryRepository } from "../bigquery/repository.js";
import { getTableConfig } from "../config/tables.js";
import { env } from "../config/env.js";
import { asyncHandler, HttpError } from "../http/errors.js";

export const integrationRouter = Router();

const leadPayloadSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    contacto_nombre: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    empresa: z.string().trim().optional(),
    company: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    telefono: z.string().trim().optional(),
    tel: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    canal: z.string().trim().optional(),
    source: z.string().trim().optional(),
    origen: z.string().trim().optional(),
    estado: z.string().trim().optional(),
    servicio_interes: z.string().trim().optional(),
    servicio: z.string().trim().optional(),
    urgencia: z.string().trim().optional(),
    notas: z.string().trim().optional(),
    mensaje: z.string().trim().optional(),
    rut: z.string().trim().optional(),
    direccion: z.string().trim().optional(),
    region: z.string().trim().optional(),
    tipo_entidad: z.string().trim().optional(),
    requiere_visita_tecnica: z.string().trim().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .passthrough();

const getBearerToken = (authorization?: string) => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

const requireLeadIngestToken = (authorization?: string, apiKey?: string | string[]) => {
  if (!env.LEADS_INGEST_TOKEN) {
    throw new HttpError(503, "Token de integracion de leads no configurado");
  }

  const provided = getBearerToken(authorization) ?? (Array.isArray(apiKey) ? apiKey[0] : apiKey);
  if (provided !== env.LEADS_INGEST_TOKEN) {
    throw new HttpError(401, "Token de integracion invalido");
  }
};

const compactLines = (lines: Array<string | undefined>) => {
  return lines.filter((line): line is string => Boolean(line && line.trim())).join("\n");
};

integrationRouter.post(
  "/leads",
  asyncHandler(async (req, res) => {
    requireLeadIngestToken(req.headers.authorization, req.headers["x-api-key"]);

    const payload = leadPayloadSchema.parse(req.body);
    const nombre = payload.nombre ?? payload.contacto_nombre ?? payload.name;
    if (!nombre) {
      throw new HttpError(400, "El campo nombre es requerido");
    }

    const config = getTableConfig("leads");
    if (!config) {
      throw new HttpError(500, "Recurso leads no configurado");
    }

    const source = payload.origen ?? payload.source ?? "web";
    const notes = compactLines([
      payload.notas ?? payload.mensaje,
      payload.rut ? `RUT: ${payload.rut}` : undefined,
      payload.direccion ? `Dirección: ${payload.direccion}` : undefined,
      payload.region ? `Región: ${payload.region}` : undefined,
      payload.requiere_visita_tecnica ? `Requiere visita técnica: ${payload.requiere_visita_tecnica}` : undefined,
      payload.metadata ? `Metadata: ${JSON.stringify(payload.metadata)}` : undefined
    ]);

    const repository = new BigQueryRepository(config);
    const row = await repository.create({
      nombre,
      empresa: payload.empresa ?? payload.company ?? "",
      email: payload.email ?? "",
      telefono: payload.telefono ?? payload.tel ?? payload.phone ?? "",
      canal: payload.canal ?? "web",
      estado: payload.estado ?? "nuevo",
      servicio_interes: payload.servicio_interes ?? payload.servicio ?? "",
      urgencia: payload.urgencia ?? "normal",
      notas: notes,
      tipo_entidad: payload.tipo_entidad ?? "",
      gestionado_por: source
    });

    res.status(201).json({ data: row });
  })
);
