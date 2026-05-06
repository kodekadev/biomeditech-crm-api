"""
One-time setup: adds pdf_url column to cotizaciones table + creates GCS bucket.

Run once:
    $env:PYTHONUTF8="1"
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json"
    python migrate/setup_pdf_storage.py
"""

import os, sys
sys.stdout.reconfigure(encoding="utf-8")
os.environ.setdefault(
    "GOOGLE_APPLICATION_CREDENTIALS",
    r"C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json"
)

PROJECT = "jobs-425301"
DATASET = "CRM"
BUCKET  = "biomeditech-cotizaciones"
REGION  = "us-central1"

from google.cloud import bigquery, storage

# ── 1. Add pdf_url column to cotizaciones ─────────────────────────────────────
bq = bigquery.Client(project=PROJECT)

print("Agregando columna pdf_url a cotizaciones...")
try:
    bq.query(f"""
        ALTER TABLE `{PROJECT}.{DATASET}.cotizaciones`
        ADD COLUMN IF NOT EXISTS pdf_url STRING
    """).result()
    print("  OK: columna pdf_url lista")
except Exception as e:
    print(f"  WARN: {e}")

# ── 2. Create GCS bucket ───────────────────────────────────────────────────────
gcs = storage.Client(project=PROJECT)

print(f"\nCreando bucket gs://{BUCKET} ...")
try:
    bucket = gcs.create_bucket(BUCKET, location=REGION)
    # Allow public read on all objects (uniform access)
    bucket.iam_configuration.uniform_bucket_level_access_enabled = True
    bucket.patch()

    from google.cloud.storage import constants as gcs_const
    policy = bucket.get_iam_policy(requested_policy_version=3)
    policy.bindings.append({
        "role": "roles/storage.objectViewer",
        "members": {"allUsers"},
    })
    bucket.set_iam_policy(policy)
    print(f"  OK: bucket {BUCKET} creado y configurado como publico")
except Exception as e:
    if "already own" in str(e).lower() or "409" in str(e):
        print(f"  OK: bucket ya existe")
    else:
        print(f"  ERROR: {e}")

# ── 3. Grant service account Storage Object Creator ───────────────────────────
SA = "jobs-111@jobs-425301.iam.gserviceaccount.com"
print(f"\nDando permisos de escritura a {SA} ...")
try:
    bucket = gcs.bucket(BUCKET)
    policy = bucket.get_iam_policy(requested_policy_version=3)
    policy.bindings.append({
        "role": "roles/storage.objectCreator",
        "members": {f"serviceAccount:{SA}"},
    })
    bucket.set_iam_policy(policy)
    print("  OK: permisos configurados")
except Exception as e:
    print(f"  WARN: {e}")

print("\nSetup completado.")
