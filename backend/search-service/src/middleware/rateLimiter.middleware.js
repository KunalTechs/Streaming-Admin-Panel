import rateLimit from "express-rate-limit";

export const searchLimiter = rateLimit({
    windowMa: 15*60*1000, //15 minutes
    max: 100, // Limit each IP to 100 searches per window
    message: {
        message: "Too many searches from this IP, please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});