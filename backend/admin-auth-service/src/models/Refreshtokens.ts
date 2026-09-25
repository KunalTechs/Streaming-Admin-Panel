import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshToken extends Document {
    adminId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const refreshTokenSchema: Schema<IRefreshToken> = new Schema({
    adminId: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    },
    token: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
}, {
    timestamps: true 
});

export default mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema);
