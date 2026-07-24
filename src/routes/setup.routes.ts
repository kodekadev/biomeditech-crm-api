import { Router } from "express";
import { getTableConfig } from "../config/tables.js";
import { BigQueryRepository } from "../bigquery/repository.js";
import { asyncHandler } from "../http/errors.js";

export const setupRouter = Router();

const DEFAULT_SIMULADORES = [
  { nombre: "Simulador de ECG", marca: "XuZhou", modelo: "SKX-2000C", serie: "20c23072807" },
  { nombre: "Simulador de NIBP", marca: "Contec", modelo: "MS200", serie: "21060300004" },
  { nombre: "Simulador de SpO2", marca: "Contec", modelo: "MS100", serie: "21080700003" },
  { nombre: "Analizador de seguridad electrica", marca: "Fluke", modelo: "ESA 612", serie: "5636054" },
  { nombre: "Multitester", marca: "Fluke", modelo: "87V", serie: "38850529" },
  { nombre: "Osciloscopio", marca: "Unit", modelo: "UTD2102CEX", serie: "5160024846" },
  { nombre: "Camara Termografica", marca: "Unit", modelo: "Uti260A", serie: "C231826721" },
  { nombre: "Termometro", marca: "Unit", modelo: "UT325", serie: "C220767186" },
  { nombre: "Vacuometro", marca: "Ibramed", modelo: "CL.B", serie: "WO00138122" },
];

setupRouter.post(
  "/simuladores",
  asyncHandler(async (_req, res) => {
    const config = getTableConfig("simuladores")!;
    const repository = new BigQueryRepository(config);

    const results = await Promise.all(
      DEFAULT_SIMULADORES.map((item) => repository.create({ ...item, activo: true }))
    );

    res.json({ ok: true, results });
  })
);
