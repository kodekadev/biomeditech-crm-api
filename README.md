# Biomeditech CRM API

API independiente para leer y escribir datos del CRM en BigQuery sin acoplar el frontend Next.js a la base de datos.

## Stack

- Node.js 20
- Express
- TypeScript
- BigQuery SDK oficial de Google Cloud
- Zod para validacion ligera de entorno

## Configuracion

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` desde `.env.example`.

3. Para desarrollo local, usa una service account con permisos sobre BigQuery:

```bash
set GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\service-account.json
```

4. Ejecutar:

```bash
npm run dev
```

La API queda en `http://localhost:4000`.

## Variables

- `GCP_PROJECT_ID`: por defecto `jobs-425301`
- `BIGQUERY_DATASET`: por defecto `CRM`
- `BIGQUERY_LOCATION`: por defecto `us-central1`
- `CORS_ORIGIN`: origen permitido para el frontend

## Endpoints

Cada recurso soporta:

- `GET /api/{recurso}` listado con filtros por query string
- `GET /api/{recurso}/:id` detalle
- `POST /api/{recurso}` crear
- `PATCH /api/{recurso}/:id` actualizar
- `DELETE /api/{recurso}/:id` eliminar

Recursos disponibles:

- `leads`
- `clientes`
- `productos`
- `cotizaciones`
- `servicios-cotizacion`
- `comunicaciones`
- `usuarios`
- `actividad-dashboard`

Endpoints especiales:

- `GET /health`
- `GET /api/dashboard/resumen`

## Ejemplos

Crear lead:

```bash
curl -X POST http://localhost:4000/api/leads ^
  -H "Content-Type: application/json" ^
  -d "{\"nombre\":\"Juan Perez\",\"empresa\":\"Clinica Central\",\"canal\":\"email\",\"estado\":\"nuevo\",\"creado_en\":\"2026-05-04T12:00:00.000Z\"}"
```

Listar cotizaciones aprobadas:

```bash
curl "http://localhost:4000/api/cotizaciones?estado=aprobada&limit=20"
```

## Notas de BigQuery

- La API rellena `id`, `creado_en` y `_fecha_particion` cuando no vienen en el body.
- En tablas con `actualizado_en`, los `PATCH` lo actualizan automaticamente.
- Los nombres de tablas y columnas estan definidos en `src/config/tables.ts` para evitar interpolar recursos arbitrarios en SQL.

