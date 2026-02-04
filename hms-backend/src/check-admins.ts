
import { prisma } from "./prisma";

async function main() {
    const admins = await prisma.userCity.findMany({
        where: { role: "CITY_ADMIN" },
        include: { user: { include: { modules: { include: { module: true } } } } }
    });
    console.log("City Admins:", JSON.stringify(admins, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
