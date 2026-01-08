import "dotenv/config";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { initAdminConsumer } from "./events/admin.consumer.js";

const PORT = process.env.PORT;

const startServer = async () => {
  try {
    //Test Database Connection
    await prisma.$connect();
    console.log("prisma is running");
    //Start Kafka Consumer
    // This starts watching for "ADMIN_CREATED" events from the Auth Service
    await initAdminConsumer();
    console.log("kafka consumer is running");

    app.listen(PORT, () => {
      console.log(`Server running on address http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};
app.get("/", (req, res) => res.send("Server is live..."));

startServer();


