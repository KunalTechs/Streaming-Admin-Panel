import express, { Router } from "express";
import { 
    handleDeleteFiles, 
    generatePresignedUrl,
    initiateMultipartUpload,
    getMultipartPresignedUrl,
    completeMultipartUpload,
    abortMultipartUpload,
    generateSignedHlsUrl
} from "../controllers/s3.controller.js";
import { isAdmin, verifyToken } from "../middleware/fileservice.authmiddleware.js";

const router: Router = express.Router();

router.post("/generate-presigned-url", verifyToken, isAdmin, generatePresignedUrl);
router.post("/multipart/initiate", verifyToken, isAdmin, initiateMultipartUpload);
router.post("/multipart/presigned-url", verifyToken, isAdmin, getMultipartPresignedUrl);
router.post("/multipart/complete", verifyToken, isAdmin, completeMultipartUpload);
router.post("/multipart/abort", verifyToken, isAdmin, abortMultipartUpload);
router.post("/signed-url", verifyToken, generateSignedHlsUrl);

router.delete("/delete-files", verifyToken, isAdmin, handleDeleteFiles);

export default router;
