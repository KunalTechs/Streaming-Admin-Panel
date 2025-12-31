import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use((err,req,res,next)=> {
    res.status(err.status || 500).json({message:err.message});
});

export default app;