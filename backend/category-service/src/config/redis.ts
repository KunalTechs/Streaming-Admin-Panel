import { createClient } from 'redis';

const redisClient = createClient({
    // Sentinel configuration for HA
    sentinels: [
        {
           host: process.env.REDIS_SENTINEL_HOST || "localhost",
           port: parseInt(process.env.REDIS_SENTINEL_PORT || "26379", 10),
        }
    ],
    name: 'mymaster',
} as any);

redisClient.on('error', (err) => console.log('❌ Redis Sentinel Error:', err));
redisClient.on('connect', () => console.log('Connected to Sentinel...'));
redisClient.on('ready', () => console.log('Redis Master is Ready via Sentinel 🚀'));

export const connectRedis = async (): Promise<void> => {
    try {
        await redisClient.connect();
        console.log("Redis Stack HA Connect");
    } catch (err) {
        console.error("Redis Connection Failed:", err);
    }
};

export default redisClient;
