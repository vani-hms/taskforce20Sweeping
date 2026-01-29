import { prisma } from "../prisma";
import { Role } from "../../generated/prisma";

export type QcScope = {
  zoneIds: string[];
  wardIds: string[];
};

/**
 * Resolve QC scope for a user within a city and module.
 * Prefers module-level assignments; falls back to city-level QC scope if module scope is empty.
 */
export async function getQcScope(params: { userId: string; cityId: string; moduleId: string }): Promise<QcScope> {
  const { userId, cityId, moduleId } = params;

  const moduleAssignments = await prisma.userModuleRole.findMany({
    where: { userId, cityId, moduleId, role: Role.QC },
    select: { zoneIds: true, wardIds: true }
  });

  const zoneSet = new Set<string>();
  const wardSet = new Set<string>();

  moduleAssignments.forEach((m) => {
    (m.zoneIds || []).forEach((z) => zoneSet.add(z));
    (m.wardIds || []).forEach((w) => wardSet.add(w));
  });

  // If nothing is set at module level, fall back to city-level QC assignment
  if (zoneSet.size === 0 || wardSet.size === 0) {
    const cityAssignment = await prisma.userCity.findFirst({
      where: { userId, cityId, role: Role.QC },
      select: { zoneIds: true, wardIds: true }
    });
    cityAssignment?.zoneIds?.forEach((z) => zoneSet.add(z));
    cityAssignment?.wardIds?.forEach((w) => wardSet.add(w));
  }

  return { zoneIds: Array.from(zoneSet), wardIds: Array.from(wardSet) };
}

