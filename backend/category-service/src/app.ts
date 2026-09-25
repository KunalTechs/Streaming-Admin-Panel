import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import categoryRoutes from "./routes/categoryRoutes.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use("/api/categories", categoryRoutes);

export default app;
