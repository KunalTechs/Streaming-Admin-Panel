import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./events/category.producer.js";
import prisma from "./config/prisma.js";


const PORT = process.env.PORT;

await prisma.$connect();
 console.log("prisma is running");

//Start the Mouth of Kafka
await connectProducer();

app.listen(PORT, () =>{
  console.log(`Server running on address http://localhost:${PORT}`);
})

app.get("/", (req, res) => res.send("Server is live..."));


