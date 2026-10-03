import type {
	DisputeCase,
	DisputeEvent,
	DisputeEvidence,
	TransactionEvidence,
} from "../../domain/disputes/contracts.js";
import type {
	DisputeEventSink,
	DisputeSupportStore,
} from "../../services/disputes/dispute-support-service.js";

type ApprovalRecord = {
	approvalId: string;
	caseId: string;
	tenantId: string;
	status: "pending" | "approved" | "rejected";
};

export class InMemoryDisputeSupportStore implements DisputeSupportStore {
	private readonly transactions = new Map<string, TransactionEvidence>();
	private readonly disputes = new Map<string, DisputeEvidence>();
	private readonly cases = new Map<string, DisputeCase>();
	private readonly approvals = new Map<string, ApprovalRecord>();

	constructor(
		input: {
			transactions?: TransactionEvidence[];
			disputes?: DisputeEvidence[];
			cases?: DisputeCase[];
		} = {},
	) {
		for (const value of input.transactions ?? [])
			this.transactions.set(value.transactionId, structuredClone(value));
		for (const value of input.disputes ?? [])
			this.disputes.set(value.disputeId, structuredClone(value));
		for (const value of input.cases ?? [])
			this.cases.set(value.caseId, structuredClone(value));
	}

	async getTransaction(id: string) {
		return this.copy(this.transactions.get(id));
	}
	async getDispute(id: string) {
		return this.copy(this.disputes.get(id));
	}
	async getCase(id: string) {
		return this.copy(this.cases.get(id));
	}
	async saveCase(value: DisputeCase) {
		this.cases.set(value.caseId, structuredClone(value));
	}
	async getApproval(id: string) {
		return this.copy(this.approvals.get(id));
	}
	async saveApproval(value: ApprovalRecord) {
		this.approvals.set(value.approvalId, structuredClone(value));
	}

	private copy<T>(value: T | undefined): T | null {
		return value === undefined ? null : structuredClone(value);
	}
}

export class InMemoryDisputeEventSink implements DisputeEventSink {
	readonly events: DisputeEvent[] = [];
	async publish(event: DisputeEvent): Promise<void> {
		this.events.push(structuredClone(event));
	}
}
