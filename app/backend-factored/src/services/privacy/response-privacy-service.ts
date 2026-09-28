import type { SessionContext } from "../../domain/session.js";
import type {
	ContentPrivacyProvider,
	DeidentifiedContent,
} from "../ports/privacy.js";
import { GenerationPrivacyService } from "./generation-privacy-service.js";
import { PromptPrivacyService } from "./prompt-privacy-service.js";

/** Compatibility facade for callers migrating to focused privacy services. */
export class ResponsePrivacyService {
	private readonly prompts: PromptPrivacyService;
	private readonly generation: GenerationPrivacyService;

	constructor(provider: ContentPrivacyProvider) {
		this.prompts = new PromptPrivacyService(provider);
		this.generation = new GenerationPrivacyService(provider);
	}

	async deidentify(input: {
		session: SessionContext;
		surface: "user_prompt" | "rag_query" | "generation_context";
		content: string;
		traceId: string;
	}): Promise<DeidentifiedContent> {
		if (input.surface === "user_prompt") {
			return this.prompts.sanitizePrompt(input);
		}
		if (input.surface === "rag_query") {
			return this.prompts.sanitizeQuery(input);
		}
		return this.generation.prepare({
			session: input.session,
			purpose: "compatibility",
			value: input.content,
			traceId: input.traceId,
		});
	}

	async prepareGeneration(input: {
		session: SessionContext;
		purpose: string;
		value: unknown;
		traceId: string;
	}): Promise<DeidentifiedContent> {
		return this.generation.prepare(input);
	}

	async replaceValidated(
		input: Parameters<GenerationPrivacyService["replaceValidated"]>[0],
	) {
		return this.generation.replaceValidated(input);
	}
}
