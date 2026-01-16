import express from "express";
import cors from "cors";
import videoRoutes from "./routes/videoRoutes.js";


const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/videos", videoRoutes);

export default app;