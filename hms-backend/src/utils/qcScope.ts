import { prisma } from "../prisma";
import { Role } from "../../generated/prisma";

export type QcScope = {
  zoneIds: string[];
  wardIds: string[];
};

/**
 * Resolve QC/AO scope for a user within a city and module.
 * Prefers module-level assignments; falls back to city-level scope if module scope is empty.
 */
export async function getQcScope(params: {
  userId: string;
  cityId: string;
  moduleId: string;
  roles?: Role[];
}): Promise<QcScope> {
  const { userId, cityId, moduleId, roles = [Role.QC, Role.ACTION_OFFICER] } = params;

  const moduleAssignments = await prisma.userModuleRole.findMany({
    where: { userId, cityId, moduleId, role: { in: roles } },
    select: { zoneIds: true, wardIds: true }
  });

  const zoneSet = new Set<string>();
  const wardSet = new Set<string>();

  moduleAssignments.forEach((m) => {
    (m.zoneIds || []).forEach((z) => zoneSet.add(z));
    (m.wardIds || []).forEach((w) => wardSet.add(w));
  });

  // If nothing is set at module level, fall back to city-level assignment
  if (zoneSet.size === 0 && wardSet.size === 0) {
    const cityAssignments = await prisma.userCity.findMany({
      where: { userId, cityId, role: { in: roles } },
      select: { zoneIds: true, wardIds: true }
    });
    cityAssignments.forEach((c) => {
      c.zoneIds?.forEach((z) => zoneSet.add(z));
      c.wardIds?.forEach((w) => wardSet.add(w));
    });
  }

  return { zoneIds: Array.from(zoneSet), wardIds: Array.from(wardSet) };
}


