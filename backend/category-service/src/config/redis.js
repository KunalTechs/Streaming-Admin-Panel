import { createClient } from 'redis';

const redisClient = createClient({
 // Sentinel configuration for HA
    rootNodes: [
        {
            url: process.env.REDIS_URL // The Sentinel port from your docker-compose
        }
    ],
    name: 'mymaster',
});

redisClient.on('error', (err) => console.log('❌ Redis Sentinel Error:', err));
redisClient.on('connect', () => console.log('Connected to Sentinel...'));
redisClient.on('ready', () => console.log('Redis Master is Ready via Sentinel 🚀'));

export const connectRedis = async () =>{
    try {
        await redisClient.connect();
        console.log("Redis Stack HA Connect");
    } catch (err){
        console.error("Redis Connection Failed:", err)

    }
}

export default redisClient;