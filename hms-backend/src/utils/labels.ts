import { Role } from "../../generated/prisma";

export const ROLE_LABELS: Record<Role | string, string> = {
  [Role.EMPLOYEE]: "Taskforce Member",
  [Role.COMMISSIONER]: "ULB Official",
  [Role.QC]: "QC",
  [Role.CITY_ADMIN]: "City Admin",
  [Role.ACTION_OFFICER]: "Action Officer",
  [Role.HMS_SUPER_ADMIN]: "HMS Super Admin"
};

export function getRoleLabel(role: Role | string): string {
  return ROLE_LABELS[role] || role;
}
