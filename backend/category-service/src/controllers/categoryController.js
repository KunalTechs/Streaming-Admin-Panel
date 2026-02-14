import prisma from "../config/prisma";
import slugify from "slugify";
import { emitCategoryEvent } from "../events/category.producer";

// 1. Get All
export const getallCategories = async(resizeBy, req) =>{
    try {
        const categories = await prisma.category.findMany({
            orderBy:{name:'asc'}
        })
        res.json({success: true, categories})
        
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

        // Tell Video Service to clean up its links!
        await emitCategoryEvent("CATEGORY_DELETED", {id});
        res.json({success: true, message: "Category deleted successfully"});
    } catch (error) {
        res.status(400).json({success: false, message: error.message})
    }
}