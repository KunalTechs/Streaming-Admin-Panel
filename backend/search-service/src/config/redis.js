import {createClient} from 'redis';
import 'dotenv/config';

export const redisClient = createClient({
 // Sentinel configuration for HA
    sentinels: [
        {
           host: process.env.REDIS_SENTINEL_HOST,
           port: parseInt(process.env.REDIS_SENTINEL_PORT),
        }
    ],
    name: 'mymaster',
});

redisClient.on('error',(err) => console.log('❌ Redis Sentinel Error:',err));
redisClient.on('connect', () => console.log('Connected to Sentinel...'));
redisClient.on('ready', () => console.log('Redis Master is Ready via Sentinel 🚀'));

export const connectRedis = async () => {
    try {
        redisClient.connect();
           console.log("Redis Stack HA Connect");
    } catch (error) {
        console.error("Redis Connection Failed:", error) 
    }
}

