import "dotenv/config";
import { prisma } from "../src/prisma";

async function main() {
  console.log("⏱️ Renaming IEC module to TOILET...");

  const iec = await prisma.module.findUnique({ where: { name: "IEC" } });
  const toilet = await prisma.module.findUnique({ where: { name: "TOILET" } });

  if (!iec && toilet) {
    console.log("✅ TOILET already present; IEC not found. Nothing to do.");
    return;
  }

  if (iec && !toilet) {
    await prisma.module.update({ where: { id: iec.id }, data: { name: "TOILET", isActive: true } });
    console.log("✅ Renamed IEC to TOILET (same module id).");
    return;
  }

  if (!iec && !toilet) {
    await prisma.module.create({ data: { name: "TOILET", isActive: true } });
    console.log("✅ Created TOILET module (IEC did not exist).");
    return;
  }

  // Both exist with different ids: migrate dependent rows to TOILET and remove IEC.
  if (iec && toilet && iec.id !== toilet.id) {
    console.log("ℹ️ IEC and TOILET both exist; migrating IEC-linked rows to TOILET...");

    const [cityModules, userModules] = await prisma.$transaction([
      prisma.cityModule.findMany({ where: { moduleId: iec.id } }),
      prisma.userModuleRole.findMany({ where: { moduleId: iec.id } })
    ]);

    await prisma.$transaction([
      prisma.cityModule.createMany({
        data: cityModules.map((cm) => ({ cityId: cm.cityId, moduleId: toilet.id, enabled: cm.enabled })),
        skipDuplicates: true
      }),
      prisma.userModuleRole.createMany({
        data: userModules.map((m) => ({
          userId: m.userId,
          cityId: m.cityId,
          moduleId: toilet.id,
          role: m.role,
          canWrite: m.canWrite
        })),
        skipDuplicates: true
      }),
      prisma.iECForm.updateMany({ where: { moduleId: iec.id }, data: { moduleId: toilet.id } }),
      prisma.module.delete({ where: { id: iec.id } })
    ]);

    console.log("✅ Migrated IEC data to TOILET and removed IEC module record.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Rename failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
