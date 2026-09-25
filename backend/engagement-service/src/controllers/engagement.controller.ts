import { Request, Response } from "express";
import { redis } from "../config/redis.js";
import { producer } from "../config/kafka.js";
import { dbPool } from "../config/db.js";
import { RowDataPacket } from "mysql2";

export interface ProgressTrackRequestBody {
    userId: string;
    videoId: string;
    seconds: number;
}

export const trackProgress = async (req: Request<{}, {}, ProgressTrackRequestBody>, res: Response): Promise<Response | void> => {
    try {
        const { userId, videoId, seconds } = req.body;
        if (!userId || !videoId || seconds === undefined) {
            return res.status(400).json({ error: "userId, videoId, and seconds are required" });
        }

        const redisKey = `user:${userId}:resume:${videoId}`;
        const ttlSeconds = 2592000; // 30 days TTL

        // 1. Fast sub-1ms write to Redis
        await redis.set(redisKey, seconds.toString(), "EX", ttlSeconds);

        // 2. Fire lightweight async Kafka heartbeat event
        producer.send({
            topic: "playback-heartbeats",
            messages: [{
                key: `${userId}:${videoId}`,
                value: JSON.stringify({ userId, videoId, seconds: Number(seconds), timestamp: Date.now() })
            }]
        }).catch((err: Error) => console.error("Kafka Heartbeat Producer Error:", err.message));

        return res.status(200).json({ success: true, message: "Progress saved" });
    } catch (error) {
        console.error("Track Progress Error:", error);
        return res.status(500).json({ error: "Failed to track progress" });
    }
};

export const getResumeProgress = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { userId, videoId } = req.params;
        if (!userId || !videoId) {
            return res.status(400).json({ error: "userId and videoId are required" });
        }

        const redisKey = `user:${userId}:resume:${videoId}`;

        // 1. Try Redis first
        const cachedSeconds = await redis.get(redisKey);
        if (cachedSeconds !== null) {
            return res.status(200).json({ source: "redis", seconds: parseInt(cachedSeconds, 10) });
        }

        // 2. Fallback to MySQL DB
        const [rows] = await dbPool.query<RowDataPacket[]>(
            "SELECT progress_seconds FROM video_progress WHERE user_id = ? AND video_id = ?",
            [userId, videoId]
        );

        if (rows.length > 0) {
            const dbSeconds = rows[0].progress_seconds;
            await redis.set(redisKey, dbSeconds.toString(), "EX", 2592000);
            return res.status(200).json({ source: "mysql", seconds: dbSeconds });
        }

        return res.status(200).json({ source: "none", seconds: 0 });
    } catch (error) {
        console.error("Get Resume Progress Error:", error);
        return res.status(500).json({ error: "Failed to fetch progress" });
    }
};
