interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitInfo {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitInfo> = new Map();

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if request can be made
   */
  canMakeRequest(key: string = 'default'): boolean {
    const now = Date.now();
    const info = this.limits.get(key) || { requests: [], blocked: false };

    // Check if currently blocked
    if (info.blocked && info.blockedUntil && now < info.blockedUntil) {
      return false;
    }

    // Remove expired requests
    const windowStart = now - this.config.windowMs;
    info.requests = info.requests.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (info.requests.length >= this.config.maxRequests) {
      info.blocked = true;
      info.blockedUntil = now + this.config.windowMs;
      this.limits.set(key, info);
      return false;
    }

    // Reset block if window has passed
    if (info.blocked && info.blockedUntil && now >= info.blockedUntil) {
      info.blocked = false;
      info.blockedUntil = undefined;
    }

    this.limits.set(key, info);
    return true;
  }

  /**
   * Record a request
   */
  recordRequest(key: string = 'default'): void {
    const now = Date.now();
    const info = this.limits.get(key) || { requests: [], blocked: false };

    info.requests.push(now);
    this.limits.set(key, info);
  }

  /**
   * Get remaining requests
   */
  getRemainingRequests(key: string = 'default'): number {
    const now = Date.now();
    const info = this.limits.get(key) || { requests: [], blocked: false };

    // Remove expired requests
    const windowStart = now - this.config.windowMs;
    info.requests = info.requests.filter((time) => time > windowStart);

    return Math.max(0, this.config.maxRequests - info.requests.length);
  }

  /**
   * Get time until reset
   */
  getResetTime(key: string = 'default'): number {
    const info = this.limits.get(key);

    if (!info || info.requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...info.requests);
    const resetTime = oldestRequest + this.config.windowMs;
    const now = Date.now();

    return Math.max(0, resetTime - now);
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string = 'default'): void {
    this.limits.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.limits.clear();
  }
}

// Pre-configured rate limiters
import { RATE_LIMITS } from './config';

export const authRateLimiter = new RateLimiter(RATE_LIMITS.auth);
export const aiRateLimiter = new RateLimiter(RATE_LIMITS.ai);
export const generalRateLimiter = new RateLimiter(RATE_LIMITS.general);
