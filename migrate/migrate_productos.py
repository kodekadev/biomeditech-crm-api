"""
migrate_productos.py — Actualiza el schema de CRM.productos para que coincida
con la configuración actual de la API (src/config/tables.ts).

Problema: el campo se llama 'descripcion' en BigQuery pero 'descripcion_larga' en el config.
          Además, la tabla "vieja" no tiene varias columnas nuevas.

Pasos:
  1. Agrega columnas faltantes (ADD COLUMN IF NOT EXISTS)
  2. Copia datos de 'descripcion' → 'descripcion_larga' en registros existentes

Uso:
  python migrate/migrate_productos.py
"""

import os, sys
sys.stdout.reconfigure(encoding="utf-8")
os.environ.setdefault(
    "GOOGLE_APPLICATION_CREDENTIALS",
    r"C:\Users\bastian\Desktop\Script_Python\jobs-425301-ba25295bbbd0.json",
)
from google.cloud import bigquery

PROJECT = "jobs-425301"
DATASET = "CRM"
REF = f"`{PROJECT}.{DATASET}.productos`"
client = bigquery.Client(project=PROJECT)


def run(sql: str, label: str = ""):
    desc = label or sql.strip()[:70]
    print(f"  → {desc}...")
    try:
        client.query(sql).result()
        print("    ✓ OK")
    except Exception as e:
        print(f"    ⚠  {e}")


def main():
    print("=== Migración schema: CRM.productos ===\n")

    # 1. Agregar columnas faltantes
    new_columns = [
        ("descripcion_larga",             "STRING"),
        ("subcategoria",                  "STRING"),
        ("precio_diagnostico",            "INT64"),
        ("precio_reparacion",             "INT64"),
        ("precio_mantencion",             "INT64"),
        ("precio_instalacion",            "INT64"),
        ("precio_capacitacion",           "INT64"),
        ("diagnostico_gratis_si_acepta",  "BOOL"),
        ("dias_diagnostico",              "INT64"),
        ("dias_reparacion",               "INT64"),
        ("dias_mantencion",               "INT64"),
        ("dias_instalacion",              "INT64"),
        ("notas_tecnicas",               "STRING"),
        ("creado_por",                    "STRING"),
        ("actualizado_en",                "TIMESTAMP"),
    ]

    print("1. Agregando columnas faltantes...")
    for col, dtype in new_columns:
        run(
            f"ALTER TABLE {REF} ADD COLUMN IF NOT EXISTS {col} {dtype}",
            f"ADD COLUMN {col} {dtype}",
        )

    # 2. Copiar descripcion → descripcion_larga para registros existentes
    print("\n2. Copiando datos de 'descripcion' → 'descripcion_larga'...")
    run(
        f"""
        UPDATE {REF}
        SET descripcion_larga = descripcion
        WHERE descripcion IS NOT NULL
          AND (descripcion_larga IS NULL OR descripcion_larga = '')
        """,
        "UPDATE descripcion → descripcion_larga",
    )

    print("""
=== Migración completada ===

La columna antigua 'descripcion' sigue existiendo en BigQuery (no se puede
eliminar en tablas particionadas estándar), pero la API ya no la usa.
Todos los nuevos registros usarán 'descripcion_larga'.
""")


if __name__ == "__main__":
    main()
