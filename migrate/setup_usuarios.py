"""
setup_usuarios.py — Crea la tabla usuarios en BigQuery y carga los usuarios del sistema.

Uso:
  pip install bcrypt   (si no está instalado)
  python migrate/setup_usuarios.py
"""

import os, sys, uuid
sys.stdout.reconfigure(encoding="utf-8")
os.environ.setdefault(
    "GOOGLE_APPLICATION_CREDENTIALS",
    r"C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json",
)

import bcrypt
from datetime import datetime, timezone
from google.cloud import bigquery

PROJECT  = "jobs-425301"
DATASET  = "CRM"
TABLE_ID = f"{PROJECT}.{DATASET}.usuarios"
REF      = f"`{TABLE_ID}`"
client   = bigquery.Client(project=PROJECT)


def run(sql: str, label: str = ""):
    desc = label or sql.strip()[:70]
    print(f"  → {desc}...")
    try:
        client.query(sql).result()
        print("    ✓ OK")
    except Exception as e:
        print(f"    ⚠  {e}")


def main():
    print("=== Setup usuarios ===\n")

    # 1. Crear tabla si no existe
    run(
        f"""
        CREATE TABLE IF NOT EXISTS {REF} (
          id               STRING    NOT NULL,
          nombre_completo  STRING,
          email            STRING    NOT NULL,
          telefono         STRING,
          rol              STRING    NOT NULL,
          activo           BOOL      NOT NULL,
          password_hash    STRING,
          ultimo_acceso    TIMESTAMP,
          creado_en        TIMESTAMP,
          _fecha_particion DATE
        )
        PARTITION BY _fecha_particion
        OPTIONS (require_partition_filter = false)
        """,
        "Crear tabla usuarios",
    )

    # 2. Agregar password_hash si la tabla ya existía sin esa columna
    run(
        f"ALTER TABLE {REF} ADD COLUMN IF NOT EXISTS password_hash STRING",
        "ADD COLUMN password_hash",
    )

    # 3. Insertar usuarios
    now   = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()

    users = [
        {"email": "contacto@biomeditech.cl", "nombre_completo": "Contacto Biomeditech", "rol": "admin"},
        {"email": "mauricio@biomeditech.cl",  "nombre_completo": "Mauricio",             "rol": "admin"},
        {"email": "cristian@biomeditech.cl",  "nombre_completo": "Cristian",             "rol": "admin"},
    ]

    password = b"Biomeditech2026!"

    print("\n3. Creando usuarios...")
    for u in users:
        email = u["email"]

        # Eliminar si ya existe (para poder re-correr el script)
        run(
            f"DELETE FROM {REF} WHERE LOWER(email) = LOWER('{email}')",
            f"Eliminar {email} si existe",
        )

        pw_hash = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12)).decode("utf-8")
        uid     = f"U{uuid.uuid4().hex[:12].upper()}"

        errors = client.insert_rows_json(
            TABLE_ID,
            [{
                "id":               uid,
                "nombre_completo":  u["nombre_completo"],
                "email":            email,
                "telefono":         "",
                "rol":              u["rol"],
                "activo":           True,
                "password_hash":    pw_hash,
                "creado_en":        now,
                "_fecha_particion": today,
            }],
        )
        if errors:
            print(f"    ✗ Error al insertar {email}: {errors}")
        else:
            print(f"    ✓ {email} creado (id: {uid})")

    print("\n=== Setup completado ===")


if __name__ == "__main__":
    main()
