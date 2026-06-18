/**
 * In-memory request deduplication utility.
 *
 * Prevents duplicate database rows when a user double-clicks a submit button
 * and two identical requests arrive within milliseconds of each other
 * (a classic TOCTOU race condition that a database "find then create" check
 * cannot reliably prevent).
 *
 * How it works:
 *  - `withDedup(key, fn)` stores the in-flight Promise in a module-level Map
 *    SYNCHRONOUSLY before `fn` is awaited.
 *  - Because Node.js is single-threaded, a concurrent request with the same key
 *    will find the stored Promise and await the SAME result instead of running
 *    `fn` again.
 *  - Entries auto-expire after 60 seconds so late duplicate clicks also return
 *    the original result, and the Map doesn't grow unbounded.
 *
 * Note: This protects against concurrent duplicates within a single server
 * instance (works in dev and warm serverless functions). For cross-instance
 * safety on serverless, combine with a database unique constraint if needed.
 */

const inflight = new Map<string, Promise<unknown>>()
const DEDUP_TTL_MS = 60_000

export async function withDedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = fn()
  // CRITICAL: set synchronously BEFORE any await so concurrent requests find it.
  inflight.set(key, promise)

  // Auto-cleanup after the TTL window.
  setTimeout(() => {
    inflight.delete(key)
  }, DEDUP_TTL_MS)

  try {
    return await promise
  } catch (error) {
    // On failure, remove immediately so a retry can run fresh.
    inflight.delete(key)
    throw error
  }
}

/**
 * Build a stable dedup key from a prefix + the request body.
 * The body is stringified with sorted keys for stable ordering.
 */
export function dedupKey(prefix: string, data: unknown): string {
  return `${prefix}:${JSON.stringify(sortKeys(data))}`
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sortKeys)
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(value as object).sort()) {
    sorted[k] = sortKeys((value as Record<string, unknown>)[k])
  }
  return sorted
}
