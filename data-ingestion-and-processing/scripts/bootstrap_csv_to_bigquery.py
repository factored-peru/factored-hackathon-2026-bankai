"""Carga inicial manual de CSV -> GCS -> BigQuery raw.

Origen `--source local` (carpeta descargada con `aws s3 sync`) o `--source s3`
(lee directo de S3 con las credenciales del .env, sin guardar nada en disco).

Es un bootstrap de una sola vez. No sustituye al CLI `bankai-pipeline` ni a la
transferencia automática S3 -> GCS del ADR 0020. Por defecto es un dry-run que no
toca S3, GCS ni BigQuery. Usa `--execute` para ejecutar.

Idempotencia: GCS nunca se sobrescribe (un objeto existente se omite y, en modo
s3, ni siquiera se vuelve a descargar de S3); BigQuery usa WRITE_TRUNCATE, así
que repetir la carga reemplaza la tabla y no duplica filas.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

RUN_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{2,62}$")
TABLE_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,299}$")


def load_dotenv(path: Path) -> None:
    """Carga KEY=VALUE de un .env sin pisar variables ya definidas en el entorno."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.removeprefix("export ").strip()
        value = value.strip().strip("\"'")
        os.environ.setdefault(key, value)


def env(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name) or default


@dataclass(frozen=True)
class Item:
    """Un CSV de origen. `rel` es su ruta relativa (conserva year=/month=/day=)."""

    rel: str
    size: int
    local: Path | None = None
    s3_key: str | None = None

    @property
    def table(self) -> str:
        parts = self.rel.split("/")
        return Path(parts[0]).stem if len(parts) == 1 else parts[0]

    @property
    def partitioned(self) -> bool:
        return "/" in self.rel


def list_local(data_dir: Path) -> list[Item]:
    return [
        Item(p.relative_to(data_dir).as_posix(), p.stat().st_size, local=p)
        for p in sorted(data_dir.rglob("*.csv"))
        if p.is_file()
    ]


def s3_client():
    import boto3

    return boto3.client("s3")


def list_s3(args: argparse.Namespace) -> list[Item]:
    prefix = args.s3_prefix.strip("/")
    prefix = f"{prefix}/" if prefix else ""
    items: list[Item] = []
    paginator = s3_client().get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=args.s3_bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.lower().endswith(".csv") and obj["Size"] > 0:
                items.append(Item(key[len(prefix):], obj["Size"], s3_key=key))
    return sorted(items, key=lambda i: i.rel)


def group(items: list[Item], only: set[str] | None) -> dict[str, list[Item]]:
    tables: dict[str, list[Item]] = defaultdict(list)
    for item in items:
        if not TABLE_PATTERN.match(item.table):
            raise SystemExit(f"Nombre de tabla inválido: {item.table!r}")
        if only is None or item.table in only:
            tables[item.table].append(item)
    if only is not None and (missing := only - tables.keys()):
        raise SystemExit(f"Tablas no encontradas en el origen: {sorted(missing)}")
    return dict(tables)


def gcs_name(args: argparse.Namespace, item: Item) -> str:
    return f"{args.gcs_prefix}/{item.rel}" if args.gcs_prefix else item.rel


def print_plan(tables: dict[str, list[Item]] | None, args: argparse.Namespace) -> None:
    mode = "execute" if args.execute else "dry-run"
    print(f"run_id={args.run_id} mode={mode} source={args.source}")
    if tables is None:
        print(f"  origen: s3://{args.s3_bucket}/{args.s3_prefix} (no se consulta en dry-run)")
    else:
        for table, items in tables.items():
            kind = "particionada" if items[0].partitioned else "archivo"
            mib = sum(i.size for i in items) / 1_048_576
            print(f"  {table}: {kind}, {len(items)} archivos, {mib:.1f} MiB")
    print(f"destino GCS: gs://{args.bucket}/{args.gcs_prefix}/")
    print(f"destino BigQuery: {args.project}.{args.dataset} ({args.location})")


def upload(tables: dict[str, list[Item]], args: argparse.Namespace) -> None:
    from google.api_core.exceptions import PreconditionFailed
    from google.cloud import storage

    client = storage.Client(project=args.project)
    bucket = client.bucket(args.bucket)
    s3 = s3_client() if args.source == "s3" else None
    prefix = f"{args.gcs_prefix}/" if args.gcs_prefix else ""
    # Un solo listado de lo que ya existe evita descargar de S3 lo que ya está en GCS.
    existing = {b.name: b.size for b in client.list_blobs(args.bucket, prefix=prefix)}

    def put(item: Item) -> str:
        name = gcs_name(args, item)
        if name in existing:
            return "mismatch" if existing[name] != item.size else "skipped"
        blob = bucket.blob(name)
        data = s3.get_object(Bucket=args.s3_bucket, Key=item.s3_key)["Body"].read() \
            if s3 else item.local.read_bytes()
        try:
            # if_generation_match=0: sólo crea; nunca sobrescribe.
            blob.upload_from_string(
                data, content_type="text/csv", if_generation_match=0, checksum="crc32c"
            )
            return "uploaded"
        except PreconditionFailed:
            return "skipped"

    for table, items in tables.items():
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            results = list(pool.map(put, items))
        print(
            f"[gcs] {table}: subidos={results.count('uploaded')} "
            f"existentes={results.count('skipped')}"
        )
        if results.count("mismatch"):
            print(
                f"[gcs] AVISO {table}: {results.count('mismatch')} objetos ya existen con "
                "tamaño distinto al origen; no se sobrescribieron."
            )


