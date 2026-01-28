const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();
(async () => {
  const mod = await prisma.module.upsert({
    where: { name: 'LITTERBINS' },
    update: { isActive: true },
    create: { name: 'LITTERBINS', isActive: true }
  });
  const [cities, existing] = await Promise.all([
    prisma.city.findMany({ select: { id: true } }),
    prisma.cityModule.findMany({ where: { moduleId: mod.id }, select: { cityId: true } })
  ]);
  const existingSet = new Set(existing.map((e) => e.cityId));
  const missing = cities.filter((c) => !existingSet.has(c.id));
  if (missing.length) {
    await prisma.cityModule.createMany({
      data: missing.map((c) => ({ cityId: c.id, moduleId: mod.id, enabled: true })),
      skipDuplicates: true
    });
  }
  console.log(`LITTERBINS module ensured; added ${missing.length} city mappings; total cities ${cities.length}`);
  await prisma.$disconnect();
})();
