import "dotenv/config";
import connectDB from "./config/db.js";
import app from "./app.js";
import { initTopics } from "./config/kafka.js";
import { connectProducer } from "./events/producer.js";

const PORT = process.env.PORT;

//Database Connection
const startServer = async () => {
  try {
    // Connect To MongoDB
    await connectDB();

    // Initialize Kafka Topics (The Highways)
    await initTopics();

    // Connect the Kafka Producer
    await connectProducer();

    // Start The Express Server

    app.listen(PORT, () => {
      console.log(`Server running on adress http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1); // Stop the app if any infrastructure fails
  }
};

app.get("/", (req, res) => res.send("Server is live..."));

startServer();
