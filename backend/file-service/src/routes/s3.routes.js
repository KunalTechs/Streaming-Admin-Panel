import express from "express";
import { deleteVideoFromS3, generatePresignedUrl } from "../controllers/s3.controller.js";
import { isAdmin, verifyToken } from "../middleware/fileservice.authmiddleware.js";

const router = express.Router();

router.post("/generate-presigned-url",verifyToken,isAdmin,generatePresignedUrl);
router.delete("/delete-files",verifyToken,isAdmin, deleteVideoFromS3);

export default router;