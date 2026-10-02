import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { RagCatalog, RagKind } from "./rag-catalog.js";

export type RagExecutionResult =
	| Readonly<{ status: "ready"; evidence: readonly ModelEvidence[] }>
	| Readonly<{ status: "failed"; reasonCode: string }>;

export abstract class BaseRag {
	abstract readonly kind: RagKind;

	abstract execute(input: {
		query: string;
		session: SessionContext;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<RagExecutionResult>;
}
