import os, uuid, re, sys
sys.stdout.reconfigure(encoding="utf-8")
from datetime import datetime, timezone
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", r"C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json")
import openpyxl
from google.cloud import bigquery

EXCEL = r"C:\Users\bastian\Downloads\Cotizacion_base_con_historial4.xlsm"
client = bigquery.Client(project="jobs-425301")
TABLE = "jobs-425301.CRM.clientes"

wb = openpyxl.load_workbook(EXCEL, read_only=True, keep_vba=False)
ws = wb["Datos cliente "]

today = datetime.now(timezone.utc).isoformat()
today_date = datetime.now(timezone.utc).date().isoformat()
rows = []

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2:
        continue
    nombre = str(row[2] or "").strip()
    if not nombre or nombre == "None":
        continue
    tel_raw = str(row[12] or "").strip()
    tel = re.sub(r"[^\d+]", "", tel_raw)[:20] if tel_raw else ""
    rows.append({
        "id": f"C{uuid.uuid4().hex[:12].upper()}",
        "rut": str(row[4] or "").strip(),
        "nombre_empresa": nombre,
        "contacto_nombre": str(row[8] or "").strip(),
        "contacto_cargo": "",
        "email": str(row[13] or "").strip(),
        "email_facturacion": "",
        "telefono": tel,
        "telefono_alt": "",
        "rubro": "Salud",
        "tipo_cliente": "clinica",
        "ciudad": str(row[14] or "").strip(),
        "region": str(row[1] or "").strip(),
        "comuna": str(row[14] or "").strip(),
        "direccion": str(row[6] or "").strip(),
        "estado": "activo",
        "creado_por": "migracion_excel",
        "creado_en": today,
        "_fecha_particion": today_date,
    })

errors = client.insert_rows_json(TABLE, rows)
if errors:
    print("Errores:", errors[:3])
else:
    print(f"OK: {len(rows)} clientes cargados")
