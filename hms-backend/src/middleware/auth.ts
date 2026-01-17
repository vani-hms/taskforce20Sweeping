import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/jwt";
import { HttpError } from "../utils/errors";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing authorization header"));
  }
  const token = header.replace("Bearer ", "");
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (err) {
    next(new HttpError(401, "Invalid or expired token"));
  }
}
