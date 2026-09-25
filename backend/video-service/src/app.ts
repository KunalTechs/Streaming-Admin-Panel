import express, { Request, Response } from "express";
import cors from "cors";
import videoRoutes from "./routes/videoRoutes.js";
import cookieParser from 'cookie-parser';
import client from "prom-client";

const app = express();

// Initialize Prometheus Default Metrics
client.collectDefaultMetrics({ register: client.register });

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.get("/metrics", async (req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.use("/api/videos", videoRoutes);

export default app;
