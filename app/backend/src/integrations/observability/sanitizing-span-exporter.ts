import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {
	telemetrySpanNameSchema,
	validateSpanAttributes,
} from "../../domain/observability/telemetry-attributes.js";

/** Resource attributes the provider sets, plus the SDK's own fixed ones. */
const allowedResourceKeys = new Set([
	"service.name",
	"deployment.environment.name",
	"telemetry.sdk.language",
	"telemetry.sdk.name",
	"telemetry.sdk.version",
]);

/**
 * Last gate before a span leaves the process (ADR 0012). Even if a code path
 * uses the tracer directly, a span that breaks the contract is dropped here:
 * unknown name or attributes, events, links, a free-text status message, or an
 * unexpected resource attribute. Dropped spans are only counted, never logged,
 * because their content is exactly what must not be echoed.
 */
export class SanitizingSpanExporter implements SpanExporter {
	droppedSpans = 0;

	constructor(private readonly inner: SpanExporter) {}

	export(
		spans: ReadableSpan[],
		resultCallback: Parameters<SpanExporter["export"]>[1],
	): void {
		const allowed = spans.filter((span) => this.isAllowed(span));
		this.droppedSpans += spans.length - allowed.length;
		if (allowed.length === 0) {
			resultCallback({ code: ExportResultCode.SUCCESS });
			return;
		}
		this.inner.export(allowed, resultCallback);
	}

	shutdown(): Promise<void> {
		return this.inner.shutdown();
	}

	forceFlush(): Promise<void> {
		return this.inner.forceFlush?.() ?? Promise.resolve();
	}

	private isAllowed(span: ReadableSpan): boolean {
		try {
			if (!telemetrySpanNameSchema.safeParse(span.name).success) return false;
			if (span.events.length > 0 || span.links.length > 0) return false;
			if (span.status.message !== undefined && span.status.message !== "") {
				return false;
			}
			for (const key of Object.keys(span.resource.attributes)) {
				if (!allowedResourceKeys.has(key)) return false;
			}
			validateSpanAttributes(span.attributes);
			return true;
		} catch {
			return false;
		}
	}
}
