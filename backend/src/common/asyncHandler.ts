import { NextFunction, Request, Response } from "express"

type RequestHandler = ( req: Request, res: Response, next: NextFunction ) => Promise<any> | void

export const asyncHandler = (requestHandler: RequestHandler) => {
    return (req: Request, res: Response, next: NextFunction) => {
        return Promise.resolve(requestHandler(req, res, next)).catch((err: Error) => next(err))
    }
}