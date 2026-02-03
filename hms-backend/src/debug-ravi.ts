import { prisma } from "./prisma";

async function main() {
    const users = await prisma.userCity.findMany({
        where: { user: { name: { contains: 'ravi', mode: 'insensitive' } } },
        include: {
            user: { select: { id: true, name: true, email: true } },
            city: { select: { id: true, name: true } }
        }
    });
    console.log("Ravi Users:", JSON.stringify(users, null, 2));

    if (users.length > 0) {
        const cityId = users[0].cityId;
        const inspections = await prisma.toiletInspection.count({
            where: { cityId, status: 'SUBMITTED' }
        });
        console.log(`Submitted inspections in ${users[0].city.name}: ${inspections}`);

        const allInspections = await prisma.toiletInspection.findMany({
            where: { cityId },
            take: 5,
            select: { id: true, status: true, createdAt: true }
        });
        console.log("Sample Inspections:", JSON.stringify(allInspections, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
