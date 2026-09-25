import express, { Express, Request, Response } from "express";
import cors from "cors";
import engagementRoutes from "./routes/engagement.routes.js";

const app: Express = express();

app.use(cors());
app.use(express.json());

app.use("/api/engagement", engagementRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", service: "engagement-service" });
});

export default app;
