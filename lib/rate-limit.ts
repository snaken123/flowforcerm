import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// Sliding window limiters — instantiated lazily so missing env vars don't crash on import
let loginLimiter: Ratelimit | null = null;
let resetPasswordLimiter: Ratelimit | null = null;

export function getLoginLimiter(): Ratelimit {
  if (!loginLimiter) {
    loginLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:login",
    });
  }
  return loginLimiter;
}

export function getResetPasswordLimiter(): Ratelimit {
  if (!resetPasswordLimiter) {
    resetPasswordLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "rl:reset-pw",
    });
  }
  return resetPasswordLimiter;
}

/** Extract client IP from Next.js request headers */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Legacy in-memory limiter kept for any non-critical routes that don't justify Redis.
 * Resets on server restart — adequate for Vercel warm instances, not a security guarantee.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const store = new Map<string, RateLimitEntry>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
