import express from "express";
import multer from "multer";
import path from "path";
import {uploadVideo} from "../controllers/videoController.js";

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: "uploads/videos/",
    filename: (req,file,cb) =>{
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({storage});

router.post("/upload", upload.single("video"), uploadVideo);
export default router;


