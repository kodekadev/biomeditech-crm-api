import { Router } from "express";
import { z } from "zod";
import { BigQueryRepository } from "../bigquery/repository.js";
import { getTableConfig } from "../config/tables.js";
import { env } from "../config/env.js";
import { asyncHandler, HttpError } from "../http/errors.js";

export const integrationRouter = Router();

const leadPayloadSchema = z
  .object({
    nombre: z.string().trim().optional().or(z.literal("")),
    contacto_nombre: z.string().trim().optional().or(z.literal("")),
    name: z.string().trim().optional().or(z.literal("")),
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

const normalizeRut = (rut: string) => rut.replace(/[\s.]/g, "").toLowerCase();

integrationRouter.post(
  "/leads",
  asyncHandler(async (req, res) => {
    requireLeadIngestToken(req.headers.authorization, req.headers["x-api-key"]);

    const payload = leadPayloadSchema.parse(req.body);
    // || y no ??: WordPress a veces manda varios alias de nombre a la vez y
    // deja los que no uso como "" en vez de omitirlos -- con ?? un "" en el
    // primer alias ganaba y descartaba un valor real en los siguientes.
    const nombre = payload.nombre || payload.contacto_nombre || payload.name;
    if (!nombre) {
      throw new HttpError(400, "El campo nombre es requerido");
    }

    const leadsConfig = getTableConfig("leads");
    if (!leadsConfig) throw new HttpError(500, "Recurso leads no configurado");
    const clientesConfig = getTableConfig("clientes");
    if (!clientesConfig) throw new HttpError(500, "Recurso clientes no configurado");

    const source = payload.origen ?? payload.source ?? "web";
    const empresa = payload.empresa ?? payload.company ?? "";
    const telefono = payload.telefono ?? payload.tel ?? payload.phone ?? "";

    const notes = compactLines([
      payload.notas ?? payload.mensaje,
      payload.rut ? `RUT: ${payload.rut}` : undefined,
      payload.direccion ? `Dirección: ${payload.direccion}` : undefined,
      payload.region ? `Región: ${payload.region}` : undefined,
      payload.requiere_visita_tecnica ? `Requiere visita técnica: ${payload.requiere_visita_tecnica}` : undefined,
      payload.metadata ? `Metadata: ${JSON.stringify(payload.metadata)}` : undefined
    ]);

    const leadsRepo = new BigQueryRepository(leadsConfig);
    const clientesRepo = new BigQueryRepository(clientesConfig);

    // 1. Buscar cliente existente por RUT exacto
    let clienteId: string | undefined;
    let clienteAccion: "vinculado" | "creado" | "sin_cliente" = "sin_cliente";

    if (payload.rut) {
      const candidates = await clientesRepo.list({ search: payload.rut, limit: 10 });
      const match = candidates.find(
        (c) => normalizeRut(String(c.rut ?? "")) === normalizeRut(payload.rut!)
      );
      if (match) {
        clienteId = String(match.id);
        clienteAccion = "vinculado";
      }
    }

    // 2. Si no se encontró cliente y hay suficientes datos, crear uno nuevo
    if (!clienteId && empresa) {
      const nuevoCliente = await clientesRepo.create({
        nombre_empresa: empresa,
        contacto_nombre: nombre,
        email: payload.email ?? "",
        telefono,
        rut: payload.rut ?? "",
        region: payload.region ?? "",
        direccion: payload.direccion ?? "",
        tipo_entidad: payload.tipo_entidad ?? "",
        estado: "Activo",
        creado_por: source,
      });
      clienteId = String(nuevoCliente.id);
      clienteAccion = "creado";
    }

    // 3. Crear el lead incluyendo cliente_id si corresponde
    const leadData: Record<string, unknown> = {
      nombre,
      empresa,
      email: payload.email ?? "",
      telefono,
      canal: payload.canal ?? "web",
      estado: payload.estado ?? "nuevo",
      servicio_interes: payload.servicio_interes ?? payload.servicio ?? "",
      urgencia: payload.urgencia ?? "normal",
      notas: notes,
      tipo_entidad: payload.tipo_entidad ?? "",
      gestionado_por: source,
    };
    if (clienteId) leadData.cliente_id = clienteId;

    const lead = await leadsRepo.create(leadData);

    // 4. Si el cliente fue recién creado, actualizar su lead_id
    if (clienteAccion === "creado" && clienteId) {
      await clientesRepo.update(clienteId, { lead_id: String(lead.id) });
    }

    res.status(201).json({
      data: lead,
      cliente: { accion: clienteAccion, id: clienteId ?? null },
    });
  })
);
