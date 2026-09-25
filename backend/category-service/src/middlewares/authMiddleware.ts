import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserPayload } from "../types/express.js";

export const verifyToken = (req: Request, res: Response, next: NextFunction): any => {
    // get token from cookie
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token found in cookies." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as UserPayload;
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid or Expired Token" });
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): any => {
    try {
        const allowedRoles = ["admin", "superadmin"];
        if (req.user && allowedRoles.includes(req.user.role)) {
            next();
        } else {
            // If they are logged in but NOT an admin
            return res.status(403).json({ message: "Access denied. Admin or Superadmin role required." });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error in Authorization" });
    }    
};
