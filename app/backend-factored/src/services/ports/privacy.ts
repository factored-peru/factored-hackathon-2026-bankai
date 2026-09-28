import type { DataClassification } from "../../domain/control/contracts.js";
import type { SessionContext } from "../../domain/session.js";

export type PrivacySurface = "user_prompt" | "rag_query" | "generation_context";

export type ReplacementEntry = Readonly<{
	token: string;
	safeValue: string;
	classification: DataClassification;
}>;

export type DeidentifiedContent = Readonly<{
	content: string;
	replacements: readonly ReplacementEntry[];
}>;

export interface ContentPrivacyProvider {
	deidentify(input: {
		session: SessionContext;
		surface: PrivacySurface;
		content: string;
		traceId: string;
	}): Promise<DeidentifiedContent>;
}
