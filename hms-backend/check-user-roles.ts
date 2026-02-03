import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();

async function checkUserRoles() {
    const user = await prisma.user.findFirst({
        where: { email: 'admin_ldr@hms.com' },
        include: {
            modules: {
                include: { module: true }
            }
        }
    });

    if (!user) {
        console.log("User not found");
        return;
    }

    console.log(`User: ${user.email}`);
    for (const m of user.modules) {
        console.log(`- Module: ${m.module.key}, Roles: ${JSON.stringify(m.roles)}, canWrite: ${m.canWrite}`);
    }
}

checkUserRoles()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
