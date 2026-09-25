import { createClient } from "redis";
import "dotenv/config";

export const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err: Error) => console.log("❌ Redis Search Service Error:", err.message));
redisClient.on("connect", () => console.log("Connected to Redis for Search Service..."));

export const connectRedis = async (): Promise<void> => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log("✅ Redis connected for Search Service");
        }
    } catch (error) {
        console.error("Redis Connection Failed:", error);
    }
};
