import { Request, Response } from "express";
import Admin, { IAdmin } from "../models/Admin.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/Refreshtokens.js";
import { emitEvent } from "../events/producer.js";

const generateToken = (userId: string | unknown): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "jwt_secret", { expiresIn: "1h" });
};

export const register = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    const newAdmin = await Admin.create({ name, email, password, role });

    try {
      await emitEvent("ADMIN_CREATED", newAdmin._id.toString(), {
        id: newAdmin._id.toString(),
        username: newAdmin.name,
        email: newAdmin.email,
      });

      await emitEvent("admin-events", newAdmin._id.toString(), {
        event: "ADMIN_REGISTERED",
        actor: "System",
        target: newAdmin._id,
        details: `Admin ${newAdmin.name} self-registered`,
      });
      console.log("🚀 Sync event sent to ADMIN_CREATED topic");
    } catch (error) {
      const err = error as Error;
      console.error("Kafka Sync Error:", err.message);
    }

    const token = generateToken(newAdmin._id);

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getAllAdmins = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const admins = await Admin.find().select("-password").sort("-createdAt");

    return res.status(200).json({
      success: true,
      results: admins.length,
      data: admins,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: "Error fetching admins", error: err.message });
  }
};

export const deleteAdmin = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const adminIdToDelete = req.params.id as string;
    const { transferToId, reason } = req.body;

    if (req.admin && adminIdToDelete === req.admin._id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const targetAdmin = await Admin.findById(adminIdToDelete);

    if (!targetAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (targetAdmin.role === "superadmin") {
      return res.status(403).json({
        message: "Superadmin accounts cannot be deleted through this endpoint",
      });
    }

    await Admin.findByIdAndDelete(adminIdToDelete);

    await emitEvent("ADMIN_DELETED", adminIdToDelete, {
      deletedAdminId: adminIdToDelete,
      newOwnerId: transferToId || null,
    });

    await emitEvent("admin-events", adminIdToDelete, {
      event: "ADMIN_DELETED",
      actor: req.admin?._id.toString(),
      target: adminIdToDelete,
      reason: reason || "No reason provided",
    });

    return res.status(200).json({
      success: true,
      message: `Account for ${targetAdmin.name} has been permanently deleted / transfer initiated`,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: err.message });
  }
};

export const updateAdminRole = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params as { id: string };
    const { role } = req.body;


    const validRoles = ["admin", "editor", "superadmin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role type" });
    }

    if (role === "superadmin") {
      return res.status(403).json({
        message: "Promotion to Superadmin is restricted to system level operations",
      });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await emitEvent("admin-events", id, {
      type: "ADMIN_ROLE_UPDATE",
      payload: { id, role: updatedAdmin.role },
    });

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role} for ${updatedAdmin.name}`,
      data: updatedAdmin,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin || !(await admin.comparePassword(password))) {
      await emitEvent("audit-logs", email, {
        type: "LOGIN_FAILURE",
        details: { email, ip: req.ip, reason: "Invalid Credentials" },
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await emitEvent("audit-logs", admin._id.toString(), {
      type: "LOGIN_SUCCESS",
      details: { adminId: admin._id, email: admin.email },
    });

    const accessToken = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
      },
      process.env.JWT_SECRET || "jwt_secret",
      { expiresIn: "1h" }
    );

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
      path: "/",
    });

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");

    await RefreshToken.create({
      adminId: admin._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh-token",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const handleRefreshToken = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh Token required" });
    }

    const savedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!savedToken) {
      return res
        .status(403)
        .json({ message: "Invalid or Expired Refresh Token" });
    }

    const admin = await Admin.findById(savedToken.adminId);
    if (!admin) {
      await RefreshToken.deleteOne({ _id: savedToken._id });
      return res.status(403).json({ message: "User no longer exists" });
    }

    const newAccessToken = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || "jwt_secret",
      { expiresIn: "1h" }
    );

    res.cookie("jwt", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    return res.status(200).json({
      message: "Access Token Refreshed",
      role: admin.role,
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

export const logout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.clearCookie("jwt", { httpOnly: true, sameSite: "strict" });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      path: "/api/auth/refresh-token",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: "Logout failed", error: err.message });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await Admin.findById(req.admin._id).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Profile Fetch Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: err.message,
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { name, email } = req.body;
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");

    await emitEvent("admin-events", req.admin._id.toString(), {
      type: "ADMIN_UPDATED",
      payload: { id: req.admin._id, name, email },
    });

    return res.status(200).json({ success: true, data: updatedAdmin });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: err.message });
  }
};

export const updatePassword = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await Admin.findById(req.admin._id).select("+password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    admin.password = newPassword;
    await admin.save();

    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ message: err.message });
  }
};
