import { describe, expect, test } from "bun:test";
import type { BigQuery } from "@google-cloud/bigquery";
import {
	BigQueryDemoActorDirectory,
	DEMO_COHORT_MAX_BYTES_BILLED,
} from "../src/integrations/bigquery/bigquery-demo-actor-directory.js";

type QueryOptions = {
	query: string;
	maximumBytesBilled?: string;
	useLegacySql?: boolean;
	labels?: Record<string, string>;
};

function directory(customerIds: readonly string[] = ["c-1", "c-2", "c-3"]) {
	const calls: QueryOptions[] = [];
	const bigquery = {
		async query(options: QueryOptions) {
			calls.push(options);
			return [customerIds.map((customer_id) => ({ customer_id }))];
		},
	} as unknown as BigQuery;
	return {
		calls,
		actors: new BigQueryDemoActorDirectory(
			bigquery,
			"factored-hackathon",
			"hackathon",
			"local-hmac-key-for-tests",
		),
	};
}

describe("BigQuery demo actor directory", () => {
	test("the cohort query cap leaves room above the ~82 MB it scans", () => {
		// 50 MB made the query fail with bytesBilledLimitExceeded.
		expect(Number(DEMO_COHORT_MAX_BYTES_BILLED)).toBeGreaterThan(81_788_928);
	});

	test("runs one standard-SQL query, qualified and capped, with a label", async () => {
		const { actors, calls } = directory();
		await actors.list();
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			maximumBytesBilled: DEMO_COHORT_MAX_BYTES_BILLED,
			useLegacySql: false,
			labels: { component: "demo_directory" },
		});
		expect(calls[0]?.query).toContain(
			"`factored-hackathon.hackathon.transactions`",
		);
		expect(calls[0]?.query).toContain(
			"`factored-hackathon.hackathon.complaints`",
		);
	});

	test("lists opaque aliases and never a raw customer ID", async () => {
		const { actors } = directory();
		const listed = await actors.list();
		expect(listed).toHaveLength(4);
		expect(listed[0]).toMatchObject({
			role: "customer",
			recommended: true,
			label: "Cliente demo recomendado",
		});
		expect(listed[3]).toMatchObject({
			actorId: "demo-backoffice-1",
			role: "backoffice",
		});
		const serialized = JSON.stringify(listed);
		for (const raw of ["c-1", "c-2", "c-3"]) {
			expect(serialized).not.toContain(`"${raw}"`);
		}
		for (const actor of listed.slice(0, 3)) {
			expect(actor.actorId).toMatch(/^demo-customer-[A-Za-z0-9_-]+$/);
		}
	});

	test("caches the cohort, so listing then resolving queries only once", async () => {
		const { actors, calls } = directory();
		const [first] = await actors.list();
		const resolved = await actors.resolve(first?.actorId ?? "");
		expect(resolved).toMatchObject({
			tenantId: "demo-bankai",
			roles: ["customer"],
		});
		expect(calls).toHaveLength(1);
	});

	test("resolves a known alias to its customer and an unknown one to null", async () => {
		const { actors } = directory();
		const [first] = await actors.list();
		expect(await actors.customerIdForActor(first?.actorId ?? "")).toBe("c-1");
		expect(await actors.resolve("demo-customer-unknown")).toBeNull();
		expect(await actors.customerIdForActor("demo-customer-unknown")).toBeNull();
		expect(await actors.customerIdForActor("demo-backoffice-1")).toBeNull();
	});

	test("the backoffice actor needs no cohort query", async () => {
		const { actors, calls } = directory();
		expect(await actors.resolve("demo-backoffice-1")).toMatchObject({
			roles: ["backoffice"],
		});
		expect(calls).toHaveLength(0);
	});
});
