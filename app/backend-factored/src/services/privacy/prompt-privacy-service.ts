import type { SessionContext } from "../../domain/session.js";
import type {
	ContentPrivacyProvider,
	DeidentifiedContent,
} from "../ports/privacy.js";

export class PromptPrivacyService {
	constructor(private readonly provider: ContentPrivacyProvider) {}

	async sanitizePrompt(input: {
		session: SessionContext;
		content: string;
		traceId: string;
	}): Promise<DeidentifiedContent> {
		return this.provider.deidentify({
			session: input.session,
			surface: "user_prompt",
			content: input.content,
			traceId: input.traceId,
		});
	}

	async sanitizeQuery(input: {
		session: SessionContext;
		content: string;
		traceId: string;
	}): Promise<DeidentifiedContent> {
		return this.provider.deidentify({
			session: input.session,
			surface: "rag_query",
			content: input.content,
			traceId: input.traceId,
		});
	}
}
