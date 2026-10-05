import { createInterface } from "node:readline/promises";

/**
 * Console client for the conversation WebSocket (`/v1/realtime`), for trying a
 * backend by hand: the demo runner, the baseline chat or, later, the agent.
 * It only speaks the public contract (demo session + `chat.send`), so it works
 * the same against a local process, a container or a deployed service.
 */

export type ChatEvent = Readonly<{
	type: string;
	threadId: string | null;
	traceId: string | null;
	revision: number | null;
	payload: unknown;
}>;

export type ChatTurn = Readonly<{
	events: readonly ChatEvent[];
	reply: string;
	threadId: string | null;
	traceId: string | null;
	/** Final run status; null if the turn ended in a protocol problem. */
	status: string | null;
	reasonCode: string | null;
	problem: string | null;
}>;

export type ChatClient = Readonly<{
	send(text: string): Promise<ChatTurn>;
	close(): void;
}>;

export type OpenChatOptions = Readonly<{
	baseUrl: string;
	actorId: string;
	/** Must be one of the backend's CORS_ALLOWED_ORIGINS. */
	origin: string;
	timeoutMs?: number;
	onEvent?: (event: ChatEvent) => void;
}>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const DEFAULT_TIMEOUT_MS = 120_000;
const FINAL_STATUSES = new Set([
	"completed",
	"denied",
	"failed",
	"pending_approval",
	"awaiting_clarification",
]);

/**
 * A message typed here reaches whichever backend this points at, and a baseline
 * backend forwards it to Vertex AI (ADR 0010: synthetic text only). Anything
 * that is not this machine therefore needs an explicit opt-in.
 */
export function assertLocalUrl(baseUrl: string, allowRemote: boolean): void {
	const host = new URL(baseUrl).hostname;
	if (!allowRemote && !LOCAL_HOSTS.has(host)) {
		throw new Error(`chat_remote_url_needs_allow_remote:${host}`);
	}
}

function parseEvent(raw: unknown): ChatEvent | null {
	try {
		const value = JSON.parse(String(raw)) as Partial<ChatEvent>;
		return typeof value.type === "string"
			? {
					type: value.type,
					threadId: value.threadId ?? null,
					traceId: value.traceId ?? null,
					revision: value.revision ?? null,
					payload: value.payload,
				}
			: null;
	} catch {
		return null;
	}
}

function fieldOf(payload: unknown, key: string): string | null {
	const value = (payload as Record<string, unknown> | null)?.[key];
	return typeof value === "string" ? value : null;
}

/** Logs in as a demo actor and opens the realtime socket with that session. */
export async function openChat(options: OpenChatOptions): Promise<ChatClient> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const login = await fetch(new URL("/v1/demo/sessions", options.baseUrl), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ actorId: options.actorId }),
	});
	if (!login.ok) {
		throw new Error(`chat_login_failed:${login.status}`);
	}
	const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
	if (cookie === "") {
		throw new Error("chat_login_without_session_cookie");
	}

	const socketUrl = new URL("/v1/realtime", options.baseUrl);
	socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
	// Bun's WebSocket accepts request headers, which the handshake needs (the
	// session cookie and an allowed Origin). The DOM typings do not model that.
	const BunWebSocket = WebSocket as unknown as new (
		url: string,
		init: { headers: Record<string, string> },
	) => WebSocket;
	const socket = new BunWebSocket(socketUrl.toString(), {
		headers: { cookie, origin: options.origin },
	});

	const inbox: ChatEvent[] = [];
	let waiter: (() => void) | null = null;
	let closedReason: string | null = null;
	socket.addEventListener("message", (message) => {
		const event = parseEvent(message.data);
		if (event === null) return;
		inbox.push(event);
		options.onEvent?.(event);
		waiter?.();
	});
	socket.addEventListener("close", (event) => {
		closedReason = `chat_socket_closed:${event.code}`;
		waiter?.();
	});

	/** Next event matching `accept`, consuming everything before it. */
	async function next(
		accept: (event: ChatEvent) => boolean,
		seen: ChatEvent[],
		deadline: number,
	): Promise<ChatEvent> {
		for (;;) {
			while (inbox.length > 0) {
				const event = inbox.shift() as ChatEvent;
				seen.push(event);
				if (accept(event)) return event;
			}
			if (closedReason !== null) throw new Error(closedReason);
			const remaining = deadline - Date.now();
			if (remaining <= 0) throw new Error("chat_timeout");
			await new Promise<void>((resolve) => {
				const timer = setTimeout(resolve, remaining);
				waiter = () => {
					clearTimeout(timer);
					resolve();
				};
			});
			waiter = null;
		}
	}

	await new Promise<void>((resolve, reject) => {
		socket.addEventListener("open", () => resolve());
		socket.addEventListener("error", () =>
			reject(new Error("chat_socket_error")),
		);
		socket.addEventListener("close", (event) =>
			reject(new Error(`chat_socket_rejected:${event.code}`)),
		);
	});
	await next(
		(event) => event.type === "session.ready",
		[],
		Date.now() + 10_000,
	);

	let threadId: string | null = null;
	return {
		async send(text: string): Promise<ChatTurn> {
			const events: ChatEvent[] = [];
			const deadline = Date.now() + timeoutMs;
			socket.send(
				JSON.stringify({
					type: "chat.send",
					clientMessageId: crypto.randomUUID(),
					text,
					...(threadId === null ? {} : { threadId }),
				}),
			);
			// `send` only queues the run; its result arrives later as events.
			const end = await next(
				(event) =>
					event.type === "problem" ||
					event.type === "assistant.completed" ||
					event.type === "hitl.created" ||
					(event.type === "run.state" &&
						fieldOf(event.payload, "status") === "failed"),
				events,
				deadline,
			);
			threadId = end.threadId ?? threadId;
			const turn = {
				events,
				threadId,
				traceId: end.traceId,
			};
			if (end.type === "problem") {
				return {
					...turn,
					reply: "",
					status: null,
					reasonCode: null,
					problem: fieldOf(end.payload, "code") ?? "problem",
				};
			}
			const streamed = events
				.filter((event) => event.type === "assistant.delta")
				.map((event) => fieldOf(event.payload, "value") ?? "")
				.join("");
			const reply = fieldOf(end.payload, "response") ?? streamed;
			let status = fieldOf(end.payload, "status") ?? "failed";
			let reasonCode: string | null = null;
			if (threadId !== null) {
				// The final snapshot carries the reason code the events do not.
				socket.send(
					JSON.stringify({ type: "conversation.subscribe", threadId }),
				);
				try {
					const snapshot = await next(
						(event) =>
							event.type === "conversation.snapshot" &&
							FINAL_STATUSES.has(
								fieldOf(
									(event.payload as { trace?: unknown } | null)?.trace,
									"status",
								) ?? "",
							),
						events,
						Math.min(deadline, Date.now() + 5_000),
					);
					const trace = (snapshot.payload as { trace?: unknown }).trace;
					status = fieldOf(trace, "status") ?? status;
					reasonCode = fieldOf(trace, "reasonCode");
				} catch {
					// Best effort: the reply and status above are already known.
				}
			}
			return { ...turn, reply, status, reasonCode, problem: null };
		},
		close() {
			socket.close();
		},
	};
}

