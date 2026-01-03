import express from "express"
import 'dotenv/config'
import { createProxyMiddleware } from "http-proxy-middleware"
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import 'dotenv/config';

const app =express();
const PORT = process.env.PORT;

// Security and Logging Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// --- PROXY ROUTES ---


// 1.Admin Auth Serivice
app.use('/api/auth',createProxyMiddleware({
    target:process.env.ADMIN_AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': '',
    },
}));

// 2.Video Service
app.use('/api/videos',createProxyMiddleware({
    target: process.env.VIDEO_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/videos': ''
    },
}));

// 3.Category Service
app.use('/api/categories',createProxyMiddleware({
    target:process.env.CATEGORY_SERVICE,
    changeOrigin:true,
    pathRewrite: {
        "^/api/categories": ''
    }
}));

app.get('/', (req,res)=> res.send('API Gateway is live'));

app.listen(PORT, ()=>{
    console.log(`API gateway is running on http://localhost:${PORT}`)
});