import http from "http";
import { Redis } from "ioredis";
import dotenv from "dotenv";
import { Request, Response } from "express";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  commandTimeout: 1000,
});

const checkPing = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      if (res.statusCode && res.statusCode < 500) resolve("HEALTHY");
      else resolve("UNHEALTHY");
    });
    req.on("error", () => resolve("DOWN"));
    req.on("timeout", () => {
      req.destroy();
      resolve("TIMEOUT");
    });
  });
};

export const getDeepHealth = async (req: Request, res: Response): Promise<void> => {
  const checks: Record<string, string> = {};
  let overallHealthy = true;

  // 1. Check Redis
  try {
    if (redisClient.status !== "ready") {
      await redisClient.connect().catch(() => {});
    }
    const pingRes = await redisClient.ping();
    checks.redis = pingRes === "PONG" ? "HEALTHY" : "UNHEALTHY";
  } catch (err) {
    checks.redis = "DOWN";
    overallHealthy = false;
  }

  // 2. Check Elasticsearch
  const esUrl = `http://${process.env.ELASTICSEARCH_HOST || "localhost"}:${process.env.ELASTICSEARCH_PORT || "9200"}/_cluster/health`;
  checks.elasticsearch = await checkPing(esUrl);

  // 3. Check MinIO S3
  const minioUrl = process.env.MINIO_HEALTH_URL || "http://localhost:9000/minio/health/live";
  checks.minio = await checkPing(minioUrl);

  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: overallHealthy ? "HEALTHY" : "DEGRADED",
    timestamp: new Date().toISOString(),
    checks,
  });
};
