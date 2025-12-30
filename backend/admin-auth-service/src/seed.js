import mongoose from "mongoose";
import Admin from "./models/Admin.js"
import "dotenv/config"


const seedFirstSuperadmin = async () =>{
    try {

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");


        const existingSuper = await Admin.findOne({role: "superadmin" });
        if(existingSuper){
            console.log(" A Superadmin already exists. No action taken");
            process.exit(0);
        }

        await Admin.create({name:"System Founder",email:process.env.INITIAL_ADMIN_EMAIL , password: process.env.INITIAL_ADMIN_PASSWORD , role: "superadmin"});

        console.log("Success: first superadmin created!");

        process.exit(0);
        
    } catch (error) {
        console.error("❌ ERROR during seeding:", error.message);
        process.exit(1);
    }
}

seedFirstSuperadmin();