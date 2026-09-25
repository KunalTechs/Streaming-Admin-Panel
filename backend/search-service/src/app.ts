import express, { Express, Request, Response } from "express";
import cors from "cors";
import searchRoutes from "./routes/search.routes.js";

const app: Express = express();

app.use(cors());
app.use(express.json());

app.use("/api/search", searchRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", service: "search-service" });
});

export default app;
