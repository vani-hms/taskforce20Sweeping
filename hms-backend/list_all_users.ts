import { prisma } from "./src/prisma";

async function listAllUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            cities: {
                select: {
                    role: true,
                    city: { select: { name: true, id: true } }
                }
            },
            modules: {
                select: {
                    role: true,
                    module: { select: { name: true } }
                }
            }
        }
    });

    console.log("\n=== ALL USERS IN DATABASE ===\n");
    users.forEach(u => {
        console.log(`📧 ${u.email} (${u.name})`);
        console.log(`   ID: ${u.id}`);
        u.cities.forEach(c => console.log(`   🏙️  ${c.role} in ${c.city.name} (${c.city.id})`));
        u.modules.forEach(m => console.log(`   📦 ${m.role} for ${m.module.name}`));
        console.log("");
    });
}

listAllUsers().catch(console.error).finally(() => prisma.$disconnect());
