import express from 'express';
import { getSearchResults } from '../controllers/search.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { searchLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

router.get('/', verifyToken,searchLimiter, getSearchResults);

export default router;