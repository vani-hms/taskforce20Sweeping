import { prisma } from "./prisma";

async function main() {
    const users = await prisma.userCity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { name: true, email: true } },
            city: { select: { name: true } }
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
