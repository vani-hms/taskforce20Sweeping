import type { AuthUser, ModuleName, Role } from "../types/auth";

const normalizeKey = (key: string) => key.trim().toUpperCase();

export function hasRole(user: AuthUser | null, roles: Role[]): boolean {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}

export function getModuleAssignment(user: AuthUser | null, module: ModuleName) {
  if (!user) return null;
  const target = normalizeKey(module);
  return user.modules.find((m) => normalizeKey(m.key) === target || m.moduleId === module) || null;
}

export function hasModuleRole(user: AuthUser | null, module: ModuleName, roles: Role[]): boolean {
  if (!user) return false;
  const assignment = getModuleAssignment(user, module);
  if (!assignment) return false;
  if (assignment.roles?.length) {
    return assignment.roles.some((r) => roles.includes(r));
  }
  return user.roles.some((r) => roles.includes(r));
}

export function hasModuleAccess(user: AuthUser | null, module: ModuleName) {
  if (!user) return false;
  if (user.roles.includes("HMS_SUPER_ADMIN")) return true;
  return Boolean(getModuleAssignment(user, module));
}

export function canWriteModule(user: AuthUser | null, module: ModuleName) {
  if (!user) return false;
  if (user.roles.includes("HMS_SUPER_ADMIN") || user.roles.includes("CITY_ADMIN")) return true;
  const assignment = getModuleAssignment(user, module);
  return Boolean(assignment?.canWrite);
}

export function isHmsSuperAdmin(user: AuthUser | null) {
  return hasRole(user, ["HMS_SUPER_ADMIN"]);
}
