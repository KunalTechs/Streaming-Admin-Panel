import { consumer } from "../config/kafka.js";
import { dbPool } from "../config/db.js";

export interface HeartbeatPayload {
    userId: string;
    videoId: string;
    seconds: number;
    timestamp?: number;
}

const heartbeatBuffer = new Map<string, HeartbeatPayload>();
let isFlushing = false;

export const startBatchWriterWorker = async (): Promise<void> => {
    await consumer.connect();
    await consumer.subscribe({ topic: "playback-heartbeats", fromBeginning: false });

    console.log("📥 Engagement Batch Writer Worker subscribed to playback-heartbeats...");

    setInterval(flushBufferToDB, 15000);

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                if (!message.value) return;
                const data: HeartbeatPayload = JSON.parse(message.value.toString());
                const key = `${data.userId}:${data.videoId}`;

                heartbeatBuffer.set(key, data);

                if (heartbeatBuffer.size >= 100) {
                    await flushBufferToDB();
                }
            } catch (err) {
                const error = err as Error;
                console.error("Batch Worker Error reading message:", error.message);
            }
        },
    });
};

const flushBufferToDB = async (): Promise<void> => {
    if (isFlushing || heartbeatBuffer.size === 0) return;
    isFlushing = true;

    const records = Array.from(heartbeatBuffer.values());
    heartbeatBuffer.clear();

    console.log(`💾 Flushing ${records.length} heartbeat records to MySQL in a single batch query...`);

    try {
        const valueTuples: string[] = [];
        const queryParams: (string | number)[] = [];

        for (const r of records) {
            valueTuples.push("(?, ?, ?)");
            queryParams.push(r.userId, r.videoId, r.seconds);
        }

        const sql = `
            INSERT INTO video_progress (user_id, video_id, progress_seconds)
            VALUES ${valueTuples.join(", ")}
            ON DUPLICATE KEY UPDATE 
                progress_seconds = VALUES(progress_seconds),
                updated_at = NOW();
        `;

        await dbPool.query(sql, queryParams);
        console.log(`✅ Bulk upsert completed successfully for ${records.length} video progress records.`);
    } catch (error) {
        const err = error as Error;
        console.error("❌ Bulk DB Upsert Error:", err.message);
        for (const r of records) {
            const key = `${r.userId}:${r.videoId}`;
            if (!heartbeatBuffer.has(key)) {
                heartbeatBuffer.set(key, r);
            }
        }
    } finally {
        isFlushing = false;
    }
};
