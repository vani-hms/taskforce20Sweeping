import { prisma } from "./prisma";

async function main() {
    const inspections = await prisma.toiletInspection.findMany({
        include: {
            toilet: { select: { name: true, cityId: true } },
            employee: { select: { name: true } }
        }
    });
    console.log("Total Inspections:", inspections.length);
    if (inspections.length > 0) {
        console.log("Inspections with City IDs:", inspections.map(i => ({
            id: i.id,
            status: i.status,
            cityId: i.cityId,
            toiletCityId: i.toilet?.cityId,
            employee: i.employee?.name
        })));
    }

    const cities = await prisma.city.findMany({
        select: { id: true, name: true }
    });
    console.log("Cities Map:", JSON.stringify(cities, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
