import type { SafeAuditEvent } from "../../domain/observability/audit-event.js";

export interface AuditSink {
	record(event: SafeAuditEvent): Promise<void>;
}
