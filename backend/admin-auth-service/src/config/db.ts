import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    mongoose.connection.on("connected", () => {
        console.log("✅ Database connected successfully");
    });

    mongoose.connection.on("error", (err: Error) => {
        console.error("❌ MongoDB connection error:", err);
    });

    try {
        const mongodbURI = process.env.MONGODB_URI;

        if (!mongodbURI) {
            throw new Error("MONGODB_URI environment variable not set");
        }

        await mongoose.connect(mongodbURI);
    } catch (error) {
        const err = error as Error;
        console.error("Critical Error Connecting to MongoDB:", err.message);
        process.exit(1);
    }
};

export default connectDB;
