import express from "express";
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

const router = express.Router();

/*
route:-POST /api/auth/register
work:- Create a new admin account (Public or Superadmin only depending on your choice)
*/
router.post("/register",protect,restrictTo("superadmin"),register);

// Only a Superadmin can see the full list of other administrators
router.get("/all-admins", 
    protect, 
    restrictTo("superadmin"), 
    getAllAdmins
);

//delete Admin by superadmin
router.delete("/delete-admin/:id",protect,restrictTo("superadmin"),deleteAdmin)

// UpdateAdmin role by superadmin
router.patch("/update-role/:id", protect, restrictTo("superadmin"), updateAdminRole);

/*
route:- POST /api/auth/login
work:- Authenticate admin & get tokens
*/
router.post("/login",login);

/*
route:-POST /api/auth/refresh-token
work:- Get a new Access Token using the Refresh Token cookie
*/
router.post("/refresh-token", handleRefreshToken)

/*
route:-POST /api/auth/logout
work:- Clear cookies and remove Refresh Token from DB
*/
router.post("/logout",logout);

/*
route:-GET /api/auth/profile
work:- Get current admin data (Example of a Protected Route)
*/
router.get("/profile", protect, getProfile);

// Self-service routes (Any logged-in admin)
router.patch("/update-my-password",protect, updatePassword);

router.patch("/update-me", protect, updateProfile);

export default router;


