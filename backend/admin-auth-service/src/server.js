import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";


const app = express();
const PORT = process.env.PORT || 4001;

//Database Connection
await connectDB()

app.use(express.json())
app.use(cors())

app.get('/', (req,res) => res.send("Server is live..."))

app.listen(PORT, ()=>{
    console.log(`Server running on adress http://localhost:${PORT}`)
} )