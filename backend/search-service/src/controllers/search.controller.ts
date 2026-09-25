import { Request, Response } from "express";
import { redisClient } from "../config/redis.js";
import { executeSearch } from "../services/search.service.js";

export const getSearchResults = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const q = req.query.q as string | undefined;
        const category = req.query.category as string | undefined;

        if (!q) return res.status(400).json({ message: "Search Query is Required" });

        const cacheKey = `search:${q.trim().toLowerCase()}:${category || "all"}`;

        if (redisClient && redisClient.isOpen) {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log("Serving search results from Redis Cache");
                return res.json(JSON.parse(cachedData));
            }
        }

        const results = await executeSearch(q, { category });

        if (results && results.length > 0 && redisClient && redisClient.isOpen) {
            await redisClient.setEx(cacheKey, 1200, JSON.stringify(results));
        }

        return res.json(results);
    } catch (error) {
        console.error("Search Controller Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
