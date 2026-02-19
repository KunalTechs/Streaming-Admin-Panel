import prisma from "../config/prisma";
import redisClient from "../config/redis.js";
import slugify from "slugify";
import { emitCategoryEvent } from "../events/category.producer";

const CACHE_KEY = "categories:all";

// 1. Get All
export const getallCategories = async(resizeBy, req) =>{
    try {
        // Check Redis Cache
        const cachedCategories = await redisClient.get(CACHE_KEY);

        if(cachedCategories){
            console.log(" Serving from Redis Cache");
            return res.json({
                success: true,
                categories: JSON.parse(cachedCategories),
                source: "cache"
            });   
        }

        // If not in cache, fetch from MySQL
        const categories = await prisma.category.findMany({
            orderBy:{name:'asc'}
        });

        // Save to Redis (Expire in 1 hour / 3600 seconds)
        await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(categories));
        res.json({success: true, categories, source: "database"})
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message});
        
    }
};

// 2. Create New
export const createCategory = async (req, res) =>{
    try {
        const {name , description} = req.body;
        const slug = slugify(name, {lower:true, strict: true});

        const category = await prisma.category.create({
            data: {name, slug, description}
        })

        // Delete cache because new data exists
        await redisClient.del(CACHE_KEY);

        await emitCategoryEvent("CATEGORY_CREATED", category);
        res.status(201).json({success: true, category});
        
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export const deleteCategory = async (req, res) =>{
    try {
        const {id} = req.params;

        await prisma.category.delete({where: {id}});

        // Delete cache because data is removed
        await redisClient.del(CACHE_KEY);

        // Tell Video Service to clean up its links!
        await emitCategoryEvent("CATEGORY_DELETED", {id});
        res.json({success: true, message: "Category deleted successfully"});
    } catch (error) {
        res.status(400).json({success: false, message: error.message})
    }
}

export const updateCategory = async (req,res) =>{
    try {
        const {id} =  req.params;
        const {name, description} = req.body;

        const updateData =  {name, description};
        if (name) {
            updateData.slug = slugify(name, {lower: true, strict: true});
        }

        const updatedCategory = await prisma.category.update({
            where: {id},
            data: updateData
        });

        //Invalidate Redis Cache
        await redisClient.del(CACHE_KEY);

        //Notify other services via Kafka
        await emitCategoryEvent("CATEGORY_UPDATED", updatedCategory);

        res.json({success: true, catgeory: updateCategory});
        
    } catch (error) {
       res.status(400).json({success: false, message: error.message})
    }
}