import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { HttpError } from "./errors";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      return next(new HttpError(400, message));
    }
    req.body = parsed.data;
    next();
  };
}
