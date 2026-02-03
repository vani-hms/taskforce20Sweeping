import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    require("fs").appendFileSync("debug_log.txt", `[ERROR] ${new Date().toISOString()} ${err.status} ${err.message}\n`);
    return res.status(err.status).json({ error: err.message });
  }
  require("fs").appendFileSync("debug_log.txt", `[ERROR] ${new Date().toISOString()} 500 ${err.message}\n${err.stack}\n`);
  console.error(err);
  // Include message to help diagnose login/CORS issues during dev
  return res.status(500).json({ error: err.message || "Internal server error" });
}
