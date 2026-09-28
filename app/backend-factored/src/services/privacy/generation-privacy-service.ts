import type { SessionContext } from "../../domain/session.js";
import type {
	ContentPrivacyProvider,
	DeidentifiedContent,
} from "../ports/privacy.js";

const tokenPattern = /\[\[PII_[A-Z_]+_[0-9]+\]\]/g;

export type PrivacyOperationResult =
	| Readonly<{ status: "allowed"; value: string }>
	| Readonly<{ status: "blocked"; reasonCode: string }>;

export class GenerationPrivacyService {
	constructor(private readonly provider: ContentPrivacyProvider) {}

	async prepare(input: {
		session: SessionContext;
		purpose: string;
		value: unknown;
		traceId: string;
	}): Promise<DeidentifiedContent> {
		const content =
			typeof input.value === "string"
				? input.value
				: JSON.stringify(input.value);
		if (content === undefined) {
			throw new Error(
				`Unable to serialize generation context: ${input.purpose}`,
			);
		}
		return this.provider.deidentify({
			session: input.session,
			surface: "generation_context",
			content,
			traceId: input.traceId,
		});
	}

	async replaceValidated(input: {
		session: SessionContext;
		draft: string;
		deidentified: DeidentifiedContent;
		traceId: string;
	}): Promise<PrivacyOperationResult> {
		const replacements = new Map(
			input.deidentified.replacements.map((entry) => [entry.token, entry]),
		);
		const tokens = [...input.draft.matchAll(tokenPattern)].map(
			(match) => match[0],
		);
		for (const token of tokens) {
			if (!replacements.has(token)) {
				return { status: "blocked", reasonCode: "unknown_replacement_token" };
			}
		}

		const unregistered = await this.provider.deidentify({
			session: input.session,
			surface: "generation_context",
			content: input.draft,
			traceId: input.traceId,
		});
		if (unregistered.replacements.length > 0) {
			return {
				status: "blocked",
				reasonCode: "unregistered_sensitive_value_in_generation",
			};
		}

		const value = input.draft.replace(tokenPattern, (token) => {
			return replacements.get(token)?.safeValue ?? token;
		});
		return { status: "allowed", value };
	}
}
