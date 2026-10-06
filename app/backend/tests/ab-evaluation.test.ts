import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ControlledComparableRunner } from "../src/integrations/evaluation/controlled-comparable-runner.js";
import {
	createTaskCompletionJudgeFromEnv,
	JevTaskCompletionJudge,
} from "../src/integrations/providers/jev-task-completion-judge.js";
import { createTrajectoryJevAsJudge } from "../src/integrations/providers/trajectory-jev-as-judge.js";
import { TrajectoryJevJudgeEvaluator } from "../src/integrations/providers/trajectory-jev-judge-evaluator.js";
import {
	evaluateTechnicalCompleteness,
	runAbComparison,
} from "../src/services/evaluation/ab-comparison.js";
import {
	evaluationScenarioSchema,
	parsePipelineRunRecord,
} from "../src/services/evaluation/ab-contracts.js";
import { BaselineComparableRunner } from "../src/services/evaluation/baseline-comparable-runner.js";
import {
	assertSanitizedTrajectory,
	toSanitizedTrajectory,
} from "../src/services/evaluation/sanitized-trajectory.js";
import { SyntheticTaskCompletionJudge } from "../src/services/evaluation/task-completion-judge.js";
import {
	abEvaluationScenarios,
	KG_CASE_ALLOWLIST,
	STRUCTURED_QUERY_PLAN_ALLOWLIST,
	selectAbScenarios,
} from "./fixtures/ab-evaluation-scenarios.js";

