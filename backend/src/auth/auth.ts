import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/connectDB";


declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}


const TOKEN_SECRET = process.env.JWT_SECRET;

export const verifyJwt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new Error("No token provided");
        }

        const decoded = jwt.verify(token, TOKEN_SECRET as string);

            const user = await db.user.findUnique({
                where: {
                    id: (decoded as any).id
                }
            })

            if (!user) {
                throw new Error("Invalid token to find user")
            }

            req.user = user
            next();
    } catch (error) {
        console.error("Failed the authorizaiton", error)
    }
}