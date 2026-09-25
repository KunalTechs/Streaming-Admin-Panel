import express from 'express';
import { createCategory, deleteCategory, getallCategories, updateCategory } from '../controllers/categoryController.js';
import { isAdmin, verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get("/", getallCategories);

// PROTECTED ROUTES
router.post("/create", verifyToken, isAdmin, createCategory);
router.delete("/delete/:id", verifyToken, isAdmin, deleteCategory);
router.put("/update/:id", verifyToken, isAdmin, updateCategory);

export default router;
