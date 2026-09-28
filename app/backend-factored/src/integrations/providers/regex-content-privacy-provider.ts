import type { SessionContext } from "../../domain/session.js";
import type {
	ContentPrivacyProvider,
	DeidentifiedContent,
	PrivacySurface,
	ReplacementEntry,
} from "../../services/ports/privacy.js";

type Pattern = Readonly<{
	classification: ReplacementEntry["classification"];
	regex: RegExp;
	safeValue: string;
}>;

const patterns: readonly Pattern[] = [
	{
		classification: "personal",
		regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
		safeValue: "[EMAIL_REDACTED]",
	},
	{
		classification: "personal",
		regex: /\b\+?\d[\d ()-]{7,}\d\b/g,
		safeValue: "[PHONE_REDACTED]",
	},
	{
		classification: "financial",
		regex: /\b\d{10,}\b/g,
		safeValue: "[ACCOUNT_REDACTED]",
	},
];

/** Deterministic MVP adapter; Google SDP/Model Armor can replace this port. */
export class RegexContentPrivacyProvider implements ContentPrivacyProvider {
	private sequence = 0;

	async deidentify(input: {
		session: SessionContext;
		surface: PrivacySurface;
		content: string;
		traceId: string;
	}): Promise<DeidentifiedContent> {
		const replacements = new Map<string, ReplacementEntry>();
		let content = input.content;

		for (const pattern of patterns) {
			content = content.replace(pattern.regex, () => {
				const entry: ReplacementEntry = {
					token: `[[PII_${input.surface.toUpperCase()}_${++this.sequence}]]`,
					safeValue: pattern.safeValue,
					classification: pattern.classification,
				};
				replacements.set(entry.token, entry);
				return entry.token;
			});
		}

		return {
			content,
			replacements: [...replacements.values()],
		};
	}
}
