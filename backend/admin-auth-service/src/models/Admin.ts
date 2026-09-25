import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IAdmin extends Document {
    name: string;
    email: string;
    password: string;
    role: "admin" | "superadmin";
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): boolean;
}

const adminSchema: Schema<IAdmin> = new Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is Required"],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    role: {
        type: String,
        enum: ["admin", "superadmin"],
        default: "admin"
    }
}, {
    timestamps: true
});

adminSchema.methods.comparePassword = function (password: string): boolean {
    return bcrypt.compareSync(password, this.password);
};

export default mongoose.model<IAdmin>("Admin", adminSchema, "admins");
