import express, { Router } from "express";
import {
    register,
    login,
    logout,
    handleRefreshToken,
    getProfile,
    getAllAdmins,
    deleteAdmin,
    updateAdminRole,
    updatePassword,
    updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { restrictTo } from "../middlewares/roleMiddleware.js";

const router: Router = express.Router();

router.post("/register", protect, restrictTo("superadmin"), register);
router.get("/all-admins", protect, restrictTo("superadmin"), getAllAdmins);
router.delete("/delete-admin/:id", protect, restrictTo("superadmin"), deleteAdmin);
router.patch("/update-role/:id", protect, restrictTo("superadmin"), updateAdminRole);

router.post("/login", login);
router.post("/refresh-token", handleRefreshToken);
router.post("/logout", logout);

router.get("/profile", protect, getProfile);
router.patch("/update-my-password", protect, updatePassword);
router.patch("/update-me", protect, updateProfile);

export default router;
