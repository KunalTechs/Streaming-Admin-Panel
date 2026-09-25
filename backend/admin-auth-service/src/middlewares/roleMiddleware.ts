import { Request, Response, NextFunction } from "express";

export const restrictTo = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): Response | void => {
        if (!req.admin || !allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                status: "fail",
                message: "You do not have permission to perform this action"
            });
        }
        next();
    };
};
