export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface LruCacheOptions {
  maxEntries: number;
  ttlMs: number;
}

/**
 * Tiny LRU cache with TTL support used to shield upstream API.
 */
export class LruCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly options: LruCacheOptions) {}

  get(key: string): T | undefined {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.store.get(normalizedKey);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(normalizedKey);
      return undefined;
    }

    // Maintain recency ordering by re-inserting entry.
    this.store.delete(normalizedKey);
    this.store.set(normalizedKey, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const normalizedKey = this.normalizeKey(key);

    if (this.store.has(normalizedKey)) {
      this.store.delete(normalizedKey);
    } else if (this.store.size >= this.options.maxEntries) {
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) {
        this.store.delete(lruKey);
      }
    }

    this.store.set(normalizedKey, {
      value,
      expiresAt: Date.now() + this.options.ttlMs,
    });
  }

  private normalizeKey(key: string): string {
    return key.trim().toLowerCase();
  }
}

