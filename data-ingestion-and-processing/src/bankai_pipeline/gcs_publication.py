"""GCS publication for the immutable KG package and lease-gated current.json."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from bankai_pipeline.graph import GRAPH_FILENAME, MANIFEST_FILENAME, GraphInputError
from bankai_pipeline.kg_publication import (
    CATALOG_FILENAME,
    CURRENT_FILENAME,
    package_object_names,
    prepare_publication,
)
from bankai_pipeline.pipeline_lease import LeaseHandle, PipelineLease


class GcsBlob(Protocol):
    def exists(self) -> bool: ...

    def download_as_bytes(self) -> bytes: ...

    def upload_from_string(self, data: bytes, *, content_type: str, if_generation_match: int | None = None) -> None: ...


class GcsBucket(Protocol):
    def blob(self, name: str) -> GcsBlob: ...


class GcsClient(Protocol):
    def bucket(self, name: str) -> GcsBucket: ...


def gcs_publication_dry_run(
    source_dir: Path,
    *,
    bucket_name: str,
    tenant_id: str,
    prefix: str = "",
) -> dict[str, object]:
    """Validate the package and report intended GCS object names without writing."""

    prepared = prepare_publication(source_dir, tenant_id)
    names = package_object_names(tenant_id, prepared.run_id, prefix=prefix)
    return {
        "tenant_id": tenant_id,
        "run_id": prepared.run_id,
        "bucket": bucket_name,
        "prefix": prefix,
        "objects": names,
        "catalog_version": prepared.catalog["version"],
        "publication": "gcs_not_requested",
        "lease_required": True,
    }


def publish_gcs_graph(
    source_dir: Path,
    *,
    bucket_name: str,
    tenant_id: str,
    lease: PipelineLease,
    lease_handle: LeaseHandle,
    prefix: str = "",
    client: GcsClient | None = None,
) -> dict[str, object]:
    """Upload the immutable package, then write current.json only as lease owner."""

    lease.assert_owner(lease_handle)
    prepared = prepare_publication(source_dir, tenant_id)
    if client is None:
        from google.cloud import storage

        client = storage.Client()
    bucket = client.bucket(bucket_name)
    names = package_object_names(tenant_id, prepared.run_id, prefix=prefix)
    _upload_immutable(bucket, names[GRAPH_FILENAME], prepared.graph_bytes, "application/msgpack")
    _upload_immutable(bucket, names[MANIFEST_FILENAME], prepared.manifest_bytes, "application/json")
    _upload_immutable(bucket, names[CATALOG_FILENAME], prepared.catalog_bytes, "application/json")
    lease.assert_owner(lease_handle)
    _upload_pointer(bucket, names[CURRENT_FILENAME], prepared.pointer_bytes)
    return {
        **dict(prepared.pointer),
        "bucket": bucket_name,
        "prefix": prefix,
        "objects": names,
        "publication": "gcs",
        "lease_owner_run_id": lease_handle.owner_run_id,
    }


def _upload_immutable(bucket: GcsBucket, name: str, content: bytes, content_type: str) -> None:
    blob = bucket.blob(name)
    if blob.exists():
        existing = blob.download_as_bytes()
        if existing != content:
            raise GraphInputError(f"GCS object already exists with different content: {name}")
        return
    try:
        blob.upload_from_string(content, content_type=content_type, if_generation_match=0)
    except Exception as error:  # noqa: BLE001 - surface precondition races as GraphInputError
        if blob.exists() and blob.download_as_bytes() == content:
            return
        raise GraphInputError(f"cannot upload immutable GCS object: {name}") from error


def _upload_pointer(bucket: GcsBucket, name: str, content: bytes) -> None:
    blob = bucket.blob(name)
    blob.upload_from_string(content, content_type="application/json")
