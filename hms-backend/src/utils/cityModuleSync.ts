import { prisma } from "../prisma";
import { CANONICAL_MODULE_KEYS } from "../modules/moduleMetadata";

/**
 * Ensure every module has a CityModule row for the given city.
 * Missing pairs are created with enabled=true; existing rows are untouched.
 */
export async function syncCityModules(cityId: string) {
  const [modules, existing, qcUsers] = await prisma.$transaction([
    prisma.module.findMany({ select: { id: true, name: true }, where: { name: { in: CANONICAL_MODULE_KEYS as any } } }),
    prisma.cityModule.findMany({ where: { cityId }, select: { moduleId: true } }),
    prisma.userCity.findMany({ where: { cityId, role: "QC" }, select: { userId: true } })
  ]);

  if (!modules.length) return modules;

  const existingSet = new Set(existing.map((m) => m.moduleId));
  const missing = modules.filter((m) => !existingSet.has(m.id));

  if (missing.length) {
    await prisma.cityModule.createMany({
      data: missing.map((m) => ({ cityId, moduleId: m.id, enabled: true })),
      skipDuplicates: true
    });
  }

  // Ensure QC users have UserModuleRole for enabled modules (read/review access)
  if (qcUsers.length && modules.length) {
    const qcIds = qcUsers.map((u) => u.userId);
    const enabledModules = modules.map((m) => m.id);

    const existingRoles = await prisma.userModuleRole.findMany({
      where: { cityId, userId: { in: qcIds }, moduleId: { in: enabledModules }, role: "QC" },
      select: { userId: true, moduleId: true }
    });
    const existingSet = new Set(existingRoles.map((r) => `${r.userId}:${r.moduleId}`));

    const toCreate: { userId: string; cityId: string; moduleId: string; role: "QC"; canWrite: boolean }[] = [];
    qcIds.forEach((userId) => {
      enabledModules.forEach((moduleId) => {
        const key = `${userId}:${moduleId}`;
        if (!existingSet.has(key)) {
          toCreate.push({ userId, cityId, moduleId, role: "QC", canWrite: false });
        }
      });
    });

    if (toCreate.length) {
      await prisma.userModuleRole.createMany({ data: toCreate, skipDuplicates: true });
    }
  }

  return modules;
}

/**
 * Sync CityModule rows across all cities. Idempotent and safe to call at startup.
 */
export async function syncAllCityModules() {
  const [cities, modules] = await prisma.$transaction([
    prisma.city.findMany({ select: { id: true } }),
    prisma.module.findMany({ select: { id: true, name: true }, where: { name: { in: CANONICAL_MODULE_KEYS as any } } })
  ]);

  if (!cities.length || !modules.length) return;

  const data = cities.flatMap((city) =>
    modules.map((module) => ({ cityId: city.id, moduleId: module.id, enabled: true }))
  );

  if (data.length) {
    await prisma.cityModule.createMany({ data, skipDuplicates: true });
  }

  // Ensure QC user module roles across all cities for enabled modules
  const qcUsers = await prisma.userCity.findMany({ where: { role: "QC" }, select: { userId: true, cityId: true } });
  if (qcUsers.length) {
    const moduleIds = modules.map((m) => m.id);
    const existing = await prisma.userModuleRole.findMany({
      where: { role: "QC", moduleId: { in: moduleIds } },
      select: { userId: true, cityId: true, moduleId: true }
    });
    const existingSet = new Set(existing.map((e) => `${e.userId}:${e.cityId}:${e.moduleId}`));
    const toCreate: { userId: string; cityId: string; moduleId: string; role: "QC"; canWrite: boolean }[] = [];
    qcUsers.forEach(({ userId, cityId }) => {
      moduleIds.forEach((moduleId) => {
        const key = `${userId}:${cityId}:${moduleId}`;
        if (!existingSet.has(key)) {
          toCreate.push({ userId, cityId, moduleId, role: "QC", canWrite: false });
        }
      });
    });
    if (toCreate.length) {
      await prisma.userModuleRole.createMany({ data: toCreate, skipDuplicates: true });
    }
  }
}
