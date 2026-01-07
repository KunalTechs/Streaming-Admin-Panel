import "dotenv/config";
import app from "./app.js"


const PORT = process.env.PORT;

app.listen(PORT, () =>{
console.log(`Server running on address http://localhost:${PORT}`)
});

app.get("/", (req, res) => res.send("Server is live..."));



