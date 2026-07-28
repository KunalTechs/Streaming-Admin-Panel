import { redisClient } from "../config/redis";
import { executeSearch } from "../services/search.service";


export const getSearchResults = async (req, res) => {
    try {
        const {q} = req.query;
        if(!q) return res.status(400).json({message: "Search Query is Required"});


            // IMPORTANT: We use 'search:' prefix so we don't mix with Category service data
            const cacheKey = `search:${q.trim().toLoweCase()}`;

            // 1. Try Chache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData){
                console.log(' Serving from Redis HA Cache');
                return res.json(JSON.parse(cachedData));
            }

            // 2. Hit Elasticsearch 
            const results =await executeSearch(q);

            //3. save to cache (1200 seconds/ 20 mins)
            if (results && results.lenght > 0) {
                await redisClient.setEx(cacheKey, 1200, JSON.stringify(results));
            }

            res.json(results);
    } catch (error) {
        console.error('Search Controller Error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
}; 