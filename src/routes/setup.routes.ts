import { Router } from "express";
import { bigquery, datasetId, projectId } from "../bigquery/client.js";
import { BigQueryRepository } from "../bigquery/repository.js";
import { getTableConfig } from "../config/tables.js";
import { asyncHandler } from "../http/errors.js";

export const setupRouter = Router();

const SIMULADORES_SCHEMA = {
  fields: [
    { name: "id",                type: "STRING"    },
    { name: "creado_en",        type: "TIMESTAMP" },
    { name: "_fecha_particion", type: "DATE"      },
    { name: "nombre",           type: "STRING"    },
    { name: "marca",            type: "STRING"    },
    { name: "modelo",           type: "STRING"    },
    { name: "serie",            type: "STRING"    },
    { name: "activo",           type: "BOOL"      },
    { name: "actualizado_en",   type: "TIMESTAMP" },
  ],
};

const PROTOCOLOS_PLANTILLAS_SCHEMA = {
  fields: [
    { name: "id",                type: "STRING"    },
    { name: "creado_en",        type: "TIMESTAMP" },
    { name: "_fecha_particion", type: "DATE"      },
    { name: "label",            type: "STRING"    },
    { name: "items_json",       type: "STRING"    },
    { name: "conclusiones_json", type: "STRING"   },
  ],
};

const PROTOCOLOS_HISTORIAL_SCHEMA = {
  fields: [
    { name: "id",               type: "STRING"    },
    { name: "creado_en",       type: "TIMESTAMP" },
    { name: "_fecha_particion",type: "DATE"      },
    { name: "correlativo",     type: "STRING"    },
    { name: "plantilla_id",    type: "STRING"    },
    { name: "plantilla_label", type: "STRING"    },
    { name: "cliente_id",      type: "STRING"    },
    { name: "cliente_nombre",  type: "STRING"    },
    { name: "tecnico",         type: "STRING"    },
    { name: "marca",           type: "STRING"    },
    { name: "modelo",          type: "STRING"    },
    { name: "serie",           type: "STRING"    },
    { name: "anio",            type: "STRING"    },
    { name: "servicio",        type: "STRING"    },
    { name: "observaciones",   type: "STRING"    },
    { name: "fecha",           type: "STRING"    },
    { name: "datos_json",      type: "STRING"    },
  ],
};

const SEED_SIMULADORES = [
  { nombre: "Simulador de NIBP",                 marca: "Contec", modelo: "MS200",       serie: "21060300004" },
  { nombre: "Analizador de seguridad electrica",  marca: "Fluke",  modelo: "ESA 612",     serie: "5636054"     },
  { nombre: "Simulador de SpO2",                  marca: "Contec", modelo: "MS100",       serie: "21080700003" },
  { nombre: "Simulador de ECG",                   marca: "XuZhou", modelo: "SKX-2000C",   serie: "20c23072807" },
  { nombre: "Multitester",                        marca: "Fluke",  modelo: "87V",         serie: "38850529"    },
  { nombre: "Termometro",                         marca: "Unit",   modelo: "UT325",       serie: "C220767186"  },
  { nombre: "Camara Termografica",                marca: "Unit",   modelo: "Uti260A",     serie: "C231826721"  },
  { nombre: "Osciloscopio",                       marca: "Unit",   modelo: "UTD2102CEX",  serie: "5160024846"  },
];

async function createTableIfMissing(
  tableName: string,
  schema: { fields: { name: string; type: string }[] },
  results: { step: string; ok: boolean; msg: string }[]
) {
  try {
    await bigquery.dataset(datasetId).createTable(tableName, {
      schema,
      timePartitioning: { type: "DAY", field: "_fecha_particion" },
    });
    results.push({ step: `create_${tableName}`, ok: true, msg: `tabla ${tableName} creada` });
  } catch (e: unknown) {
    const code = (e as { code?: number }).code;
    if (code === 409) {
      results.push({ step: `create_${tableName}`, ok: true, msg: `tabla ${tableName} ya existía` });
    } else {
      results.push({ step: `create_${tableName}`, ok: false, msg: String(e) });
      return false;
    }
  }
  return true;
}

// POST /api/setup/simuladores  — crea tabla + siembra datos por defecto
setupRouter.post(
  "/simuladores",
  asyncHandler(async (_req, res) => {
    const results: { step: string; ok: boolean; msg: string }[] = [];

    const ok = await createTableIfMissing("simuladores", SIMULADORES_SCHEMA, results);
    if (!ok) { res.json({ ok: false, results }); return; }

    // Check if already seeded
    const [rows] = await bigquery.query({
      query: `SELECT COUNT(*) AS cnt FROM \`${projectId}.${datasetId}.simuladores\``,
    });
    const cnt = Number((rows as { cnt: { value: string } | number }[])[0]?.cnt ?? 0);
    const cntNum = typeof cnt === "object" ? Number((cnt as { value: string }).value) : cnt;

    if (cntNum > 0) {
      results.push({ step: "seed", ok: true, msg: `ya tenía ${cntNum} simuladores, seed omitido` });
      res.json({ ok: true, results });
      return;
    }

    const repo = new BigQueryRepository(getTableConfig("simuladores")!);
    let seeded = 0;
    for (const item of SEED_SIMULADORES) {
      try {
        await repo.create({ ...item, activo: true });
        seeded++;
      } catch (e: unknown) {
        results.push({ step: "seed", ok: false, msg: String(e) });
      }
    }
    results.push({ step: "seed", ok: true, msg: `${seeded} simuladores insertados` });

    res.json({ ok: true, results });
  })
);

// POST /api/setup/protocolos  — crea tablas protocolos_plantillas y protocolos_historial
setupRouter.post(
  "/protocolos",
  asyncHandler(async (_req, res) => {
    const results: { step: string; ok: boolean; msg: string }[] = [];
    await createTableIfMissing("protocolos_plantillas", PROTOCOLOS_PLANTILLAS_SCHEMA, results);
    await createTableIfMissing("protocolos_historial", PROTOCOLOS_HISTORIAL_SCHEMA, results);
    res.json({ ok: true, results });
  })
);
