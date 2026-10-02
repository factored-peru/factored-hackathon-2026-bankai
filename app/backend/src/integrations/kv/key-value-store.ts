export const kvProviders = ["valkey", "redis"] as const;

export type KvProvider = (typeof kvProviders)[number];

export type KvConnectionConfig = Readonly<{
	provider: KvProvider;
	url: string;
	username: string;
	password: string;
	tls: boolean;
}>;

/**
 * Provider-neutral coordination primitives used by session infrastructure.
 * Keep provider command names and client types behind an adapter.
 */
export interface KeyValueStore {
	hashSet(key: string, values: Record<string, string>): Promise<void>;
	hashGetAll(key: string): Promise<Record<string, string>>;
	expire(key: string, seconds: number): Promise<void>;
	delete(key: string): Promise<boolean>;
	setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
	getAndDelete(key: string): Promise<string | null>;
	isReady(): boolean;
	close(): Promise<void>;
}

export interface KeyValueStoreFactory {
	connect(config: KvConnectionConfig): Promise<KeyValueStore>;
}
