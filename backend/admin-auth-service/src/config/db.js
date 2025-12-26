import mongoose from "mongoose";

const connectDB = async () => {
    // 1. Setup listeners first
    mongoose.connection.on("connected", () => {
        console.log("✅ Database connected successfully");
    });

    mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err);
    });

    try {
        let mongodbURI = process.env.MONGODB_URI;
        const serviceName = 'Admin-Auth';

        if (!mongodbURI) {
            throw new Error("MONGODB_URI environment variable not set");
        }

        // Clean trailing slash
        if (mongodbURI.endsWith('/')) {
            mongodbURI = mongodbURI.slice(0, -1);
        }

        // FIX: Ensure variable names match and use template literals correctly
        // Note: If your URI doesn't have a DB name, this creates one called 'Admin-Auth'
        await mongoose.connect(`${mongodbURI}/${serviceName}`);
        
    } catch (error) {
        console.error("Critical Error Connecting to MongoDB:", error.message);
        process.exit(1); // Optional: Exit process if DB connection is mandatory
    }
}

export default connectDB;