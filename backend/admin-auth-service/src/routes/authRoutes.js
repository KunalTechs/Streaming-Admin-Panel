import express from "express";
import {
    register,
    login,
    logout,
    handleRefreshToken,
    getProfile,
    getAllAdmins,
} from "../controllers/authController.js";
import { protect } from "../middlewares/auth.middleware.js";
import { restrictTo } from "../middlewares/role.middleware.js";

const router = express.Router();

/*
route:-POST /api/auth/register
work:- Create a new admin account (Public or Superadmin only depending on your choice)
*/
router.post("/register",protect,restrictTo("superadmin"),register);

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
export default router;

// Only a Superadmin can see the full list of other administrators
router.get("/all-admins", 
    protect, 
    restrictTo("superadmin"), 
    getAllAdmins
);

