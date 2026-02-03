import "dotenv/config";
import { prisma } from "../src/prisma";
import { Role } from "../generated/prisma";

async function main() {
    console.log("🚀 Enabling TOILET module for existing users...");

    // 1. Ensure Module Exists
    const toiletModule = await prisma.module.upsert({
        where: { name: "TOILET" },
        update: {},
        create: { name: "TOILET", displayName: "Cleanliness of Toilets" }
    });
    console.log(`✅ Module 'TOILET' ensured (ID: ${toiletModule.id})`);

    // 2. Fetch all Cities
    const cities = await prisma.city.findMany({ where: { enabled: true } });
    console.log(`ℹ️ Found ${cities.length} active cities.`);

    for (const city of cities) {
        console.log(`Processing City: ${city.name} (${city.code})...`);

        // 3. Enable Module for City
        await prisma.cityModule.upsert({
            where: {
                cityId_moduleId: {
                    cityId: city.id,
                    moduleId: toiletModule.id
                }
            },
            update: { enabled: true },
            create: {
                cityId: city.id,
                moduleId: toiletModule.id,
                enabled: true
            }
        });

        // 4. Grant Permissions to Existing Admins/QC
        // We find users who already have roles in this city
        const existingRoles = await prisma.userModuleRole.findMany({
            where: {
                cityId: city.id,
                role: { in: [Role.CITY_ADMIN, Role.QC, Role.ACTION_OFFICER, Role.COMMISSIONER, Role.HMS_SUPER_ADMIN] }
            },
            distinct: ['userId', 'role'] // We only need unique user-role pairs
        });

        let granted = 0;
        for (const userRole of existingRoles) {
            // Check if they already have access to TOILET
            const exists = await prisma.userModuleRole.findUnique({
                where: {
                    userId_cityId_moduleId_role: {
                        userId: userRole.userId,
                        cityId: city.id,
                        moduleId: toiletModule.id,
                        role: userRole.role
                    }
                }
            });

            if (!exists) {
                await prisma.userModuleRole.create({
                    data: {
                        userId: userRole.userId,
                        cityId: city.id,
                        moduleId: toiletModule.id,
                        role: userRole.role,
                        canWrite: true
                    }
                });
                granted++;
            }
        }
        console.log(`   Granted access to ${granted} existing admins/officers.`);
    }

    // 5. Grant Super Admin Access (Global)
    const superAdmins = await prisma.user.findMany({
        where: { name: { contains: "Admin", mode: 'insensitive' } } // Rough check, better to check email
    });

    console.log("✅ Migration completed!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
