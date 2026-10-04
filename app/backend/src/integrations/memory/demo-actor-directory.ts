import type { DemoActorDirectory } from "../../services/ports/conversation.js";

const tenantId = "demo-bankai";

export class InMemoryDemoActorDirectory implements DemoActorDirectory {
	async list() {
		return [
			{
				actorId: "demo-customer-1",
				label: "Cliente demo recomendado",
				role: "customer" as const,
				recommended: true,
			},
			{
				actorId: "demo-backoffice-1",
				label: "Backoffice demo",
				role: "backoffice" as const,
				recommended: false,
			},
		];
	}

	async resolve(actorId: string) {
		if (actorId === "demo-customer-1")
			return {
				userId: actorId,
				tenantId,
				roles: ["customer"],
				capabilities: [
					"dispute:read",
					"dispute.escalation.request",
					"conversation:write",
				],
			};
		if (actorId === "demo-backoffice-1")
			return {
				userId: actorId,
				tenantId,
				roles: ["backoffice"],
				capabilities: [
					"dispute:read",
					"conversation:read:any",
					"dispute.escalation.decide",
				],
			};
		return null;
	}
}
