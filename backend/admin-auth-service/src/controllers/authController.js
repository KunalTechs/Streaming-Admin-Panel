import Admin from "../models/Admin.js"; 
import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/Refreshtokens.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Restricted to superAdmin :-
//REGISTER NEW ADMIN
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // CREATE NEW ADMIN (Password hashing happens automatically in Admin.js pre-save hook)
    const newAdmin = await Admin.create({ name, email, password, role });

    const token = generateToken(newAdmin._id);

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000,
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET ALLADMIN PROFILE BY SUPERADMIN
export const getAllAdmins = async (req, res) => {
    try {
        // Find everyone but EXCLUDE passwords for security
        const admins = await Admin.find().select("-password").sort("-createdAt");

        res.status(200).json({
            success: true,
            results: admins.length,
            data: admins
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching admins", error: error.message });
    }
};

//Delete Admin By SuperAdmin
export const deleteAdmin = async (req,res) =>{
try{
  const {id} = req.params;

  // Prevent deleting yourself
  if(id === req.admin.id){
    return res.status(400).json({message:"You cannot delte your own account"});
  }

    const targetAdmin = await Admin.findById(id);

    if(!targetAdmin) {
      return res.status(404).json({message:"Admin not found"});
    }

    if(targetAdmin.role == "superadmin"){
      return res.status(403).json({
        message:"Superadmin accounts cannot be deleted through this endpoint"
      });
    }

    await Admin.findByIdAndDelete(id);
res.status(200).json({ 
            success: true, 
            message: `Account for ${targetAdmin.name} has been permanently deleted` 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    } 

}

export const updateAdminRole = async (req,res) =>{
  try{
  const {id} = req.params;
  const {role}=req.body;

  const validRoles = ["admin","editor","superadmin"];
  if(!validRoles.includes(role)){
    return res.status(400).json({message: "Invalid role type"});
  }

  if(role === "superadmin"){
    return res.status(403).json({message:"Promotion to Superadmin is restricted to system level operations"})
  }

  const updateAdmin = await Admin.findByIdAndUpdate(id,{role},{new:true,runValidators:true}).select("-password");

  if(!updateAdmin){
    return res.status(404).json({message: "Admin not found"});
  }

  res.status(200).json({
            success: true,
            message: `Role updated to ${role} for ${updatedAdmin.name}`,
            data: updatedAdmin
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// done by both admin superadmin:-
// ADMIN LOGIN

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find Admin and include password for comparison
    const admin = await Admin.findOne({ email }).select("+password");
    
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2. Generate Access Token with THE MAGIC LINE (include role)
    const accessToken = jwt.sign(
      { 
        id: admin._id, 
        role: admin.role // This allows other services to know permissions instantly
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // 3. Set Access Token Cookie
    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000, // 1 hour
      path: "/"
    });

    // 4. Generate Refresh Token Value (Using Crypto)
    const refreshTokenValue = crypto.randomBytes(40).toString("hex");

    // 5. Save Refresh Token to Database for Session Tracking
    await RefreshToken.create({
      adminId: admin._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Days
    });

    // 6. Set Refresh Token Cookie (Restricted Path for Security)
    res.cookie("refreshToken", refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      path: "/api/auth/refresh-token", 
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    // 7. Send Response (Return basic info to the Frontend)
    res.status(200).json({
      message: "Login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role // Useful for UI conditional rendering
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// HANDLE REFRESH TOKEN
export const handleRefreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh Token required" });
        }

        // 1. Find token in DB
        const savedToken = await RefreshToken.findOne({ token: refreshToken });

        if (!savedToken) {
            return res.status(403).json({ message: "Invalid or Expired Refresh Token" });
        }

        // 2. EXTRA SECURITY: Verify the Admin still exists
        const admin = await Admin.findById(savedToken.adminId);
        if (!admin) {
            // If admin is gone, clean up the orphaned refresh token
            await RefreshToken.deleteOne({ _id: savedToken._id });
            return res.status(403).json({ message: "User no longer exists" });
        }

        // 3. Generate new Access Token (The 1-hour key)
        const newAccessToken = jwt.sign(
            { id: admin._id, role: admin.role }, // Include role for easier frontend access
            process.env.JWT_SECRET, 
            { expiresIn: "1h" }
        );

        // 4. Update the Access Token Cookie
        res.cookie("jwt", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 3600000 // 1 Hour
        });

        res.status(200).json({ 
            message: "Access Token Refreshed",
            role: admin.role // Send role back so frontend knows permissions
        });

    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// LOGOUT ADMIN
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    // 1. Delete Refresh Token from DB
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // 2. Clear both cookies
    res.clearCookie("jwt", { httpOnly: true, sameSite: "Strict" });
    res.clearCookie("refreshToken", { 
        httpOnly: true, 
        sameSite: "Strict", 
        path: "/api/auth/refresh-token" 
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};

// Get current logged-in admin's profile
export const getProfile = async (req, res) => {
  try {
    // 1. req.admin was attached by the 'protect' middleware
    // We fetch the admin by ID and use .select("-password") for security
    const admin = await Admin.findById(req.admin.id).select("-password");

    // 2. Check if admin still exists in the database
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // 3. Return the profile data
    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: error.message,
    });
  }
};



// UpdateProfile by Admin:-
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin.id, 
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ success: true, data: updatedAdmin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//UpdatePassword by admin:-

export const updatePassword = async(req,res) =>{
  try {
    const {oldPassword, newPassword} = req.body;

    const admin = await Admin.findById(req.admin.id).select("+password");

    const isMatch= await admin.comparePassword(oldPassword);
    if(!isMatch) {
      return res.status(401).json({message: "Current password is incorrect"});
       }

    //  Update and save (Schema middleware will hash the new password)
      admin.password = newPassword;
      await admin.save();

      res.status(200).json({success:true, message:"Password updated successfully"});
  } catch (error) {
     res.status(500).json({message: error.message});
  }

}

