import express from "express";
import cors from "cors";
import s3Routes from "./routes/s3.routes.js"


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/files", s3Routes);

export default app;