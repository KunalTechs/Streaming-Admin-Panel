import "dotenv/config";
import app from "./app.js";
import { initKafkaConsumer } from "./events/fileservice.consumer.js";


const PORT = process.env.PORT;

await initKafkaConsumer();
 console.log("kafka consumer is running");
 
app.listen(PORT, () => {
      console.log(`Server running on address http://localhost:${PORT}`);
    });

    app.get("/", (req, res) => res.send("Server is live..."));