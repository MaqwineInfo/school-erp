/**
 * A small in-memory cache with per-namespace version stamping.
 *
 * Architecture §7.4. The previous RBAC cache used a 5-minute TTL with NO invalidation
 * path, so revoking a permission left users on stale permissions for up to five minutes.
 * Bumping a namespace version invalidates every entry in it immediately.
 *
 * Interface-compatible with a Redis-backed implementation for later.
 */
class VersionedCache {
  constructor({ ttlMs = 5 * 60 * 1000, maxEntries = 10000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
    this.versions = new Map();
  }

  #version(namespace) {
    return this.versions.get(namespace) ?? 0;
  }

  #key(namespace, key) {
    return `${namespace}::${key}`;
  }

  get(namespace, key) {
    const entry = this.store.get(this.#key(namespace, key));
    if (!entry) return undefined;

    if (entry.version !== this.#version(namespace)) {
      this.store.delete(this.#key(namespace, key));
      return undefined;
    }
    if (Date.now() - entry.at > this.ttlMs) {
      this.store.delete(this.#key(namespace, key));
      return undefined;
    }
    return entry.value;
  }

  set(namespace, key, value) {
    if (this.store.size >= this.maxEntries) {
      // Cheap eviction: drop the oldest inserted key.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(this.#key(namespace, key), {
      value,
      at: Date.now(),
      version: this.#version(namespace),
    });
    return value;
  }

  async wrap(namespace, key, producer) {
    const hit = this.get(namespace, key);
    if (hit !== undefined) return hit;
    const value = await producer();
    return this.set(namespace, key, value);
  }

  /** Invalidate an entire namespace instantly (e.g. one tenant's RBAC). */
  bump(namespace) {
    this.versions.set(namespace, this.#version(namespace) + 1);
  }

  invalidate(namespace, key) {
    this.store.delete(this.#key(namespace, key));
  }

  clear() {
    this.store.clear();
    this.versions.clear();
  }

  get size() {
    return this.store.size;
  }
}

/** Shared instances. */
const rbacCache = new VersionedCache({ ttlMs: 5 * 60 * 1000 });
const tenantCache = new VersionedCache({ ttlMs: 60 * 1000 });

module.exports = { VersionedCache, rbacCache, tenantCache };
