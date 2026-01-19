import jwt from 'jasonwebtoken';

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
        res.status(403).json({error: "Invalid or Epired Token"});
    }
};