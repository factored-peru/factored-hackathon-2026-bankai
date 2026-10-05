import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	evaluateTechnicalCompleteness,
	runAbComparison,
} from "../src/services/evaluation/ab-comparison.js";
import { parsePipelineRunRecord } from "../src/services/evaluation/ab-contracts.js";
import { BaselineComparableRunner } from "../src/services/evaluation/baseline-comparable-runner.js";
import { ControlledComparableRunner } from "../src/services/evaluation/controlled-comparable-runner.js";
import { SyntheticTaskCompletionJudge } from "../src/services/evaluation/task-completion-judge.js";
import {
	abEvaluationScenarios,
	selectAbScenarios,
} from "./fixtures/ab-evaluation-scenarios.js";

describe("local A/B evaluation", () => {
	test("exposes phase-1 structured plans and phase-2 research cases", () => {
		expect(selectAbScenarios("phase-1")).toHaveLength(3);
		expect(selectAbScenarios("phase-2").length).toBeGreaterThanOrEqual(8);
		expect(abEvaluationScenarios.map((s) => s.expectedQueryPlanId)).toEqual(
			expect.arrayContaining([
				"customer_products",
				"product_status",
				"recent_transactions",
			]),
		);
	});

	test("rejects pipeline records that carry prompts or SQL", () => {
		expect(() =>
			parsePipelineRunRecord({
				runId: "r1",
				scenarioId: "s1",
				snapshotId: "snap",
				pipeline: "baseline",
				status: "completed",
				route: "llm",
				queryPlanId: null,
				catalogVersion: null,
				policyVersion: null,
				modelVersion: "m",
				durationMs: 1,
				modelCallCount: 0,
				retrievalAttemptCount: 0,
				retrievalSuccessCount: 0,
				aggregatedRowCount: 0,
				aggregatedBytes: 0,
				toolOutcome: "none",
				errorCode: null,
				gatesInvoked: {
					controlPlane: false,
					privacy: false,
					guardrail: false,
					policy: false,
				},
				prompt: "secret user text",
			}),
		).toThrow(/forbidden_key/);
	});

	test("pairs baseline and controlled on the same snapshot with ungated vs gated shape", async () => {
		const scenario = selectAbScenarios("phase-1")[0]!;
		const baseline = await new BaselineComparableRunner().run(scenario);
		const controlled = await new ControlledComparableRunner().run(scenario);
		expect(baseline.snapshotId).toBe(controlled.snapshotId);
		expect(baseline.gatesInvoked.controlPlane).toBe(false);
		expect(controlled.gatesInvoked.controlPlane).toBe(true);
		expect(controlled.gatesInvoked.policy).toBe(true);
		expect(controlled.status).toBe("completed");
		expect(controlled.queryPlanId).toBe("customer_products");
	});

	test("synthetic judge stays skipped", async () => {
		const judged = await new SyntheticTaskCompletionJudge().evaluate({
			scenarioId: "x",
			pipeline: "controlled",
		});
		expect(judged).toMatchObject({
			label: "skipped",
			reasonCode: "judge_not_configured",
		});
	});

	test("file sink compare writes sanitized summary without prompts", async () => {
		const root = mkdtempSync(join(tmpdir(), "ab-eval-"));
		try {
			const { summary, metrics, runs } = await runAbComparison({
				scenarios: selectAbScenarios("phase-1"),
				outRoot: root,
				runId: "test-run",
			});
			expect(summary.scenarioCount).toBe(3);
			expect(summary.technicalFailCount).toBe(0);
			expect(runs).toHaveLength(6);
			const summaryText = readFileSync(
				join(root, "test-run", "summary.json"),
				"utf8",
			);
			expect(summaryText).not.toContain("¿");
			expect(summaryText).not.toContain("productos");
			expect(metrics.every((m) => !JSON.stringify(m).includes("¿"))).toBe(true);
			for (const scenario of selectAbScenarios("phase-1")) {
				const controlled = runs.find(
					(r) =>
						r.scenarioId === scenario.scenarioId && r.pipeline === "controlled",
				)!;
				const technical = evaluateTechnicalCompleteness(scenario, controlled);
				expect(technical.every((m) => m.passed)).toBe(true);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
