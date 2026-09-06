/**
 * Minimal fixed-window rate limiter for socket events (in-memory, per key).
 * Not distributed — adequate for a single-node classroom server.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

/** Periodically drop expired buckets so the map does not grow unbounded. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref();
