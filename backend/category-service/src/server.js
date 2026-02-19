import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./events/category.producer.js";
import prisma from "./config/prisma.js";
import { connectRedis } from "./config/redis.js";


const PORT = process.env.PORT;

const startServer = async () => {

//connect to prisma
await prisma.$connect();
 console.log("prisma is running");

//Start the Mouth of Kafka
await connectProducer();

// Connect to Redis
await connectRedis();


app.listen(PORT, () =>{
  console.log(`Server running on address http://localhost:${PORT}`);
})

};
app.get("/", (req, res) => res.send("Server is live..."));

startServer();