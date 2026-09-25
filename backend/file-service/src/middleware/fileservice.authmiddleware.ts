import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserPayload } from "../types/express.js";

export const verifyToken = (req: Request, res: Response, next: NextFunction): Response | void => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token found in cookies or authorization header." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret") as UserPayload;
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or Expired Token" });
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        const allowedRoles = ["admin", "superadmin"];
        if (allowedRoles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({
                message: `Access denied. ${allowedRoles.join(" or ")} role required.`
            });
        }
    } catch (error) {
        console.error("Authorization Error:", error);
        return res.status(500).json({ message: "Internal Server Error in Authorization" });
    }
};
