import os, sys
sys.stdout.reconfigure(encoding="utf-8")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json"
from google.cloud import bigquery
c = bigquery.Client(project="jobs-425301")

print("=== Buscar UnoSalud ===")
for row in c.query("SELECT id, nombre_empresa, rut, comuna FROM `jobs-425301.CRM`.clientes WHERE LOWER(nombre_empresa) LIKE '%uno%' OR LOWER(nombre_empresa) LIKE '%salud%' LIMIT 10").result():
    print(dict(row))

print("\n=== Conteos ===")
n_cat = list(c.query("SELECT COUNT(*) as n FROM `jobs-425301.CRM`.catalogo_servicios").result())[0]["n"]
n_prod = list(c.query("SELECT COUNT(*) as n FROM `jobs-425301.CRM`.productos").result())[0]["n"]
n_cli = list(c.query("SELECT COUNT(*) as n FROM `jobs-425301.CRM`.clientes").result())[0]["n"]
print(f"catalogo_servicios: {n_cat}")
print(f"productos (tabla vieja): {n_prod}")
print(f"clientes: {n_cli}")
