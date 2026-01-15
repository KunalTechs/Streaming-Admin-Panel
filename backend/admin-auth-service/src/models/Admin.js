import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema =new mongoose.Schema({
    name:{
        type:String,
        required: [true, "Name is required"],
        trim: true
    },
    email:{
        type:String,
        required:[true, "Email is Required"],
        unique:true,
        lowercase:true,
    },
    password:{
        type:String,
        required:[true, "Password id required"]
    },
    role:{
        type:String,
        enum:["admin", "superadmin"],
        default:"admin"
    }

},{
    timestamps:true
})

adminSchema.methods.comparePassword =function (password){
    return bcrypt.compareSync(password, this.password)
}

export default mongoose.model("Admin",adminSchema, "admins");