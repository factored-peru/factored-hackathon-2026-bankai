import { z } from "zod";
import {
	disputeCaseSchema,
	disputeEvidenceSchema,
	transactionEvidenceSchema,
} from "./contracts.js";

export const DEMO_DISPUTE_FIXTURE_VERSION = "dispute-demo-v1" as const;
export const DEMO_DISPUTE_TENANT_ID = "demo-bankai" as const;

export const demoActorFixtureSchema = z
	.object({
		actorId: z.string().min(1),
		label: z.string().min(1),
		role: z.enum(["customer", "backoffice"]),
		recommended: z.boolean(),
		userId: z.string().min(1),
		tenantId: z.literal(DEMO_DISPUTE_TENANT_ID),
		roles: z.array(z.string().min(1)).min(1),
		capabilities: z.array(z.string().min(1)).min(1),
	})
	.strict();

export const demoSessionTemplateSchema = z
	.object({
		sessionId: z.string().min(1),
		userId: z.string().min(1),
		tenantId: z.literal(DEMO_DISPUTE_TENANT_ID),
		scopes: z.array(z.string()),
		roles: z.array(z.string().min(1)).min(1),
		capabilities: z.array(z.string().min(1)).min(1),
		sessionVersion: z.number().int().positive(),
		createdAt: z.string().datetime(),
		lastSeenAt: z.string().datetime(),
		expiresAt: z.string().datetime(),
		revokedAt: z.null(),
		provenance: z.literal("synthetic_local_fixture"),
		version: z.literal(DEMO_DISPUTE_FIXTURE_VERSION),
	})
	.strict();

export const demoDisputePackSchema = z
	.object({
		version: z.literal(DEMO_DISPUTE_FIXTURE_VERSION),
		tenantId: z.literal(DEMO_DISPUTE_TENANT_ID),
		ids: z
			.object({
				transactionId: z.string().min(1),
				disputeId: z.string().min(1),
				caseId: z.string().min(1),
			})
			.strict(),
		actors: z.array(demoActorFixtureSchema).min(2),
		sessionTemplates: z.array(demoSessionTemplateSchema).min(1),
		transactions: z.array(transactionEvidenceSchema).min(1),
		disputes: z.array(disputeEvidenceSchema).min(1),
		cases: z.array(disputeCaseSchema).min(1),
	})
	.strict();

export type DemoDisputePack = z.infer<typeof demoDisputePackSchema>;

const createdAt = "2026-01-01T00:00:00.000Z";
const expiresAt = "2026-01-01T01:00:00.000Z";

const rawPack = {
	version: DEMO_DISPUTE_FIXTURE_VERSION,
	tenantId: DEMO_DISPUTE_TENANT_ID,
	ids: {
		transactionId: "demo-transaction-1",
		disputeId: "demo-dispute-1",
		caseId: "demo-case-1",
	},
	actors: [
		{
			actorId: "demo-customer-1",
			label: "Cliente demo recomendado",
			role: "customer" as const,
			recommended: true,
			userId: "demo-customer-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			roles: ["customer"],
			capabilities: [
				"dispute.read",
				"dispute.transaction.read",
				"dispute.escalation.request",
				"conversation:write",
			],
		},
		{
			actorId: "demo-backoffice-1",
			label: "Backoffice demo",
			role: "backoffice" as const,
			recommended: false,
			userId: "demo-backoffice-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			roles: ["backoffice"],
			capabilities: [
				"dispute.read",
				"dispute.transaction.read",
				"conversation:read:any",
				"dispute.escalation.decide",
			],
		},
	],
	sessionTemplates: [
		{
			sessionId: "demo-session-customer-1",
			userId: "demo-customer-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			scopes: [],
			roles: ["customer"],
			capabilities: [
				"dispute.read",
				"dispute.transaction.read",
				"dispute.escalation.request",
				"conversation:write",
			],
			sessionVersion: 1,
			createdAt,
			lastSeenAt: createdAt,
			expiresAt,
			revokedAt: null,
			provenance: "synthetic_local_fixture" as const,
			version: DEMO_DISPUTE_FIXTURE_VERSION,
		},
		{
			sessionId: "demo-session-backoffice-1",
			userId: "demo-backoffice-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			scopes: [],
			roles: ["backoffice"],
			capabilities: [
				"dispute.read",
				"dispute.transaction.read",
				"conversation:read:any",
				"dispute.escalation.decide",
			],
			sessionVersion: 1,
			createdAt,
			lastSeenAt: createdAt,
			expiresAt,
			revokedAt: null,
			provenance: "synthetic_local_fixture" as const,
			version: DEMO_DISPUTE_FIXTURE_VERSION,
		},
	],
	transactions: [
		{
			transactionId: "demo-transaction-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			ownerUserId: "demo-customer-1",
			status: "declined" as const,
			amountBucket: "medium" as const,
			currency: "PEN",
			provenance: "synthetic_local_fixture" as const,
			version: DEMO_DISPUTE_FIXTURE_VERSION,
		},
	],
	disputes: [
		{
			disputeId: "demo-dispute-1",
			transactionId: "demo-transaction-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			ownerUserId: "demo-customer-1",
			status: "open" as const,
			priority: "normal" as const,
			provenance: "synthetic_local_fixture" as const,
			version: DEMO_DISPUTE_FIXTURE_VERSION,
		},
	],
	cases: [
		{
			caseId: "demo-case-1",
			disputeId: "demo-dispute-1",
			tenantId: DEMO_DISPUTE_TENANT_ID,
			ownerUserId: "demo-customer-1",
			status: "open" as const,
			createdAt,
			updatedAt: createdAt,
			provenance: "synthetic_local_fixture" as const,
			version: DEMO_DISPUTE_FIXTURE_VERSION,
		},
	],
};

export const demoDisputePack: DemoDisputePack =
	demoDisputePackSchema.parse(rawPack);

const FORBIDDEN_FIXTURE_MARKERS = [
	"password",
	"secret",
	"api_key",
	"apikey",
	"Bearer ",
	"PAN",
	"4111",
	"credit_card",
	"ssn",
] as const;

export function assertDemoDisputePackIsSynthetic(
	pack: DemoDisputePack = demoDisputePack,
): void {
	const serialized = JSON.stringify(pack);
	for (const marker of FORBIDDEN_FIXTURE_MARKERS) {
		if (serialized.toLowerCase().includes(marker.toLowerCase())) {
			throw new Error(`demo fixture contains forbidden marker: ${marker}`);
		}
	}
	if (/\b\d{12,19}\b/.test(serialized)) {
		throw new Error("demo fixture appears to contain a raw card number");
	}
	if (/amount(?!Bucket)/i.test(serialized) && /"amount"\s*:/.test(serialized)) {
		throw new Error("demo fixture must not expose raw monetary amounts");
	}
}
