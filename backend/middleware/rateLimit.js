// Lightweight in-memory rate limiter — no external dependency.
// Suitable for a single-instance deployment. For multi-instance, swap for a
// shared store (Redis). Buckets are keyed by client IP + a route label.

function createRateLimiter({ windowMs = 60_000, max = 60, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  // Periodically purge expired buckets so the map can't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (val.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  if (sweep.unref) sweep.unref();

  return function rateLimit(req, res, next) {
    // Key on the real TCP connection IP, NOT req.ip — req.ip is derived from the
    // client-supplied X-Forwarded-For when `trust proxy` is on, so an attacker
    // could rotate that header to get a fresh bucket on every request.
    const ip = req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl || ''}${req.path || ''}`;
    const now = Date.now();
    let bucket = hits.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

module.exports = createRateLimiter;
