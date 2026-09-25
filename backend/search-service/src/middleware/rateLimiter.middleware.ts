import rateLimit from "express-rate-limit";

export const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        message: "Too many searches from this IP, please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});
