
import { prisma } from "./prisma";

async function main() {
    const assignments = await prisma.toiletAssignment.findMany({
        include: {
            employee: { select: { name: true } },
            toilet: { select: { name: true } }
        },
        take: 10
    });
    console.log("Assignments:", JSON.stringify(assignments, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
