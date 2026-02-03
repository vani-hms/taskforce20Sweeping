import { PrismaClient } from "./generated/prisma";
const prisma = new PrismaClient();
async function run() {
    const toilets = await prisma.toilet.findMany({ select: { name: true, status: true, cityId: true, city: { select: { name: true } } } });
    for (const t of toilets) {
        console.log(`TOILET|${t.name}|${t.status}|${t.cityId}|${t.city?.name}`);
    }
}
run().finally(() => prisma.$disconnect());
