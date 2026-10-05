"""Transactional Firestore lease for offline pipeline publish ownership.

Only the lease owner may update ``current.json`` for a tenant (ADR 0020 / 0017).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Protocol


LEASE_COLLECTION = "pipeline_leases"
DEFAULT_LEASE_TTL_SECONDS = 3600


class PipelineLeaseError(RuntimeError):
    """Raised when a lease cannot be acquired, refreshed, or asserted."""


@dataclass(frozen=True)
class LeaseHandle:
    tenant_id: str
    owner_run_id: str
    expires_at: datetime
    version: int


class PipelineLease(Protocol):
    def acquire(self, tenant_id: str, owner_run_id: str, *, ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS) -> LeaseHandle: ...

    def heartbeat(self, handle: LeaseHandle, *, ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS) -> LeaseHandle: ...

    def release(self, handle: LeaseHandle) -> None: ...

    def assert_owner(self, handle: LeaseHandle) -> None: ...


class InMemoryPipelineLease:
    """Deterministic lease for unit tests (no Firestore)."""

    def __init__(self) -> None:
        self._leases: dict[str, LeaseHandle] = {}

    def acquire(self, tenant_id: str, owner_run_id: str, *, ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS) -> LeaseHandle:
        now = datetime.now(timezone.utc)
        existing = self._leases.get(tenant_id)
        if existing is not None and existing.expires_at > now and existing.owner_run_id != owner_run_id:
            raise PipelineLeaseError(f"lease held by {existing.owner_run_id}")
        version = 1 if existing is None else existing.version + 1
        handle = LeaseHandle(
            tenant_id=tenant_id,
            owner_run_id=owner_run_id,
            expires_at=now + timedelta(seconds=ttl_seconds),
            version=version,
        )
        self._leases[tenant_id] = handle
        return handle

    def heartbeat(self, handle: LeaseHandle, *, ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS) -> LeaseHandle:
        self.assert_owner(handle)
        refreshed = LeaseHandle(
            tenant_id=handle.tenant_id,
            owner_run_id=handle.owner_run_id,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
            version=handle.version + 1,
        )
        self._leases[handle.tenant_id] = refreshed
        return refreshed

    def release(self, handle: LeaseHandle) -> None:
        self.assert_owner(handle)
        self._leases.pop(handle.tenant_id, None)

    def assert_owner(self, handle: LeaseHandle) -> None:
        current = self._leases.get(handle.tenant_id)
        now = datetime.now(timezone.utc)
        if current is None or current.owner_run_id != handle.owner_run_id:
            raise PipelineLeaseError("caller is not the lease owner")
        if current.expires_at <= now:
            raise PipelineLeaseError("lease expired")
        if current.version != handle.version:
            raise PipelineLeaseError("lease version mismatch")


class FirestorePipelineLease:
    """Firestore-backed transactional lease on ``pipeline_leases/{tenant_id}``."""

    def __init__(self, client: object) -> None:
        self._client = client

    def acquire(self, tenant_id: str, owner_run_id: str, *, ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS) -> LeaseHandle:
        from google.cloud import firestore

        doc_ref = self._client.collection(LEASE_COLLECTION).document(tenant_id)
        transaction = self._client.transaction()

        @firestore.transactional
        def _acquire(transaction: object) -> LeaseHandle:
            snapshot = doc_ref.get(transaction=transaction)
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(seconds=ttl_seconds)
            version = 1
            if snapshot.exists:
                data = snapshot.to_dict() or {}
                existing_owner = data.get("owner_run_id")
                existing_expires = data.get("expires_at")
                if isinstance(existing_expires, datetime) and existing_expires.tzinfo is None:
                    existing_expires = existing_expires.replace(tzinfo=timezone.utc)
                if (
                    isinstance(existing_owner, str)
                    and isinstance(existing_expires, datetime)
                    and existing_expires > now
                    and existing_owner != owner_run_id
                ):
                    raise PipelineLeaseError(f"lease held by {existing_owner}")
                version = int(data.get("version") or 0) + 1
            handle = LeaseHandle(
                tenant_id=tenant_id,
                owner_run_id=owner_run_id,
                expires_at=expires_at,
                version=version,
            )
            transaction.set(
                doc_ref,
                {
                    "owner_run_id": owner_run_id,
                    "expires_at": expires_at,
                    "version": version,
                    "updated_at": now,
                },
            )
            return handle

        return _acquire(transaction)

    def heartbeat(self, handle: LeaseHandle, *, ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS) -> LeaseHandle:
        from google.cloud import firestore

        doc_ref = self._client.collection(LEASE_COLLECTION).document(handle.tenant_id)
        transaction = self._client.transaction()

        @firestore.transactional
        def _heartbeat(transaction: object) -> LeaseHandle:
            snapshot = doc_ref.get(transaction=transaction)
            self._assert_snapshot_owner(snapshot, handle)
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(seconds=ttl_seconds)
            version = handle.version + 1
            refreshed = LeaseHandle(
                tenant_id=handle.tenant_id,
                owner_run_id=handle.owner_run_id,
                expires_at=expires_at,
                version=version,
            )
            transaction.set(
                doc_ref,
                {
                    "owner_run_id": handle.owner_run_id,
                    "expires_at": expires_at,
                    "version": version,
                    "updated_at": now,
                },
            )
            return refreshed

        return _heartbeat(transaction)

    def release(self, handle: LeaseHandle) -> None:
        from google.cloud import firestore

        doc_ref = self._client.collection(LEASE_COLLECTION).document(handle.tenant_id)
        transaction = self._client.transaction()

        @firestore.transactional
        def _release(transaction: object) -> None:
            snapshot = doc_ref.get(transaction=transaction)
            self._assert_snapshot_owner(snapshot, handle)
            transaction.delete(doc_ref)

        _release(transaction)

    def assert_owner(self, handle: LeaseHandle) -> None:
        snapshot = self._client.collection(LEASE_COLLECTION).document(handle.tenant_id).get()
        self._assert_snapshot_owner(snapshot, handle)

    def _assert_snapshot_owner(self, snapshot: object, handle: LeaseHandle) -> None:
        if not getattr(snapshot, "exists", False):
            raise PipelineLeaseError("lease missing")
        data = snapshot.to_dict() or {}
        now = datetime.now(timezone.utc)
        expires_at = data.get("expires_at")
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if data.get("owner_run_id") != handle.owner_run_id:
            raise PipelineLeaseError("caller is not the lease owner")
        if not isinstance(expires_at, datetime) or expires_at <= now:
            raise PipelineLeaseError("lease expired")
        if int(data.get("version") or 0) != handle.version:
            raise PipelineLeaseError("lease version mismatch")
