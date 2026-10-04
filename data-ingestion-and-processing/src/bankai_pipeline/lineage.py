"""Sanitized lineage manifests shared by local pipeline stages."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Mapping, Sequence


RUN_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")


@dataclass(frozen=True)
class SourceSnapshot:
    source_system: str
    object_hash: str
    generation: str
    schema_version: str
    row_count: int
    watermark: str


def build_lineage_manifest(
    *,
    run_id: str,
    stage: str,
    inputs: Sequence[SourceSnapshot],
    transformations: Sequence[str],
    output_version: str,
) -> dict[str, object]:
    """Build metadata that can be persisted without raw URIs, rows or PII."""

    if not RUN_ID.fullmatch(run_id):
        raise ValueError("run_id must be opaque and match the allowed format")
    if not inputs:
        raise ValueError("at least one source snapshot is required")
    if not stage or not output_version or any(not item for item in transformations):
        raise ValueError("stage, output version and transformations are required")
    serialized_inputs = [asdict(item) for item in inputs]
    payload = {
        "run_id": run_id,
        "stage": stage,
        "inputs": serialized_inputs,
        "transformations": list(transformations),
        "output_version": output_version,
    }
    return {
        **payload,
        "manifest_version": "bankai-lineage-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "content_hash": hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest(),
        "contains_source_values": False,
    }
