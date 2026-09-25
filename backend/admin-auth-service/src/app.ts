import express, { Express, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";

const app: Express = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", service: "admin-auth-service" });
});

export default app;
