import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
});

redis.on("connect", () => console.log("✅ Engagement Service connected to Redis"));
redis.on("error", (err: Error) => console.error("❌ Engagement Redis Error:", err.message));
