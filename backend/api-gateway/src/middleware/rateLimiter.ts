import { RateLimiterRedis } from "rate-limiter-flexible";
import { Redis } from "ioredis";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  enableOfflineQueue: false,
});

redisClient.on("connect", () => console.log("✅ API Gateway Rate Limiter connected to Redis"));
redisClient.on("error", (err) => console.error("❌ API Gateway Redis RateLimiter Error:", err.message));

// 1. Tier 1: Auth Limiter (Brute-Force Protection)
export const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl_auth",
  points: 5,               // 5 attempts
  duration: 15 * 60,       // per 15 minutes
  blockDuration: 15 * 60,  // Block for 15 minutes if consumed
});

// 2. Tier 2: Video Ingestion Limiter (Prevents Worker Queue Flooding)
export const uploadLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl_upload",
  points: 3,               // 3 video uploads
  duration: 60 * 60,       // per 1 hour
});

// 3. Tier 3: Search Engine Limiter (Elasticsearch Protection)
export const searchLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl_search",
  points: 30,              // 30 searches
  duration: 60,            // per 1 minute
});

// 4. Tier 4: Playback Progress Limiter (1 progress pulse per 4 seconds)
export const heartbeatLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl_heartbeat",
  points: 1,               // 1 heartbeat
  duration: 4,             // every 4 seconds
});

/**
 * Express Middleware Adapter with Standard RFC Rate-Limit Headers & Fail-Open Resilience
 */
export const createRateLimitMiddleware = (
  limiter: RateLimiterRedis, 
  keyGenerator?: (req: Request) => string
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || "127.0.0.1");

    try {
      const resRateLimit = await limiter.consume(key);

      // Standard RFC Rate Limit Headers
      res.setHeader("X-RateLimit-Limit", limiter.points);
      res.setHeader("X-RateLimit-Remaining", resRateLimit.remainingPoints);
      res.setHeader("X-RateLimit-Reset", new Date(Date.now() + resRateLimit.msBeforeNext).toISOString());

      next();
    } catch (rejRes: any) {
      if (rejRes instanceof Error) {
        // If Redis connection drops, fail open so legitimate traffic is not blocked
        console.error("Redis RateLimiter Error (Failing Open):", rejRes.message);
        return next();
      }

      const retryAfterSeconds = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.setHeader("Retry-After", retryAfterSeconds);
      res.setHeader("X-RateLimit-Remaining", 0);

      return res.status(429).json({
        success: false,
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please slow down.",
        retryAfterSeconds,
      });
    }
  };
};
