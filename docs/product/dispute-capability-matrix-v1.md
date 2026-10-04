# Matriz de capacidades — Dispute Transaction Support v1

Mirror humano de
`app/backend/src/domain/disputes/capability-matrix.ts`. Autoridad de
ejecución: el módulo Zod y `DisputePolicyEngine`. Roles canónicos: `client` /
`operator` (ADR 0006). Alias de demo: `customer` → `client`, `backoffice` →
`operator`.

**Version:** `v1` · **policyId:** `dispute-transaction-support`

| actionId | outcome | roles | capability | allowedData | requiredEvidence | mock |
| --- | --- | --- | --- | --- | --- | --- |
| `transaction.read` | ALLOW | client, operator | `dispute.transaction.read` | transactionId, status, amountBucket, currency, provenance, version | transactionEvidence | effect `none`, local_mock |
| `dispute.read` | ALLOW | client, operator | `dispute.read` | disputeId, transactionId, status, priority, provenance, version | disputeEvidence | effect `none`, local_mock |
| `escalation.request` | REQUIRE_APPROVAL | client | `dispute.escalation.request` | caseId, reasonCode, approvalId | disputeCase, transactionEvidence | effect `none`, local_mock HITL |
| `dispute.submit` | DENY | — | — | — | — | no bank mock |
| `dispute.cancel` | DENY | — | — | — | — | no bank mock |

Toda acción simulada declara `effect: none`. Presentar, cancelar o modificar
una disputa bancaria real no tiene herramienta ni capability.

Ver también el
[product brief](dispute-transaction-support-brief.md).
