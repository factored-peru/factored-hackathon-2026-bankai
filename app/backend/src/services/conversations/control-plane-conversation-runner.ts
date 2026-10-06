/**
 * Maps AgentControlService terminals onto the ConversationRunner contract.
 * pending_clarification becomes awaiting_clarification for chat traces.
 */
import { defaultAgentBudget } from "../../domain/control/contracts.js";
import type { AgentControlService } from "../control-plane/agent-control-service.js";
import type { ConversationRunner } from "../ports/conversation.js";
import {
	composeClarifiedMessage,
	InMemoryPendingClarificationStore,
	maxClarificationAnswerLength,
	type PendingClarificationStore,
} from "./pending-clarification.js";

/** Fixed text: it carries no user data and promises no outcome or timing. */
export const pendingApprovalNotice =
	"Tu solicitud quedó pendiente de revisión por un asesor.";

export function createControlPlaneConversationRunner(
	service: AgentControlService,
	pendingClarifications: PendingClarificationStore = new InMemoryPendingClarificationStore(),
): ConversationRunner {
	return async (input) => {
		// The next message of a thread that is waiting for an answer finishes the
		// pending query. A long message is a new question, so it starts over.
		const key = `${input.session.tenantId}:${input.session.userId}:${input.threadId}`;
		const pending = await pendingClarifications.take(key);
		const clarified =
			pending !== null && input.message.length <= maxClarificationAnswerLength
				? { pending, ...composeClarifiedMessage(pending, input.message) }
				: null;
		const result = await service.run({
			sessionId: input.session.sessionId,
			message: clarified?.message ?? input.message,
			traceId: input.traceId,
			threadId: input.threadId,
			allowedSources: [],
			budget: defaultAgentBudget,
		});

		if (result.status === "completed") {
			await input.onState?.("generating");
			await input.onDelta(result.response);
			return {
				status: "completed",
				response: result.response,
				decisionId: result.decisionId,
			};
		}
		if (result.status === "pending_clarification") {
			await pendingClarifications.put(key, {
				original: clarified?.pending.original ?? input.message,
				exchanges: clarified?.exchanges ?? [],
				question: result.question,
			});
			await input.onDelta(result.question);
			return {
				status: "awaiting_clarification",
				response: result.question,
				decisionId: result.decisionId,
				workflowId: result.workflowId,
				clarificationId: result.clarificationId,
			};
		}
		if (result.status === "pending_approval") {
			await input.onDelta(pendingApprovalNotice);
			return {
				status: "pending_approval",
				response: pendingApprovalNotice,
				decisionId: result.decisionId,
				workflowId: result.workflowId,
				approvalId: result.approvalId,
			};
		}
		if (result.status === "denied") {
			return {
				status: "denied",
				response: "",
				decisionId: result.decisionId,
				reasonCode: result.reasonCode,
			};
		}
		return {
			status: "failed",
			response: "",
			reasonCode: result.reasonCode,
		};
	};
}
