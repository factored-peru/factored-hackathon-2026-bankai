import { GoogleAuth } from "google-auth-library";
import type { GuardrailResult } from "../../domain/control/contracts.js";
import type {
	GuardrailInspection,
	GuardrailProvider,
} from "../../services/ports/control.js";

export type ModelArmorConfig = Readonly<{
	projectId: string;
	location: string;
	/** Template id or full `projects/.../templates/...` resource name. */
	template: string;
	timeoutMs: number;
}>;

type FetchLike = (
	input: string,
	init: {
		method: string;
		headers: Record<string, string>;
		body: string;
		signal: AbortSignal;
	},
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

type AccessTokenProvider = () => Promise<string>;

const PROVIDER = "model-armor";

/** Model Armor splits sanitization by direction: prompts in, responses out. */
const promptSurfaces = new Set<GuardrailInspection["surface"]>([
	"user_input",
	"retrieved_content",
]);

export function templateName(config: ModelArmorConfig): string {
	return config.template.startsWith("projects/")
		? config.template
		: `projects/${config.projectId}/locations/${config.location}/templates/${config.template}`;
}

function defaultAccessToken(): AccessTokenProvider {
	const auth = new GoogleAuth({
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});
	return async () => {
		const token = await auth.getAccessToken();
		if (!token) {
			throw new Error("model-armor: no ADC access token");
		}
		return token;
	};
}

/**
 * Google Model Armor behind `GuardrailProvider`. Every failure mode (auth,
 * network, timeout, non-2xx, malformed or partial invocation) is FAILURE/block;
 * detected values are never returned or logged, only the verdict.
 */
export class ModelArmorGuardrailProvider implements GuardrailProvider {
	private accessToken: AccessTokenProvider | undefined;

	constructor(
		private readonly config: ModelArmorConfig,
		private readonly deps: {
			fetch?: FetchLike;
			accessToken?: AccessTokenProvider;
		} = {},
	) {
		this.accessToken = deps.accessToken;
	}

	async inspect(input: GuardrailInspection): Promise<GuardrailResult> {
		const base = {
			provider: PROVIDER,
			templateVersion: templateName(this.config).split("/").at(-1) ?? "unknown",
			traceId: input.traceId,
		};
		const failure: GuardrailResult = {
			...base,
			status: "FAILURE",
			action: "block",
		};

		try {
			const prompt = promptSurfaces.has(input.surface);
			const url =
				`https://modelarmor.${this.config.location}.rep.googleapis.com/v1/` +
				`${templateName(this.config)}:${prompt ? "sanitizeUserPrompt" : "sanitizeModelResponse"}`;
			this.accessToken ??= defaultAccessToken();
			const token = await this.accessToken();
			const response = await (this.deps.fetch ?? fetch)(url, {
				method: "POST",
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify(
					prompt
						? { userPromptData: { text: input.content } }
						: { modelResponseData: { text: input.content } },
				),
				signal: AbortSignal.timeout(this.config.timeoutMs),
			});
			if (!response.ok) {
				return failure;
			}
			const result = (
				(await response.json()) as {
					sanitizationResult?: {
						filterMatchState?: string;
						invocationResult?: string;
					};
				}
			).sanitizationResult;
			// PARTIAL means some filter did not run: not an implicit allow.
			if (result?.invocationResult !== "SUCCESS") {
				return failure;
			}
			if (result.filterMatchState === "NO_MATCH_FOUND") {
				return { ...base, status: "NO_MATCH_FOUND", action: "allow" };
			}
			if (result.filterMatchState === "MATCH_FOUND") {
				return { ...base, status: "MATCH_FOUND", action: "block" };
			}
			return failure;
		} catch {
			return failure;
		}
	}
}
