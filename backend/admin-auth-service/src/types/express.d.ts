import { IAdmin } from "../models/Admin.js";

declare global {
    namespace Express {
        interface Request {
            admin?: IAdmin;
        }
    }
}
