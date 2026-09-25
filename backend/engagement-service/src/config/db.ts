import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const dbPool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3307", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "rootpassword",
    database: process.env.MYSQL_DATABASE || "video_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export const initDB = async (): Promise<void> => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS video_progress (
                user_id VARCHAR(255) NOT NULL,
                video_id VARCHAR(255) NOT NULL,
                progress_seconds INT NOT NULL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, video_id)
            );
        `;
        await dbPool.query(query);
        console.log("✅ video_progress table initialized in MySQL");
    } catch (err) {
        const error = err as Error;
        console.error("❌ Failed to initialize video_progress DB table:", error.message);
    }
};
