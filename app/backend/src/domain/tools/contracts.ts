import { z } from "zod";
import type { RiskLevel } from "../control/contracts.js";
import type { SessionContext } from "../session.js";

export type ToolSideEffect = "none" | "reversible" | "irreversible";
export type ToolIdempotency = "none" | "required";
export type ToolApproval = "never" | "policy" | "always";

export type ToolDefinition<Input = unknown, Output = unknown> = Readonly<{
	id: string;
	version: string;
	capability: string;
	sideEffect: ToolSideEffect;
	risk: RiskLevel;
	idempotency: ToolIdempotency;
	timeoutMs: number;
	approval: ToolApproval;
	inputSchema: z.ZodType<Input>;
	outputSchema: z.ZodType<Output>;
}>;

export const proposedToolCallSchema = z
	.object({
		toolId: z.string().min(1),
		version: z.string().min(1),
		arguments: z.unknown(),
		idempotencyKey: z.string().min(1).nullable(),
	})
	.strict();
export type ProposedToolCall = z.infer<typeof proposedToolCallSchema>;

export type ToolExecutionContext = Readonly<{
	session: SessionContext;
	traceId: string;
	workflowId: string | null;
	decisionId: string;
}>;

export type ToolExecutionResult =
	| Readonly<{ status: "succeeded"; output: unknown; replay: boolean }>
	| Readonly<{ status: "rejected"; reasonCode: string }>
	| Readonly<{ status: "failed"; reasonCode: string }>
	| Readonly<{ status: "indeterminate"; reasonCode: string }>;
