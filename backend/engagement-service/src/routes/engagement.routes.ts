import express, { Router } from "express";
import { trackProgress, getResumeProgress } from "../controllers/engagement.controller.js";

const router: Router = express.Router();

router.post("/progress", trackProgress);
router.get("/resume/:userId/:videoId", getResumeProgress);

export default router;
