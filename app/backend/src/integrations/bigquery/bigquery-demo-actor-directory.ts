import { createHmac } from "node:crypto";
import type { BigQuery } from "@google-cloud/bigquery";
import type { DemoActorDirectory } from "../../services/ports/conversation.js";
import { withLruCache } from "../cache/lru-memo.js";

type CustomerRow = { customer_id?: unknown };

/**
 * Closed demo cohort query. It only returns customer identifiers inside the
 * backend, then converts them to opaque HMAC aliases before the HTTP boundary.
 * Cohort rows are LRU-cached briefly to avoid re-querying BigQuery per list/resolve.
 */
export class BigQueryDemoActorDirectory implements DemoActorDirectory {
	private readonly cachedCustomers;

	constructor(
		private readonly bigquery: BigQuery,
		private readonly project: string,
		private readonly dataset: string,
		private readonly hmacKey: string,
	) {
		this.cachedCustomers = withLruCache(() => this.queryCustomers(), {
			maxEntries: 1,
			ttlMs: 60_000,
			keyFn: () => "cohort",
		});
	}

	async list() {
		const customers = await this.cachedCustomers.get();
		return [
			...customers.map((customerId: string, index: number) => ({
				actorId: this.actorId(customerId),
				label:
					index === 0
						? "Cliente demo recomendado"
						: `Cliente demo ${index + 1}`,
				role: "customer" as const,
				recommended: index === 0,
			})),
			{
				actorId: "demo-backoffice-1",
				label: "Backoffice demo",
				role: "backoffice" as const,
				recommended: false,
			},
		];
	}

	async resolve(actorId: string) {
		if (actorId === "demo-backoffice-1")
			return {
				userId: actorId,
				tenantId: "demo-bankai",
				roles: ["backoffice"],
				capabilities: [
					"dispute.read",
					"dispute.transaction.read",
					"conversation:read:any",
					"dispute.escalation.decide",
				],
			};
		const customer = (await this.cachedCustomers.get()).find(
			(customerId: string) => this.actorId(customerId) === actorId,
		);
		return customer
			? {
					userId: actorId,
					tenantId: "demo-bankai",
					roles: ["customer"],
					capabilities: [
						"dispute.read",
						"dispute.transaction.read",
						"dispute.escalation.request",
						"conversation:write",
					],
				}
			: null;
	}

	/** Server-only alias resolution; no customer ID crosses the HTTP boundary. */
	async customerIdForActor(actorId: string): Promise<string | null> {
		if (actorId === "demo-backoffice-1") return null;
		return (
			(await this.cachedCustomers.get()).find(
				(customerId: string) => this.actorId(customerId) === actorId,
			) ?? null
		);
	}

	private async queryCustomers(): Promise<string[]> {
		const query = `
SELECT customer_id
FROM (
  SELECT t.customer_id
  FROM \`${this.project}.${this.dataset}.transactions\` AS t
  LEFT JOIN \`${this.project}.${this.dataset}.complaints\` AS c USING (customer_id)
  WHERE t.customer_id IS NOT NULL
  GROUP BY t.customer_id
  HAVING COUNT(*) >= 3
     AND COUNTIF(c.category = 'Transactions') >= 1
  ORDER BY FARM_FINGERPRINT(CAST(t.customer_id AS STRING))
  LIMIT 3
)`.trim();
		const [rows] = await this.bigquery.query({
			query,
			maximumBytesBilled: "50000000",
			useLegacySql: false,
			labels: { component: "demo_directory" },
		});
		return (rows as CustomerRow[]).flatMap((row) =>
			typeof row.customer_id === "string" ? [row.customer_id] : [],
		);
	}

	private actorId(customerId: string): string {
		return `demo-customer-${createHmac("sha256", this.hmacKey).update(customerId).digest("base64url")}`;
	}
}
