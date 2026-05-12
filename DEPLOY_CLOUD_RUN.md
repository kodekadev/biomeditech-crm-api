# Deploy Cloud Run

Esta API debe quedar publica para que proveedores externos puedan llamar el endpoint de leads, pero protegida por `LEADS_INGEST_TOKEN`.

## Endpoint para proveedor

```text
POST https://<cloud-run-url>/api/integrations/leads
```

Headers:

```http
Content-Type: application/json
Authorization: Bearer <LEADS_INGEST_TOKEN>
```

Body ejemplo:

```json
{
  "nombre": "Juan Perez",
  "empresa": "Clinica Central",
  "telefono": "+56 9 1234 5678",
  "email": "juan@clinica.cl",
  "canal": "wsp",
  "servicio": "MP",
  "urgencia": "normal",
  "mensaje": "Solicita mantencion preventiva",
  "origen": "proveedor-externo"
}
```

## Deploy con Cloud Build

Desde una maquina con `gcloud` instalado y autenticado:

```bash
gcloud config set project jobs-425301
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _LEADS_INGEST_TOKEN="<TOKEN_REAL>",_CORS_ORIGIN="https://biomeditech.cl"
```

El servicio queda con acceso publico (`--allow-unauthenticated`), pero el endpoint de integracion valida el token antes de crear leads.

## Permisos necesarios

La service account configurada en `_SERVICE_ACCOUNT` debe existir y tener permisos para escribir en BigQuery sobre el dataset `CRM`.

Service account esperada por defecto:

```text
biomeditech-crm-api@jobs-425301.iam.gserviceaccount.com
```

Si usan otra service account, cambiar `_SERVICE_ACCOUNT` al ejecutar Cloud Build.

## Probar despues del deploy

```bash
curl -X POST "https://<cloud-run-url>/api/integrations/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_REAL>" \
  -d '{"nombre":"Juan Perez","empresa":"Clinica Central","telefono":"+56 9 1234 5678","email":"juan@clinica.cl","canal":"wsp","servicio":"MP","mensaje":"Lead de prueba","origen":"postman"}'
```
