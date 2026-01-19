import express from "express";
import multer from "multer";
import path from "path";
import {deleteVideo, updateVideo, uploadVideo} from "../controllers/videoController.js";
import { verifyToken } from "../middleware/verifyToken.js";


const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: "uploads/videos/",
    filename: (req,file,cb) =>{
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({storage});

//for video upload
router.post("/upload",verifyToken, upload.single("video"), uploadVideo);

//for delete video
router.delete('/:id',verifyToken, deleteVideo);

//for update video
router.put('/:id',verifyToken, updateVideo);
export default router;


