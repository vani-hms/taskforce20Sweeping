
import { prisma } from "./prisma";

async function main() {
    const rishi = await prisma.user.findFirst({ where: { name: { contains: "rishi", mode: "insensitive" } } });
    console.log("Rishi:", rishi?.id);
    if (rishi) {
        const assignments = await prisma.toiletAssignment.findMany({
            where: { employeeId: rishi.id },
            include: { toilet: true }
        });
        console.log("Rishi assignments:", JSON.stringify(assignments, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
