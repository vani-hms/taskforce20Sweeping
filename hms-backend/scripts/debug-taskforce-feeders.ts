import "dotenv/config";
import { prisma } from "../src/prisma";
import { Role } from "../generated/prisma";

async function main() {
  console.log("=== TASKFORCE FEEDER DEBUG ===");

  const moduleRow = await prisma.module.findUnique({ where: { name: "TASKFORCE" } });
  if (!moduleRow) {
    console.error("Module TASKFORCE not found.");
    return;
  }
  console.log("Module", { id: moduleRow.id, name: moduleRow.name });

  const feeders = await prisma.taskforceFeederPoint.findMany({
    select: { id: true, cityId: true, zoneId: true, wardId: true, requestedById: true, createdAt: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.log("Latest feeders (10):");
  feeders.forEach((f, idx) => {
    console.log(
      `[${idx}]`,
      {
        id: f.id,
        cityId: f.cityId,
        zoneId: f.zoneId,
        wardId: f.wardId,
        requestedById: f.requestedById,
        status: f.status,
        createdAt: f.createdAt
      }
    );
  });

  // Map employee scope for each requester
  console.log("\nEmployee scope per feeder:");
  for (const f of feeders) {
    const scope = await prisma.userCity.findFirst({
      where: { userId: f.requestedById, cityId: f.cityId, role: Role.EMPLOYEE },
      select: { zoneIds: true, wardIds: true }
    });
    console.log({
      feederId: f.id,
      cityId: f.cityId,
      zoneId: f.zoneId,
      wardId: f.wardId,
      employeeUserId: f.requestedById,
      employeeZoneIds: scope?.zoneIds || [],
      employeeWardIds: scope?.wardIds || [],
      zoneMatch: !!(f.zoneId && scope?.zoneIds?.includes(f.zoneId)),
      wardMatch: !!(f.wardId && scope?.wardIds?.includes(f.wardId)),
      zoneIsNull: f.zoneId === null,
      wardIsNull: f.wardId === null
    });
  }

  const cityIds = Array.from(new Set(feeders.map((f) => f.cityId)));
  for (const cityId of cityIds) {
    console.log(`\n--- City ${cityId} ---`);
    const totalCity = await prisma.taskforceFeederPoint.count({ where: { cityId } });
    const totalPendingCity = await prisma.taskforceFeederPoint.count({ where: { cityId, status: "PENDING_QC" } });
    console.log({ totalCity, totalPendingCity });

    const qcRoles = await prisma.userModuleRole.findMany({
      where: { cityId, moduleId: moduleRow.id, role: Role.QC },
      select: { userId: true, zoneIds: true, wardIds: true, user: { select: { email: true, name: true } } }
    });

    if (!qcRoles.length) {
      console.log("No QC roles found for this city.");
      continue;
    }

    for (const qc of qcRoles) {
      const scope = { zoneIds: qc.zoneIds || [], wardIds: qc.wardIds || [] };
      const whereClause = {
        cityId,
        status: "PENDING_QC" as const,
        zoneId: { in: scope.zoneIds },
        wardId: { in: scope.wardIds }
      };
      const filteredCount =
        scope.zoneIds.length && scope.wardIds.length
          ? await prisma.taskforceFeederPoint.count({ where: whereClause })
          : 0;

      console.log("QC SCOPE", {
        qcId: qc.userId,
        email: qc.user?.email,
        zoneIds: scope.zoneIds,
        wardIds: scope.wardIds,
        filteredPending: filteredCount,
        query: whereClause
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
