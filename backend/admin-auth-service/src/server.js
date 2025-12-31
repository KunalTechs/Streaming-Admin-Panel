import "dotenv/config";
import connectDB from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 4001;

//Database Connection
await connectDB()

app.get('/', (req,res) => res.send("Server is live..."))

app.listen(PORT, ()=>{
    console.log(`Server running on adress http://localhost:${PORT}`)
} )