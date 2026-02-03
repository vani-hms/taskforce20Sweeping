
import { prisma } from "./prisma";

async function main() {
    const roles = await prisma.userModuleRole.findMany({
        where: { user: { name: { contains: "rishi", mode: "insensitive" } } },
        include: { module: true }
    });
    console.log("Rishi module roles:", JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
