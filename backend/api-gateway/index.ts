import express, { Request, Response, NextFunction } from "express";
import 'dotenv/config';
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import { 
    createRateLimitMiddleware, 
    authLimiter, 
    uploadLimiter, 
    searchLimiter, 
    heartbeatLimiter 
} from "./src/middleware/rateLimiter.js";
import { getDeepHealth } from "./src/controllers/health.controller.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Security and Logging Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// --- DISTRIBUTED REQUEST TRACING (Correlation IDs) ---
app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || uuidv4();
    req.headers["x-correlation-id"] = correlationId;
    res.setHeader("X-Correlation-ID", correlationId);
    next();
});

// --- RATE LIMITERS (Centralized Redis Backed) ---
// Tier 1: Auth (Brute force protection: 5 reqs / 15 min per IP)
app.use('/api/auth/login', createRateLimitMiddleware(authLimiter, (req) => req.ip || "127.0.0.1"));

// Tier 2: Ingestion / Upload (Prevent worker queue saturation: 3 uploads / hr per Admin)
app.use('/api/videos/upload', createRateLimitMiddleware(uploadLimiter, (req) => req.user?.id || req.ip || "127.0.0.1"));

// Tier 3: Search (Elasticsearch memory protection: 30 reqs / min per IP/User)
app.use('/api/search', createRateLimitMiddleware(searchLimiter, (req) => req.user?.id || req.ip || "127.0.0.1"));

// Tier 4: Playback Heartbeats (1 pulse / 4s per userId+videoId)
app.use('/api/engagement/progress', createRateLimitMiddleware(heartbeatLimiter, (req) => `${req.user?.id || req.ip || "127.0.0.1"}:${req.body?.videoId || 'global'}`));

// --- PROXY ROUTES ---

// 1. Admin Auth Service
app.use('/api/auth', createProxyMiddleware({
    target: process.env.ADMIN_AUTH_SERVICE,
    changeOrigin: true
}));

// 2. Video Service
app.use('/api/videos', createProxyMiddleware({
    target: process.env.VIDEO_SERVICE,
    changeOrigin: true
}));

// 3. Category Service
app.use('/api/categories', createProxyMiddleware({
    target: process.env.CATEGORY_SERVICE,
    changeOrigin: true
}));

// 4. File Service
app.use('/api/files', createProxyMiddleware({
    target: process.env.FILE_SERVICE,
    changeOrigin: true
}));

// 5. Search Service
app.use('/api/search', createProxyMiddleware({
    target: process.env.SEARCH_SERVICE,
    changeOrigin: true
}));

// 6. Engagement Service
app.use('/api/engagement', createProxyMiddleware({
    target: process.env.ENGAGEMENT_SERVICE || "http://localhost:5006",
    changeOrigin: true
}));

app.get('/', (req: Request, res: Response) => res.send('API Gateway is live'));
app.get('/health/deep', getDeepHealth);

app.listen(PORT, () => {
    console.log(`API gateway is running on http://localhost:${PORT}`);
});
