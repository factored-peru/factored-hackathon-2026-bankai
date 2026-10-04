import type { SessionContext } from "../../domain/session.js";

export const baselineRetrievalToolName = "retrieve_context";

export type BaselineToolDefinition = Readonly<{
	name: typeof baselineRetrievalToolName;
	description: string;
	parametersJsonSchema: Record<string, unknown>;
}>;

export type BaselineToolCall = Readonly<{
	name: string;
	args: unknown;
	callId: string | null;
}>;

export type BaselineToolResult = Readonly<{
	status: "ready" | "failed";
	queryId: string | null;
	queryVersion: string | null;
	rows: readonly Readonly<Record<string, string | number | boolean | null>>[];
	rowCount: number;
	bytesProcessed: number | null;
	durationMs: number | null;
	reasonCode: string | null;
}>;

export type BaselineModelTurn =
	| Readonly<{ kind: "final"; text: string | undefined }>
	| Readonly<{ kind: "tool_call"; call: BaselineToolCall }>;

/** Provider seam for a single native function-calling conversation. */
export interface BaselineChatModel {
	begin(input: {
		system: string;
		user: string;
		tool: BaselineToolDefinition;
	}): Promise<BaselineModelTurn>;
	continue(input: {
		system: string;
		user: string;
		tool: BaselineToolDefinition;
		call: BaselineToolCall;
		result: BaselineToolResult;
	}): Promise<BaselineModelTurn>;
}

/** Tool boundary: it owns QueryPlan loading and BigQuery execution. */
export interface BaselineContextTool {
	describe(): Promise<BaselineToolDefinition>;
	retrieve(input: {
		call: BaselineToolCall;
		session: SessionContext;
		traceId: string;
	}): Promise<BaselineToolResult>;
}

/** Sanitized facts suitable for a later evaluator or OTel adapter. */
export type BaselineRunMeasurement = Readonly<{
	traceId: string;
	pipeline: "baseline";
	outcome: "completed" | "failed";
	durationMs: number;
	modelCallCount: number;
	retrievalAttemptCount: number;
	retrievalSuccessCount: number;
	controlPlaneInvoked: false;
	privacyGateInvoked: false;
	guardrailInvoked: false;
	retrievalInvoked: boolean;
	errorCode:
		| "baseline_model_no_response"
		| "baseline_model_failure"
		| "baseline_tool_unavailable"
		| "baseline_tool_attempts_exhausted"
		| null;
}>;

export interface BaselineRunObserver {
	record(measurement: BaselineRunMeasurement): Promise<void>;
}
