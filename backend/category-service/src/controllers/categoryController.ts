import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import redisClient from "../config/redis.js";
import _slugify from "slugify";
const slugify = _slugify as any;
import { emitCategoryEvent } from "../events/category.producer.js";

const CACHE_KEY = "categories:all";

// 1. Get All
export const getallCategories = async (req: Request, res: Response): Promise<any> => {
    try {
        // Check Redis Cache
        if (redisClient && redisClient.isOpen) {
            const cachedCategories = await redisClient.get(CACHE_KEY);
            if (cachedCategories) {
                console.log("Serving from Redis Cache");
                return res.json({
                    success: true,
                    categories: JSON.parse(cachedCategories),
                    source: "cache"
                });   
            }
        }

        // If not in cache, fetch from MySQL
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });

        // Save to Redis (Expire in 1 hour / 3600 seconds)
        if (redisClient && redisClient.isOpen) {
            await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(categories));
        }
        res.json({ success: true, categories, source: "database" });
        
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Create New
export const createCategory = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, description } = req.body;
        const slug = slugify(name, { lower: true, strict: true });

        const category = await prisma.category.create({
            data: { name, slug, description }
        });

        // Delete cache because new data exists
        if (redisClient && redisClient.isOpen) {
            await redisClient.del(CACHE_KEY);
        }

        await emitCategoryEvent("category-events", { event: "CATEGORY_CREATED", type: "CATEGORY_CREATED", data: category });
        res.status(201).json({ success: true, category });
        
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;

        await prisma.category.delete({ where: { id } });

        // Delete cache because data is removed
        if (redisClient && redisClient.isOpen) {
            await redisClient.del(CACHE_KEY);
        }

        // Tell Video Service to clean up its links!
        await emitCategoryEvent("category-events", { event: "CATEGORY_DELETED", type: "CATEGORY_DELETED", data: { id } });
        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;
        const { name, description } = req.body;

        const updateData: any = { name, description };
        if (name) {
            updateData.slug = slugify(name, { lower: true, strict: true });
        }

        const updatedCategory = await prisma.category.update({
            where: { id },
            data: updateData
        });

        // Invalidate Redis Cache
        if (redisClient && redisClient.isOpen) {
            await redisClient.del(CACHE_KEY);
        }

        // Notify other services via Kafka
        await emitCategoryEvent("category-events", { event: "CATEGORY_UPDATED", type: "CATEGORY_UPDATED", data: updatedCategory });

        res.json({ success: true, category: updatedCategory });
        
    } catch (error: any) {
       res.status(400).json({ success: false, message: error.message });
    }
};
