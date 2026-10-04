import type { Env } from "../../config/env.js";
import type { GuardrailProvider } from "../../services/ports/control.js";
import { ModelArmorGuardrailProvider } from "./model-armor-guardrail-provider.js";
import { UnavailableGuardrailProvider } from "./unavailable-guardrail-provider.js";

/** Disabled Model Armor stays fail-closed; it never degrades to allow. */
export function createGuardrailProvider(
	settings: Pick<
		Env,
		| "MODEL_ARMOR_ENABLED"
		| "MODEL_ARMOR_PROJECT_ID"
		| "MODEL_ARMOR_LOCATION"
		| "MODEL_ARMOR_INSPECT_TEMPLATE"
		| "AGENT_MAX_WALL_TIME_MS"
	>,
): GuardrailProvider {
	if (!settings.MODEL_ARMOR_ENABLED) {
		return new UnavailableGuardrailProvider("model-armor");
	}
	return new ModelArmorGuardrailProvider({
		projectId: settings.MODEL_ARMOR_PROJECT_ID,
		location: settings.MODEL_ARMOR_LOCATION,
		template: settings.MODEL_ARMOR_INSPECT_TEMPLATE,
		timeoutMs: Math.min(10_000, settings.AGENT_MAX_WALL_TIME_MS),
	});
}
