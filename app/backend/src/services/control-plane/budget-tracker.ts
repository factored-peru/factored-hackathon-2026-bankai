import type { AgentBudget } from "../../domain/control/contracts.js";

export type BudgetCounter =
	| "steps"
	| "toolCalls"
	| "llmCalls"
	| "retries"
	| "retrievedChunks"
	| "inputTokens"
	| "outputTokens";

export class BudgetExceededError extends Error {
	constructor(readonly counter: BudgetCounter | "wallTime") {
		super(`Agent budget exceeded: ${counter}`);
		this.name = "BudgetExceededError";
	}
}

export class BudgetTracker {
	private readonly startedAt: number;
	private readonly usage: Record<BudgetCounter, number> = {
		steps: 0,
		toolCalls: 0,
		llmCalls: 0,
		retries: 0,
		retrievedChunks: 0,
		inputTokens: 0,
		outputTokens: 0,
	};

	constructor(
		private readonly budget: AgentBudget,
		private readonly now: () => number = Date.now,
	) {
		this.startedAt = now();
	}

	consume(counter: BudgetCounter, amount = 1): void {
		this.assertWallTime();
		this.usage[counter] += amount;
		const maximum = this.maximum(counter);
		if (maximum > 0 && this.usage[counter] > maximum) {
			throw new BudgetExceededError(counter);
		}
	}

	assertWallTime(): void {
		if (this.now() - this.startedAt > this.budget.maxWallTimeMs) {
			throw new BudgetExceededError("wallTime");
		}
	}

	private maximum(counter: BudgetCounter): number {
		switch (counter) {
			case "steps":
				return this.budget.maxSteps;
			case "toolCalls":
				return this.budget.maxToolCalls;
			case "llmCalls":
				return this.budget.maxLlmCalls;
			case "retries":
				return this.budget.maxRetriesPerNode;
			case "retrievedChunks":
				return this.budget.maxRetrievedChunks;
			case "inputTokens":
				return this.budget.maxInputTokens;
			case "outputTokens":
				return this.budget.maxOutputTokens;
		}
	}
}
