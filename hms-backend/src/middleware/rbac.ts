import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";
import { Role } from "../types/auth";

const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export function requireCityContext() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.cityId) {
      return next(new HttpError(400, "Active city context required"));
    }
    next();
  };
}

// Basic role guard (with HMS bypass)
export function requireRoles(roles: Role[]) {

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "Unauthenticated"));
    if (req.auth.roles.includes("HMS_SUPER_ADMIN" as Role)) return next();
    const hasRole = req.auth.roles.some((r) => roles.includes(r));
    if (!hasRole) return next(new HttpError(403, "Forbidden"));
    next();
  };
}

// City-level guard: HMS bypass; CITY_ADMIN full RW; COMMISSIONER read-only; others blocked.
export function requireCityAccess() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "Unauthenticated"));
    const isWrite = WRITE_METHODS.includes(req.method.toUpperCase());
    if (req.auth.roles.includes("HMS_SUPER_ADMIN" as Role)) return next();
    const isCityAdmin = req.auth.roles.includes("CITY_ADMIN" as Role);
    const isCommissioner = req.auth.roles.includes("COMMISSIONER" as Role);
    const isActionOfficer = req.auth.roles.includes("ACTION_OFFICER" as Role);
    const isQc = req.auth.roles.includes("QC" as Role);
    if (isWrite && !isCityAdmin) return next(new HttpError(403, "Write access not permitted for this role"));
    if (!isCityAdmin && !isCommissioner && !isActionOfficer && !isQc) return next(new HttpError(403, "Forbidden"));
    next();
  };
}

// Module-level guard with canWrite enforcement and commissioner read-only bypass.
export function requireModuleAccess(moduleId: string, roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "Unauthenticated"));
    const isWrite = WRITE_METHODS.includes(req.method.toUpperCase());
    if (req.auth.roles.includes("HMS_SUPER_ADMIN" as Role)) return next();

    // Commissioners: allow read-only across modules
    if (req.auth.roles.includes("COMMISSIONER" as Role)) {
      if (isWrite) return next(new HttpError(403, "Write access not permitted for this role"));
      return next();
    }

    const assignment = req.auth.modules.find((m) => m.moduleId === moduleId);
    if (!assignment) return next(new HttpError(403, "Forbidden for module"));
    const hasRole = assignment.roles.some((r) => roles.includes(r));
    if (!hasRole) return next(new HttpError(403, "Forbidden for module"));
    if (isWrite && !assignment.canWrite) {
      return next(new HttpError(403, "Write access not permitted for this role"));
    }
    next();
  };
}

// Helper to await middleware guards inside route handlers
export function assertModuleAccess(req: Request, res: Response, moduleId: string, roles: Role[]) {
  return new Promise<void>((resolve, reject) => {
    const guard = requireModuleAccess(moduleId, roles);
    guard(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
