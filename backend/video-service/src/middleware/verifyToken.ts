import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserPayload } from "../types/express.js";

export const verifyToken = (req: Request, res: Response, next: NextFunction): Response | void => {
    const token = req.cookies?.token || req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token found in cookies or headers." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "jwt_secret") as UserPayload;
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or Expired Token" });
    }
};

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction): Response | void => {
    if (req.user && req.user.role === "superadmin") {
        next();
    } else {
        return res.status(403).json({ error: "Permission Denied. SuperAdmin access required." });
    }
};
