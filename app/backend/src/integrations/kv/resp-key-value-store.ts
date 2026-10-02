import { createClient } from "redis";
import type {
	KeyValueStore,
	KeyValueStoreFactory,
	KvConnectionConfig,
} from "./key-value-store.js";

type RespClient = ReturnType<typeof createClient>;

export class RespKeyValueStore implements KeyValueStore {
	constructor(private readonly client: RespClient) {}

	async hashSet(key: string, values: Record<string, string>): Promise<void> {
		await this.client.hSet(key, values);
	}

	hashGetAll(key: string): Promise<Record<string, string>> {
		return this.client.hGetAll(key);
	}

	async expire(key: string, seconds: number): Promise<void> {
		await this.client.expire(key, seconds);
	}

	async delete(key: string): Promise<boolean> {
		return (await this.client.del(key)) > 0;
	}

	async setIfAbsent(
		key: string,
		value: string,
		ttlSeconds: number,
	): Promise<boolean> {
		const result = await this.client.set(key, value, {
			expiration: { type: "EX", value: ttlSeconds },
			condition: "NX",
		});
		return result === "OK";
	}

	getAndDelete(key: string): Promise<string | null> {
		return this.client.getDel(key);
	}

	isReady(): boolean {
		return this.client.isReady;
	}

	async close(): Promise<void> {
		if (this.client.isOpen) {
			await this.client.quit();
		}
	}
}

/**
 * RESP is shared by Valkey and Redis. The provider discriminator remains in
 * configuration so a provider-specific driver can be introduced later.
 */
export class RespKeyValueStoreFactory implements KeyValueStoreFactory {
	async connect(config: KvConnectionConfig): Promise<KeyValueStore> {
		if (config.url.length === 0) {
			throw new Error("KV_URL is required to create a key-value client");
		}

		const client = createClient({
			url: config.url,
			...(config.username.length > 0 ? { username: config.username } : {}),
			...(config.password.length > 0 ? { password: config.password } : {}),
			...(config.tls ? { socket: { tls: true as const } } : {}),
		});
		client.on("error", () => {
			// The application owns logging and must redact connection details.
		});

		try {
			await client.connect();
		} catch (error) {
			if (client.isOpen) {
				await client.quit();
			}
			throw error;
		}

		return new RespKeyValueStore(client);
	}
}
