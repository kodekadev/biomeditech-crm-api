# Integración Formulario Web → CRM Biomeditech

Documento para el equipo de desarrollo del sitio web.  
Cada vez que un usuario envíe el formulario de contacto, deben hacer un `POST` a este endpoint para que el lead quede registrado automáticamente en el CRM.

---

## Endpoint

```
POST https://biomeditech-crm-api-994947687832.us-central1.run.app/api/integrations/leads
```

---

## Headers requeridos

```http
Content-Type: application/json
Authorization: Bearer 1872173b9e67b20ca1fb6c11e3eddfa12e77b5f61fb0ba4bf007b4ff20940a69
```

---

## Body — campos del formulario

```json
{
  "nombre":                 "Juan Perez",
  "email":                  "juan@clinica.cl",
  "telefono":               "+56 9 1234 5678",
  "empresa":                "Clínica Central",
  "rut":                    "76.123.456-7",
  "region":                 "RM Región Metropolitana de Santiago",
  "tipo_entidad":           "Privada",
  "servicio":               "MP - Mantención Preventiva",
  "requiere_visita_tecnica": "Si",
  "mensaje":                "Solicita mantención preventiva de monitor Mindray",
  "origen":                 "formulario-web"
}
```

### Descripción de cada campo

| Campo                    | Tipo   | Obligatorio | Descripción                                          |
|--------------------------|--------|:-----------:|------------------------------------------------------|
| `nombre`                 | string | **Sí**      | Nombre y apellido del contacto                       |
| `email`                  | string | No          | Correo electrónico                                   |
| `telefono`               | string | No          | Número de contacto (incluir +56)                     |
| `empresa`                | string | No          | Empresa o centro médico                              |
| `rut`                    | string | No          | RUT empresa o cliente                                |
| `region`                 | string | No          | Región seleccionada en el formulario                 |
| `tipo_entidad`           | string | No          | `"Privada"`, `"Pública"`, `"Municipal"`, etc.        |
| `servicio`               | string | No          | Tipo de servicio seleccionado (ej: `"MP - Mantención Preventiva"`) |
| `requiere_visita_tecnica`| string | No          | `"Si"` o `"No"`                                      |
| `mensaje`                | string | No          | Texto libre del campo Mensaje (máx. 200 caracteres)  |
| `origen`                 | string | No          | Identificador de origen. Usar siempre `"formulario-web"` |

> El único campo obligatorio es `nombre`. Si falta, la API responde `400`.

---

## Respuestas

### Éxito — `201 Created`

```json
{
  "data": {
    "id": "L-E618B4E9",
    "nombre": "Juan Perez",
    "empresa": "Clínica Central",
    "email": "juan@clinica.cl",
    "telefono": "+56 9 1234 5678",
    "canal": "web",
    "estado": "nuevo",
    "servicio_interes": "MP - Mantención Preventiva",
    "tipo_entidad": "Privada",
    "notas": "Solicita mantención preventiva\nRegión: RM\nRequiere visita técnica: Si",
    "gestionado_por": "formulario-web",
    "creado_en": "2026-05-15T18:48:09.254Z"
  }
}
```

### Errores posibles

| Código | Motivo                              |
|--------|-------------------------------------|
| `400`  | Falta el campo `nombre`             |
| `401`  | Token incorrecto o ausente          |
| `422`  | Body con formato inválido (no JSON) |
| `500`  | Error interno del servidor          |

---

## Ejemplo en JavaScript (fetch)

```javascript
async function enviarLead(formData) {
  const response = await fetch(
    "https://biomeditech-crm-api-994947687832.us-central1.run.app/api/integrations/leads",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 1872173b9e67b20ca1fb6c11e3eddfa12e77b5f61fb0ba4bf007b4ff20940a69"
      },
      body: JSON.stringify({
        nombre:                  formData.nombre,
        email:                   formData.email,
        telefono:                formData.telefono,
        empresa:                 formData.empresa,
        rut:                     formData.rut,
        region:                  formData.region,
        tipo_entidad:            formData.tipo_entidad,
        servicio:                formData.servicio,
        requiere_visita_tecnica: formData.requiere_visita_tecnica,
        mensaje:                 formData.mensaje,
        origen:                  "formulario-web"
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Error al enviar el formulario");
  }

  return response.json();
}
```

---

## Ejemplo en cURL (para pruebas)

```bash
curl -X POST "https://biomeditech-crm-api-994947687832.us-central1.run.app/api/integrations/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1872173b9e67b20ca1fb6c11e3eddfa12e77b5f61fb0ba4bf007b4ff20940a69" \
  -d '{
    "nombre": "Juan Perez",
    "email": "juan@clinica.cl",
    "telefono": "+56 9 1234 5678",
    "empresa": "Clinica Central",
    "rut": "76.123.456-7",
    "region": "RM Region Metropolitana de Santiago",
    "tipo_entidad": "Privada",
    "servicio": "MP - Mantencion Preventiva",
    "requiere_visita_tecnica": "Si",
    "mensaje": "Solicita mantencion preventiva",
    "origen": "formulario-web"
  }'
```

---

## Notas importantes

- El token es **privado** — no mostrarlo en código frontend público (usar variable de entorno o llamada desde backend/serverless).
- El campo `origen` debe enviarse siempre como `"formulario-web"` para identificar correctamente la fuente en el CRM.
- El reCAPTCHA debe validarse **antes** de llamar a este endpoint (en el backend del sitio web).
- La API es tolerante a campos extra — si el formulario agrega campos nuevos en el futuro, no romperá la integración.
