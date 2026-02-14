import jwt from 'jsonwebtoken';

export const verifyToken = (req,res,next) =>{
    //get token from cookie
    const token = req.cookies.token;

    if(!token) {
        return res.satatus(401).json({error: "Access Denied. No token found in cookies."})
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();

    } catch (error) {
        res.status(403).json({error: "Invalid or Expired Token"});
    }
};

export const isSuperAdmin = (req, res, next) => {
    // verifyToken runs first, so req.user is already populated
    if (req.user && req.user.role === 'superadmin') {
        next(); // Allow access
    } else {
        res.status(403).json({ error: "Permission Denied. SuperAdmin access required." });
    }
};