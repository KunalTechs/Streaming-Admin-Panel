import mongoose from "mongoose";

const refreshTokenSchema =new mongoose.Schema({
    adminId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required:true
    },
    token:{
        type:String,
        required: true
    },
    expiresAt:{
        type: Date,
        required:true,
        index: {expires:0}
    }
},{
   timestamps:true 
});

export default mongoose.model("RefreshToken", refreshTokenSchema);