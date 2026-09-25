import express, { Router } from "express";
import { getSearchResults } from "../controllers/search.controller.js";
import { searchLimiter } from "../middleware/rateLimiter.middleware.js";

const router: Router = express.Router();

router.get("/", searchLimiter, getSearchResults);

export default router;
