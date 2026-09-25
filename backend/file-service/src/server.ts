import "dotenv/config";
import app from "./app.js";

const PORT: number = parseInt(process.env.PORT || "4004", 10);

app.listen(PORT, () => {
    console.log(`Server is running on address http://localhost:${PORT}`);
});
