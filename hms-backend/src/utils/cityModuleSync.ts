import { prisma } from "../prisma";

/**
 * Ensure every module has a CityModule row for the given city.
 * Missing pairs are created with enabled=true; existing rows are untouched.
 */
export async function syncCityModules(cityId: string) {
  const [modules, existing] = await prisma.$transaction([
    prisma.module.findMany({ select: { id: true } }),
    prisma.cityModule.findMany({ where: { cityId }, select: { moduleId: true } })
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

  return modules;
}

/**
 * Sync CityModule rows across all cities. Idempotent and safe to call at startup.
 */
export async function syncAllCityModules() {
  const [cities, modules] = await prisma.$transaction([
    prisma.city.findMany({ select: { id: true } }),
    prisma.module.findMany({ select: { id: true } })
  ]);

  if (!cities.length || !modules.length) return;

  const data = cities.flatMap((city) =>
    modules.map((module) => ({ cityId: city.id, moduleId: module.id, enabled: true }))
  );

  if (data.length) {
    await prisma.cityModule.createMany({ data, skipDuplicates: true });
  }
}
