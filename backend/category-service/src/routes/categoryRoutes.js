import express from 'express';
import { createCategory, deleteCategory, getallCategories, updateCategory } from '../controllers/categoryController';
import { isAdmin, verifyToken } from '../middlewares/authMiddleware';


const router = express.Router;

router.get("/", getallCategories);

//PROTECTED ROUTES

router.post("/create", verifyToken, isAdmin, createCategory);
router.post("/delete/:id", verifyToken,isAdmin,deleteCategory);
router.post("/update/:id", verifyToken, isAdmin, updateCategory);

export default router;