def load(tables: dict[str, list[Item]], args: argparse.Namespace) -> None:
    from google.cloud import bigquery

    client = bigquery.Client(project=args.project, location=args.location)
    dataset = bigquery.Dataset(f"{args.project}.{args.dataset}")
    dataset.location = args.location
    client.create_dataset(dataset, exists_ok=True)

    base = f"gs://{args.bucket}/{args.gcs_prefix}".rstrip("/")
    for table, items in tables.items():
        table_id = f"{args.project}.{args.dataset}.{table}"
        config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.CSV,
            skip_leading_rows=1,
            autodetect=True,
            # WRITE_TRUNCATE reemplaza la tabla completa: re-ejecutar no duplica filas.
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            max_bad_records=args.max_bad_records,
            labels={"run_id": args.run_id, "stage": "load"},
        )
        if items[0].partitioned:
            prefix = f"{base}/{table}/"
            uri = f"{prefix}*"
            hive = bigquery.HivePartitioningOptions()
            hive.mode = "AUTO"
            hive.source_uri_prefix = prefix
            config.hive_partitioning = hive
        else:
            uri = f"{base}/{table}.csv"

        job = client.load_table_from_uri(uri, table_id, job_config=config)
        job.result()
        rows = client.get_table(table_id).num_rows
        print(f"[bq] {table}: filas={rows} job={job.job_id}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    # El .env se carga antes de definir los defaults del parser.
    pre = argparse.ArgumentParser(add_help=False)
    pre.add_argument("--env-file", type=Path, default=Path(".env"))
    load_dotenv(pre.parse_known_args(argv)[0].env_file)

    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--run-id", required=True, help="ID opaco sin PII, ej. bootstrap-001")
    parser.add_argument("--source", choices=("local", "s3"), default=env("SOURCE", "local"))
    parser.add_argument("--data-dir", type=Path, default=Path(env("DATA_DIR", "data")))
    parser.add_argument("--s3-bucket", default=env("S3_BUCKET"))
    parser.add_argument("--s3-prefix", default=env("S3_PREFIX", "data/"))
    parser.add_argument("--project", default=env("GCP_PROJECT"))
    parser.add_argument("--bucket", default=env("GCS_BUCKET"))
    parser.add_argument("--gcs-prefix", default=env("GCS_PREFIX", "raw"), help="prefijo en el bucket")
    parser.add_argument("--dataset", default=env("BQ_DATASET", "raw"))
    parser.add_argument("--location", default=env("BQ_LOCATION"), help="misma región que el bucket")
    parser.add_argument("--tables", help="lista separada por comas; por defecto todas")
    parser.add_argument("--workers", type=int, default=16)
    parser.add_argument("--max-bad-records", type=int, default=0)
    parser.add_argument("--skip-upload", action="store_true", help="sólo cargar a BigQuery")
    parser.add_argument("--skip-load", action="store_true", help="sólo subir a GCS")
    parser.add_argument("--execute", action="store_true", help="sin esto es dry-run")
    args = parser.parse_args(argv)

    required = ["project", "bucket", "location"] + (["s3_bucket"] if args.source == "s3" else [])
    for name in required:
        if not getattr(args, name):
            parser.error(f"falta --{name.replace('_', '-')} (o su variable en el .env)")
    if not RUN_ID_PATTERN.match(args.run_id):
        parser.error("--run-id debe ser minúsculas, dígitos y guiones (3-63 caracteres)")
    args.gcs_prefix = args.gcs_prefix.strip("/")
    return args


def main(argv: list[str] | None = None) -> None:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    only = {t.strip() for t in args.tables.split(",") if t.strip()} if args.tables else None

    tables: dict[str, list[Item]] | None = None
    if args.source == "local":
        data_dir = args.data_dir.resolve()
        if not data_dir.is_dir():
            raise SystemExit(f"No existe el directorio de datos: {data_dir}")
        tables = group(list_local(data_dir), only)
        if not tables:
            raise SystemExit(f"No se encontraron CSV en {data_dir}")
    elif args.execute:
        tables = group(list_s3(args), only)
        if not tables:
            raise SystemExit("No se encontraron CSV en S3 con ese bucket/prefijo")

    print_plan(tables, args)
    if not args.execute:
        print("dry-run: no se tocó S3, GCS ni BigQuery. Agrega --execute para ejecutar.")
        return
    if not args.skip_upload:
        upload(tables, args)
    if not args.skip_load:
        load(tables, args)


if __name__ == "__main__":
    main()
