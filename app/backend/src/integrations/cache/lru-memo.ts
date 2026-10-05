/**
 * Process-local LRU memoization (functools.lru_cache equivalent).
 * Use only inside integration adapters — never in the control plane.
 */

export type LruMemoOptions<TArgs extends unknown[]> = {
	maxEntries: number;
	ttlMs?: number;
	keyFn: (...args: TArgs) => string;
};

export type LruMemo<TArgs extends unknown[], TResult> = {
	get(...args: TArgs): Promise<TResult>;
	invalidate(...args: TArgs): void;
	clear(): void;
	size(): number;
};

type Entry<T> = {
	value: T;
	expiresAt: number | null;
};

export function withLruCache<TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => Promise<TResult>,
	options: LruMemoOptions<TArgs>,
): LruMemo<TArgs, TResult> {
	const cache = new Map<string, Entry<TResult>>();

	return {
		async get(...args: TArgs): Promise<TResult> {
			const key = options.keyFn(...args);
			const hit = cache.get(key);
			if (hit) {
				if (hit.expiresAt === null || hit.expiresAt > Date.now()) {
					cache.delete(key);
					cache.set(key, hit);
					return hit.value;
				}
				cache.delete(key);
			}
			const value = await fn(...args);
			cache.set(key, {
				value,
				expiresAt:
					options.ttlMs === undefined ? null : Date.now() + options.ttlMs,
			});
			while (cache.size > options.maxEntries) {
				const oldest = cache.keys().next().value;
				if (oldest === undefined) break;
				cache.delete(oldest);
			}
			return value;
		},
		invalidate(...args: TArgs): void {
			cache.delete(options.keyFn(...args));
		},
		clear(): void {
			cache.clear();
		},
		size(): number {
			return cache.size;
		},
	};
}
