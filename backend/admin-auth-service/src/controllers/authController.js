import Admin from "../models/Admin.js"; // Updated to Admin
import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

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

// ADMIN LOGIN
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import RefreshToken from "../models/RefreshToken.js";

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
    // Clear the cookie by setting its expiry to a past date
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0), // Expire immediately
      sameSite: "Strict",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};