import express, { Express } from "express";
import cors from "cors";
import s3Routes from "./routes/s3.routes.js";
import cookieParser from "cookie-parser";

const app: Express = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use("/api/files", s3Routes);

export default app;
