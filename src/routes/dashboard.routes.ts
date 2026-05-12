import { Router } from "express";
import { bigquery, tableRef } from "../bigquery/client.js";
import { asyncHandler } from "../http/errors.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/resumen",
  asyncHandler(async (_req, res) => {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM ${tableRef("leads")} WHERE estado IN ("nuevo", "no_gestionado")) AS leads_pendientes,
        (SELECT COUNT(*) FROM ${tableRef("clientes")} WHERE estado = "activo") AS clientes_activos,
        (SELECT COUNT(*) FROM ${tableRef("cotizaciones")} WHERE estado IN ("emitida", "enviada", "en_revision")) AS cotizaciones_abiertas,
        (SELECT IFNULL(SUM(total_con_iva), 0) FROM ${tableRef("cotizaciones")} WHERE estado = "aprobada") AS ventas_aprobadas,
        ARRAY(
          SELECT AS STRUCT *
          FROM ${tableRef("actividad_dashboard")}
          ORDER BY creado_en DESC
          LIMIT 10
        ) AS actividad_reciente
    `;

    const [rows] = await bigquery.query({ query: sql });
    res.json({ data: rows[0] });
  })
);

