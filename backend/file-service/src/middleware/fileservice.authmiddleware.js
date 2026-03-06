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

export const isAdmin = (req, res,next ) =>{

    try {
        if(!req.user){
            return res.status(401).json({message: "Unathprized. Please log in."})
        }

        const allowedRoles = ["admin", "superadmin"];
        if(allowedRoles.includes(req.user.role)){
            next();
        }else {
            return res.status(403).json({
                message: `Access denied. ${allowedRoles.join(" or ")} role required.`
            })
        }
    } catch (error) {
        console.error("Authorization Error:", error);
        res.status(500).json({ message: "Internal Server Error in Authorization" });
    }
}