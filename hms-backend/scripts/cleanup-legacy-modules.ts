import "dotenv/config";
import { prisma } from "../src/prisma";

const CANONICAL = ["TASKFORCE", "LITTERBINS", "SWEEPING", "TOILET"] as const;
const LEGACY_MAP: Record<string, (typeof CANONICAL)[number]> = {
  TWINBIN: "LITTERBINS",
  SWEEP_RES: "SWEEPING",
  SWEEP_COM: "SWEEPING"
};

async function ensureCanonicalModules() {
  const entries = await Promise.all(
    CANONICAL.map((name) =>
      prisma.module.upsert({
        where: { name },
        update: { isActive: true },
        create: { name, isActive: true }
      })
    )
  );
  return Object.fromEntries(entries.map((m) => [m.name, m]));
}

async function migrateCityModules(legacyId: string, canonicalId: string) {
  const cityModules = await prisma.cityModule.findMany({ where: { moduleId: legacyId } });
  for (const cm of cityModules) {
    await prisma.cityModule.upsert({
      where: { cityId_moduleId: { cityId: cm.cityId, moduleId: canonicalId } },
      update: { enabled: cm.enabled },
      create: { cityId: cm.cityId, moduleId: canonicalId, enabled: cm.enabled }
    });
  }
  await prisma.cityModule.deleteMany({ where: { moduleId: legacyId } });
}

async function migrateUserModuleRoles(legacyId: string, canonicalId: string) {
  const roles = await prisma.userModuleRole.findMany({ where: { moduleId: legacyId } });
  for (const r of roles) {
    await prisma.userModuleRole.upsert({
      where: { userId_cityId_moduleId_role: { userId: r.userId, cityId: r.cityId, moduleId: canonicalId, role: r.role } },
      update: {
        canWrite: r.canWrite,
        zoneIds: r.zoneIds,
        wardIds: r.wardIds
      },
      create: {
        userId: r.userId,
        cityId: r.cityId,
        moduleId: canonicalId,
        role: r.role,
        canWrite: r.canWrite,
        zoneIds: r.zoneIds,
        wardIds: r.wardIds
      }
    });
  }
  await prisma.userModuleRole.deleteMany({ where: { moduleId: legacyId } });
}

async function migrateLinkedTables(legacyId: string, canonicalId: string) {
  await prisma.permission.updateMany({ where: { moduleId: legacyId }, data: { moduleId: canonicalId } });
  await prisma.taskforceCase.updateMany({ where: { moduleId: legacyId }, data: { moduleId: canonicalId } });
  await prisma.taskforceActivity.updateMany({ where: { moduleId: legacyId }, data: { moduleId: canonicalId } });
  await prisma.iECForm.updateMany({ where: { moduleId: legacyId }, data: { moduleId: canonicalId } });
}

async function main() {
  console.log("Starting legacy module cleanup...");
  const canonicalMap = await ensureCanonicalModules();

  for (const [legacyName, canonicalName] of Object.entries(LEGACY_MAP)) {
    const legacy = await prisma.module.findUnique({ where: { name: legacyName } });
    if (!legacy) {
      console.log(`- ${legacyName}: not found, skipping`);
      continue;
    }

    const canonical = canonicalMap[canonicalName];
    console.log(`- Migrating ${legacyName} -> ${canonicalName}`);

    await migrateCityModules(legacy.id, canonical.id);
    await migrateUserModuleRoles(legacy.id, canonical.id);
    await migrateLinkedTables(legacy.id, canonical.id);

    await prisma.module.delete({ where: { id: legacy.id } });
    console.log(`  Removed legacy module ${legacyName}`);
  }

  console.log("Cleanup complete.");
}

main()
  .catch((err) => {
    console.error("Cleanup failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
