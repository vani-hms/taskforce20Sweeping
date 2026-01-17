import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";
import { Role } from "../types/auth";

export function requireRoles(roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "Unauthenticated"));
    const hasRole = req.auth.roles.some((r) => roles.includes(r));
    if (!hasRole) return next(new HttpError(403, "Forbidden"));
    next();
  };
}

export function requireModuleRoles(moduleId: string, roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "Unauthenticated"));
    const assignment = req.auth.modules.find((m) => m.moduleId === moduleId);
    const hasRole = assignment?.roles.some((r) => roles.includes(r));
    if (!hasRole) return next(new HttpError(403, "Forbidden for module"));
    next();
  };
}

export function requireCityContext() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.cityId) {
      return next(new HttpError(400, "Active city context required"));
    }
    next();
  };
}
