import { PrismaClient, ToiletStatus, Role } from "./generated/prisma";

const prisma = new PrismaClient();

async function debugToilets() {
    const toilets = await prisma.toilet.findMany({
        include: { city: true }
    });

    console.log("=== TOILET STATUS REPORT ===");
    for (const t of toilets) {
        console.log(`Toilet: ${t.name}, Status: ${t.status}, City: ${t.city?.name} (ID: ${t.cityId})`);
    }

    const users = await prisma.user.findMany({
        where: { email: { contains: 'admin' } },
        include: {
            cities: { include: { city: true } }
        }
    });

    console.log("\n=== ADMIN USERS REPORT ===");
    for (const u of users) {
        console.log(`User: ${u.email} (${u.name})`);
        for (const c of u.cities) {
            console.log(`  - City: ${c.city.name} (ID: ${c.cityId}), Role: ${c.role}`);
        }
    }
}

debugToilets()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
