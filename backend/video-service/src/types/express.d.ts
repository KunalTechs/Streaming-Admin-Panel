import { Request } from "express";

export interface UserPayload {
    id: string;
    email: string;
    role: string;
    username?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}
