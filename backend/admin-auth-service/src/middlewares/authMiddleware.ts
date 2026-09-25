import { Request, Response, NextFunction } from "express";
import Admin, { IAdmin } from "../models/Admin.js"; 
import jwt, { JwtPayload } from "jsonwebtoken";

interface DecodedToken extends JwtPayload {
    id: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    let token: string | undefined;

    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token found" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "jwt_secret") as DecodedToken;

    const currentAdmin = await Admin.findById(decoded.id).select("-password");

    if (!currentAdmin) {
      return res.status(401).json({ message: "The admin belonging to this token no longer exists" });
    }

    req.admin = currentAdmin as IAdmin; 
    next();

  } catch (error) {
    const err = error as Error & { name?: string; expiredAt?: Date };
    console.error("Protect middleware error:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", expiredAt: err.expiredAt });
    }

    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