function argumentValues(flag: string): string[] {
	const values: string[] = [];
	for (let index = 0; index < Bun.argv.length; index += 1) {
		if (Bun.argv[index] === flag && Bun.argv[index + 1] !== undefined) {
			values.push(Bun.argv[index + 1] as string);
		}
	}
	return values;
}

function printEvent(event: ChatEvent): void {
	if (event.type === "run.state") {
		process.stdout.write(`  [estado] ${fieldOf(event.payload, "status")}\n`);
	} else if (event.type === "assistant.delta") {
		process.stdout.write(fieldOf(event.payload, "value") ?? "");
	}
}

/** Exit 0 when every turn finished; 1 on a protocol problem, failure or timeout. */
async function main(): Promise<number> {
	const baseUrl = argumentValues("--url")[0] ?? "http://localhost:3000";
	const actorId = argumentValues("--actor")[0] ?? "demo-customer-1";
	const origin = argumentValues("--origin")[0] ?? "http://localhost:3001";
	const timeoutMs = Number(
		argumentValues("--timeout")[0] ?? DEFAULT_TIMEOUT_MS,
	);
	try {
		assertLocalUrl(baseUrl, Bun.argv.includes("--allow-remote"));
		const chat = await openChat({
			baseUrl,
			actorId,
			origin,
			timeoutMs,
			onEvent: printEvent,
		});
		const messages = argumentValues("--message");
		const lines =
			messages.length > 0
				? messages
				: (async function* () {
						const reader = createInterface({
							input: process.stdin,
							output: process.stdout,
						});
						process.stdout.write(
							"Escribe un mensaje ('/salir' para terminar).\n",
						);
						for (;;) {
							const line = (await reader.question("> ")).trim();
							if (line === "/salir" || line === "") break;
							yield line;
						}
						reader.close();
					})();
		let ok = true;
		for await (const message of lines as AsyncIterable<string> | string[]) {
			process.stdout.write(`\ntú: ${message}\nagente: `);
			const turn = await chat.send(message);
			if (turn.problem !== null || turn.status === "failed") ok = false;
			process.stdout.write(
				`\n  -> estado=${turn.status ?? "sin estado"} traceId=${turn.traceId ?? "-"}` +
					`${turn.reasonCode === null ? "" : ` motivo=${turn.reasonCode}`}` +
					`${turn.problem === null ? "" : ` problema=${turn.problem}`}\n`,
			);
		}
		chat.close();
		return ok ? 0 : 1;
	} catch (error) {
		const message = error instanceof Error ? error.message : "chat_error";
		process.stderr.write(
			`${/^chat_[a-z_]+(:[A-Za-z0-9.:_[\]-]+)?$/.test(message) ? message : "chat_error"}\n`,
		);
		return 1;
	}
}

if (import.meta.main) {
	process.exitCode = await main();
}
