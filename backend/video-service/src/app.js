import express from "express";
import cors from "cors";
import videoRoutes from "./routes/videoRoutes.js";
import cookieParser from 'cookie-parser';


const app = express();

app.use(express.json());
app.use(cors());

app.use(cookieParser());

app.use("/api/videos", videoRoutes);

export default app;