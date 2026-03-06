import jwt from "jsonwebtoken";


export const verifyToken = (req,res,next) =>{
    //get token from cookie
    const token = req.cookies.token;

    if(!token) {
        return res.status(401).json({error: "Access Denied. No token found in cookies."})
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();

    } catch (error) {
        res.status(403).json({error: "Invalid or Expired Token"});
    }
};

export const isAdmin = (req, res, next) =>{
    try {

        const allowedRoles =["admin","superadmin"];
        if(req.user && allowedRoles.includes(req.user.role)){
              next();
        }else {
            // If they are logged in but NOT an admin
            return res.status(403).json({ message: "Access denied. Admin or Superadmin role required." });
        }
        
    } catch (error) {
       res.status(500).json({ message: "Internal Server Error in Authorization" });
    }    
}