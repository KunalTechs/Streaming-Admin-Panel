export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        // Change req.user to req.admin to match your protect middleware
        if (!req.admin || !allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                status: "fail",
                message: "You do not have permission to perform this action"
            });
        }
        next();
    };
};