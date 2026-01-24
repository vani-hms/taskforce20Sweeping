import { Role } from "../../generated/prisma";

export function resolveCanWrite(role: Role, requested: boolean) {
  if (role === Role.COMMISSIONER) return false;
  if (role === Role.EMPLOYEE || role === Role.QC) return requested;
  // ACTION_OFFICER (and CITY_ADMIN if used here) can write by default
  return true;
}
