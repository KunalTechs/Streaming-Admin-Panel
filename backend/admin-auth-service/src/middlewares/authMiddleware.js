import Admin from "../models/Admin.js"; 
import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Look for token in Cookies (Primary) or Headers (Secondary)
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

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach admin to the request (Excluding password)
    // We fetch from DB to ensure the account wasn't deleted or suspended
    const currentAdmin = await Admin.findById(decoded.id).select("-password");

    if (!currentAdmin) {
      return res.status(401).json({ message: "The admin belonging to this token no longer exists" });
    }

    // Grant access to protected route
    req.admin = currentAdmin; 
    next();

  } catch (error) {
    console.error("Protect middleware error:", error.message);

    // Specific check for expired token to help the Frontend Refresh logic
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", expiredAt: error.expiredAt });
    }

    res.status(401).json({ message: "Not authorized, token failed" });
  }
};