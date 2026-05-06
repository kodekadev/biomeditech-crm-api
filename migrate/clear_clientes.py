import os
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", r"C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json")
from google.cloud import bigquery
c = bigquery.Client(project="jobs-425301")
c.query("DELETE FROM `jobs-425301.CRM`.clientes WHERE TRUE").result()
print("ok")