describe("local A/B evaluation", () => {
	test("exposes polarity/locale Latam corpus with catalog allowlists", () => {
		expect(selectAbScenarios("all").length).toBe(128);
		expect(selectAbScenarios("phase-1").length).toBe(18);
		expect(selectAbScenarios("phase-2").length).toBe(110);
		expect(abEvaluationScenarios.length).toBe(128);
		const esCount = abEvaluationScenarios.filter(
			(s) => s.locale === "es",
		).length;
		const ptCount = abEvaluationScenarios.filter(
			(s) => s.locale === "pt",
		).length;
		expect(esCount).toBe(64);
		expect(ptCount).toBe(64);
		const hitlCount = abEvaluationScenarios.filter(
			(s) =>
				s.expectedRoute === "hitl" ||
				s.expectedTerminalStatus === "pending_approval",
		).length;
		expect(hitlCount).toBeGreaterThanOrEqual(16);
		for (const s of abEvaluationScenarios) {
			expect(() => evaluationScenarioSchema.parse(s)).not.toThrow();
		}
		expect(abEvaluationScenarios.some((s) => s.polarity === "positive")).toBe(
			true,
		);
		expect(abEvaluationScenarios.some((s) => s.polarity === "negative")).toBe(
			true,
		);
		for (const s of abEvaluationScenarios) {
			if (s.polarity === "positive" && s.expectedRoute === "structured_rag") {
				expect(
					(STRUCTURED_QUERY_PLAN_ALLOWLIST as readonly string[]).includes(
						s.expectedQueryPlanId ?? "",
					),
				).toBe(true);
			}
			if (s.polarity === "positive" && s.expectedRoute === "kg_rag") {
				const caseId = s.researchRef?.match(/C[1-5]/)?.[0] ?? "";
				expect((KG_CASE_ALLOWLIST as readonly string[]).includes(caseId)).toBe(
					true,
				);
			}
		}
		expect(
			abEvaluationScenarios.some((s) =>
				s.researchRef?.includes("adr-0004:adversarial"),
			),
		).toBe(true);
		expect(
			abEvaluationScenarios.some((s) =>
				s.prompt.includes("SELECT * FROM customers"),
			),
		).toBe(true);
		expect(
			abEvaluationScenarios.some((s) =>
				s.prompt.toLowerCase().includes("gerente"),
			),
		).toBe(true);
	});

	test("JEV judge system instructions stay English", async () => {
		let body: unknown;
		const judge = createTrajectoryJevAsJudge({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async (_url: string, init?: RequestInit) => {
				body = JSON.parse(String(init?.body ?? "{}"));
				return new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.9 },
							routing_quality: { type: "score", score: 3, confidence: 0.9 },
						},
					}),
					{ status: 200 },
				);
			}) as unknown as typeof fetch,
		});
		await judge.evaluate({
			workflowLabel: "workflow_B",
			outputs: {
				steps: [],
				status: "completed",
				route: "llm",
				toolOutcome: "none",
				hasError: false,
				hasQueryPlan: false,
				gates: {
					controlPlane: true,
					privacy: true,
					guardrail: true,
					policy: true,
				},
				retrievalAttempted: false,
				retrievalSucceeded: false,
			},
			referenceOutputs: {
				steps: [],
				status: "completed",
				route: "llm",
				toolOutcome: "none",
				hasError: false,
				hasQueryPlan: false,
				gates: {
					controlPlane: true,
					privacy: true,
					guardrail: true,
					policy: true,
				},
				retrievalAttempted: false,
				retrievalSucceeded: false,
			},
		});
		const text = JSON.stringify(body);
		expect(text).toContain("did the observed trajectory match");
		expect(text).not.toMatch(/¿|trayectoria observada|cumplió el outcome/i);
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
		const scenario = selectAbScenarios("phase-1")[0];
		expect(scenario).toBeDefined();
		if (!scenario) throw new Error("missing phase-1 scenario");
		const baseline = await new BaselineComparableRunner().run(scenario);
		const controlled = await new ControlledComparableRunner().run(scenario);
		expect(baseline.snapshotId).toBe(controlled.snapshotId);
		expect(baseline.gatesInvoked.controlPlane).toBe(false);
		expect(baseline.route).toBe("llm");
		expect(controlled.gatesInvoked.controlPlane).toBe(true);
		expect(controlled.gatesInvoked.policy).toBe(true);
		expect(controlled.status).toBe("completed");
		expect(controlled.queryPlanId).toBe("customer_products");
	});

	test("injected baseline model receives system prompt and drives tool use", async () => {
		const scenario = selectAbScenarios("phase-1")[0];
		expect(scenario).toBeDefined();
		if (!scenario) throw new Error("missing phase-1 scenario");
		const seen: string[] = [];
		const record = await new BaselineComparableRunner({
			model: {
				async begin(input) {
					seen.push(input.system.slice(0, 80));
					expect(input.system).toContain("banking assistant");
					expect(input.user).toBe(scenario.prompt);
					return {
						kind: "tool_call",
						call: {
							name: "retrieve_context",
							args: {
								queryId: "customer_products",
								version: "v1",
								parameters: {},
							},
							callId: "live-1",
						},
					};
				},
				async continue() {
					return { kind: "final", text: "Productos sintéticos OK." };
				},
			},
			modelId: "test-live-model",
		}).run(scenario);
		expect(seen.length).toBe(1);
		expect(record.modelVersion).toBe("test-live-model");
		expect(record.route).toBe("llm");
		expect(record.retrievalAttemptCount).toBe(1);
		expect(record.retrievalSuccessCount).toBe(1);
		expect(record.queryPlanId).toBe("customer_products");
		expect(record.toolOutcome).toBe("ready");
	});

	test("deny and guardrail references align toolOutcome for match judging", async () => {
		const deny = abEvaluationScenarios.find(
			(s) => s.scenarioId === "deny-transfer-es",
		);
		const guard = abEvaluationScenarios.find(
			(s) => s.scenarioId === "adv-ignore-es",
		);
		expect(deny).toBeDefined();
		expect(guard).toBeDefined();
		if (!deny || !guard) return;
		const denyRun = await new ControlledComparableRunner().run(deny);
		const guardRun = await new ControlledComparableRunner().run(guard);
		const denyProj = toSanitizedTrajectory(deny, denyRun);
		const guardProj = toSanitizedTrajectory(guard, guardRun);
		expect(denyProj.workflowLabel).toBe("workflow_B");
		expect(denyProj.outputs.toolOutcome).toBe("denied");
		expect(denyProj.referenceOutputs.toolOutcome).toBe("denied");
		expect(denyProj.outputs.hasError).toBe(true);
		expect(denyProj.referenceOutputs.hasError).toBe(true);
		expect(guardProj.outputs.toolOutcome).toBe("skipped");
		expect(guardProj.referenceOutputs.toolOutcome).toBe("skipped");
	});

	test("trajectory JEV judge state uses workflow labels only", async () => {
		let body: unknown;
		const scenario = selectAbScenarios("phase-1")[0];
		if (!scenario) throw new Error("missing scenario");
		const record = await new ControlledComparableRunner().run(scenario);
		await new JevTaskCompletionJudge({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async (_url: string, init?: RequestInit) => {
				body = JSON.parse(String(init?.body ?? "{}"));
				return new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.9 },
							routing_quality: { type: "score", score: 3, confidence: 0.9 },
						},
					}),
					{ status: 200 },
				);
			}) as unknown as typeof fetch,
		}).evaluate({ scenario, record });
		const text = JSON.stringify(body);
		expect(text).toContain("workflow_B");
		expect(text).not.toContain("baseline");
		expect(text).not.toContain("controlled");
		expect(text).not.toContain("control-plane");
		expect(text).not.toContain("control plane");
	});

	test("sanitized trajectory projection has no forbidden content keys", async () => {
		const scenario = selectAbScenarios("phase-1")[0];
		if (!scenario) throw new Error("missing scenario");
		const record = await new ControlledComparableRunner().run(scenario);
		const projection = toSanitizedTrajectory(scenario, record);
		expect(() => assertSanitizedTrajectory(projection)).not.toThrow();
		const text = JSON.stringify(projection);
		expect(text).not.toContain("prompt");
		expect(text).not.toContain(scenario.prompt);
	});

	test("trajectory JEV judge maps high noul to pass", async () => {
		const judge = createTrajectoryJevAsJudge({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async () =>
				new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.91 },
							routing_quality: {
								type: "score",
								score: 3,
								confidence: 0.9,
							},
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				)) as unknown as typeof fetch,
		});
		const scenario = selectAbScenarios("phase-1")[0];
		if (!scenario) throw new Error("missing scenario");
		const record = await new ControlledComparableRunner().run(scenario);
		const result = await new JevTaskCompletionJudge({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async () =>
				new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.91 },
							routing_quality: { type: "score", score: 3, confidence: 0.9 },
						},
					}),
					{ status: 200 },
				)) as unknown as typeof fetch,
		}).evaluate({ scenario, record });
		expect(result).toMatchObject({
			metric: "task_completion_semantic",
			passed: true,
			label: "pass",
			reasonCode: null,
			score: 0.91,
		});
		const direct = await judge.evaluate({
			workflowLabel: "workflow_B",
			outputs: toSanitizedTrajectory(scenario, record).outputs,
			referenceOutputs: toSanitizedTrajectory(scenario, record)
				.referenceOutputs,
		});
		expect(direct.passed).toBe(true);
	});

	test("trajectory JEV judge maps low noul and transport errors", async () => {
		const scenario = selectAbScenarios("phase-1")[0];
		if (!scenario) throw new Error("missing scenario");
		const record = await new ControlledComparableRunner().run(scenario);

		const low = await new JevTaskCompletionJudge({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async () =>
				new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.2 },
							routing_quality: { type: "score", score: 0, confidence: 0.5 },
						},
					}),
					{ status: 200 },
				)) as unknown as typeof fetch,
		}).evaluate({ scenario, record });
		expect(low).toMatchObject({
			passed: false,
			label: "fail",
			reasonCode: "jev_low_confidence",
			score: 0.2,
		});

		const down = await new JevTaskCompletionJudge({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async () => {
				throw new Error("network");
			}) as unknown as typeof fetch,
		}).evaluate({ scenario, record });
		expect(down.reasonCode).toBe("jev_unavailable");
		expect(down.passed).toBe(false);
	});

	test("factory auto uses synthetic when JEV disabled", () => {
		const judge = createTaskCompletionJudgeFromEnv(
			{
				JEV_ENABLED: false,
				JEV_BASE_URL: "",
				JEV_API_KEY: "",
				JEV_MODEL: "",
				JEV_MIN_CONFIDENCE: 0.7,
				JEV_TIMEOUT_MS: 1000,
			},
			"auto",
		);
		expect(judge).toBeInstanceOf(SyntheticTaskCompletionJudge);
	});

	test("JudgeEvaluator adapter emits mode jev", async () => {
		const evaluator = new TrajectoryJevJudgeEvaluator({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async () =>
				new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.8 },
							routing_quality: { type: "score", score: 2, confidence: 0.8 },
						},
					}),
					{ status: 200 },
				)) as unknown as typeof fetch,
		});
		const results = await evaluator.evaluate({
			traceId: "t",
			fixtureId: "f",
			route: "structured_rag",
			expectedRoute: "structured_rag",
			trajectory: [{ name: "policy", route: "policy" }],
			expectedTrajectory: [{ name: "policy", route: "policy" }],
			policyAllowed: true,
			budgetExceeded: false,
			evidenceVersion: null,
			catalogLoaded: true,
			catalogLoadedBeforeSpecializedJev: true,
			tenantIsolated: true,
			guardrailPassed: true,
			responseContainsSensitiveContent: false,
			resultVerified: true,
			policyVersion: "v1",
			catalogVersion: "v1",
			controlPlaneInvoked: true,
			privacyGateInvoked: true,
			guardrailInvoked: true,
			retrievalInvoked: true,
			retrievalSuccessCount: 1,
		});
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			mode: "jev",
			evaluator: "trajectory_jev_as_judge",
			passed: true,
		});
	});

	test("file sink compare writes sanitized summary without prompts", async () => {
		const root = mkdtempSync(join(tmpdir(), "ab-eval-"));
		const sample = selectAbScenarios("phase-1").slice(0, 3);
		try {
			const { summary, metrics, runs } = await runAbComparison({
				scenarios: sample,
				outRoot: root,
				runId: "test-run",
				judge: new SyntheticTaskCompletionJudge(),
				controlled: new ControlledComparableRunner(),
			});
			expect(summary.scenarioCount).toBe(3);
			expect(summary.technicalFailCount).toBe(0);
			expect(summary.judgeSkippedCount).toBe(6);
			expect(summary.judgeJevCount).toBe(0);
			expect(summary.semantic).toBeNull();
			expect(runs).toHaveLength(6);
			const summaryText = readFileSync(
				join(root, "test-run", "summary.json"),
				"utf8",
			);
			expect(summaryText).not.toContain("¿");
			expect(summaryText).not.toContain("productos");
			expect(metrics.every((m) => !JSON.stringify(m).includes("¿"))).toBe(true);
			for (const scenario of sample) {
				const controlled = runs.find(
					(r) =>
						r.scenarioId === scenario.scenarioId && r.pipeline === "controlled",
				);
				expect(controlled).toBeDefined();
				if (!controlled) continue;
				const technical = evaluateTechnicalCompleteness(scenario, controlled);
				expect(technical.every((m) => m.passed)).toBe(true);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("file sink with mocked JEV judge records judgeJevCount and byPolarity", async () => {
		const root = mkdtempSync(join(tmpdir(), "ab-eval-jev-"));
		const sample = selectAbScenarios("phase-1").slice(0, 3);
		try {
			const mockFetch = (async () =>
				new Response(
					JSON.stringify({
						answers: {
							trajectory_complete: { type: "noul", noul: 0.85 },
							routing_quality: { type: "score", score: 2, confidence: 0.85 },
						},
					}),
					{ status: 200 },
				)) as unknown as typeof fetch;
			const { summary } = await runAbComparison({
				scenarios: sample,
				outRoot: root,
				runId: "jev-run",
				judge: new JevTaskCompletionJudge({
					baseUrl: "https://jev.example.test",
					apiKey: "secret",
					model: "jev-latest",
					minConfidence: 0.7,
					timeoutMs: 1000,
					fetch: mockFetch,
				}),
				controlled: new ControlledComparableRunner(),
			});
			expect(summary.judgeSkippedCount).toBe(0);
			expect(summary.judgeJevCount).toBe(6);
			expect(summary.semantic).not.toBeNull();
			expect(summary.semantic?.workflow_A.passCount).toBeGreaterThanOrEqual(0);
			expect(summary.semantic?.workflow_B.passCount).toBe(3);
			expect(summary.semantic?.byPolarity.positive.workflow_B.passCount).toBe(
				3,
			);
			expect(summary.semantic?.byPolarity.negative.workflow_B.passCount).toBe(
				0,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
