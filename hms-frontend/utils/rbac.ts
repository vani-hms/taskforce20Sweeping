import type { AuthUser, ModuleName, Role } from "../types/auth";

export function hasRole(user: AuthUser | null, roles: Role[]): boolean {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}

export function hasModuleRole(user: AuthUser | null, module: ModuleName, roles: Role[]): boolean {
  if (!user) return false;
  const assignment = user.modules.find((m) => m.module === module);
  if (!assignment) return false;
  return assignment.roles.some((r) => roles.includes(r));
}

export function isHmsSuperAdmin(user: AuthUser | null) {
  return hasRole(user, ["HMS_SUPER_ADMIN"]);
}
