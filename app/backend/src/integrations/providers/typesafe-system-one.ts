import { z } from "zod";

/**
 * Shared TypeSafe System One HTTP client (POST /v1/systemone).
 * Used by Structured RAG entry choice and by JEV-as-judge evaluation.
 * Never echoes the API key or raw provider body on failure.
 */

export type TypeSafeSystemOneClientOptions = Readonly<{
	baseUrl: string;
	apiKey: string;
	model: string;
	timeoutMs: number;
	fetch?: typeof fetch;
}>;

export type SystemOneNoulQuestion = Readonly<{
	type: "noul";
	instructions?: string;
	criteria?: Readonly<{ true?: string; false?: string }> | null;
}>;

export type SystemOneChoiceQuestion = Readonly<{
	type: "choice";
	instructions?: string;
	criteria: Readonly<Record<string, string | null>>;
}>;

export type SystemOneScoreQuestion = Readonly<{
	type: "score";
	instructions?: string;
	criteria: readonly [string, string, ...string[]];
}>;

export type SystemOneQuestion =
	| SystemOneNoulQuestion
	| SystemOneChoiceQuestion
	| SystemOneScoreQuestion;

export type SystemOneRequest = Readonly<{
	state: unknown;
	questions: Readonly<Record<string, SystemOneQuestion>>;
}>;

const systemOneEnvelopeSchema = z
	.object({
		answers: z.record(z.string(), z.unknown()),
		model: z.string().optional(),
	})
	.passthrough();

export type SystemOneEnvelope = z.infer<typeof systemOneEnvelopeSchema>;

export async function callTypeSafeSystemOne(
	options: TypeSafeSystemOneClientOptions,
	request: SystemOneRequest,
): Promise<SystemOneEnvelope> {
	let response: Response;
	try {
		response = await (options.fetch ?? fetch)(
			`${options.baseUrl.replace(/\/+$/, "")}/v1/systemone`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${options.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: options.model,
					state: request.state,
					questions: request.questions,
				}),
				signal: AbortSignal.timeout(options.timeoutMs),
			},
		);
	} catch {
		throw new Error("jev_unavailable");
	}
	if (!response.ok) {
		throw new Error(`jev_unavailable_${response.status}`);
	}

	let body: unknown;
	try {
		body = await response.json();
	} catch {
		throw new Error("jev_invalid_response");
	}

	const parsed = systemOneEnvelopeSchema.safeParse(body);
	if (!parsed.success) {
		throw new Error("jev_invalid_response");
	}
	return parsed.data;
}

const noulAnswerSchema = z
	.object({
		type: z.literal("noul").optional(),
		noul: z.number().min(0).max(1),
	})
	.passthrough();

const choiceAnswerSchema = z
	.object({
		type: z.literal("choice").optional(),
		choice: z.string(),
		confidence: z.number().min(0).max(1).optional(),
		probabilities: z.record(z.string(), z.number()).optional(),
	})
	.passthrough();

const scoreAnswerSchema = z
	.object({
		type: z.literal("score").optional(),
		score: z.number(),
		confidence: z.number().min(0).max(1).optional(),
		probabilities: z.record(z.string(), z.number()).optional(),
	})
	.passthrough();

export function parseNoulAnswer(value: unknown): number {
	const parsed = noulAnswerSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error("jev_invalid_response");
	}
	return parsed.data.noul;
}

export function parseChoiceAnswer(value: unknown): {
	choice: string;
	confidence: number | undefined;
	probabilities: Record<string, number> | undefined;
} {
	const parsed = choiceAnswerSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error("jev_invalid_response");
	}
	return {
		choice: parsed.data.choice,
		confidence: parsed.data.confidence,
		probabilities: parsed.data.probabilities,
	};
}

export function parseScoreAnswer(value: unknown): {
	score: number;
	confidence: number | undefined;
} {
	const parsed = scoreAnswerSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error("jev_invalid_response");
	}
	return {
		score: parsed.data.score,
		confidence: parsed.data.confidence,
	};
}
