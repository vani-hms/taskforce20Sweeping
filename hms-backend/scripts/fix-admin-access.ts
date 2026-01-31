import "dotenv/config";
import { prisma } from "../src/prisma";
import { hashPassword } from "../src/auth/password";
import { Role } from "../generated/prisma";

async function main() {
    console.log("🌱 Creating Super Admin with ALL Modules & ALL Roles...");

    const email = process.env.SEED_HMS_EMAIL || "admin@hms.local";
    const password = process.env.SEED_HMS_PASSWORD || "ChangeMe!123";
    const name = process.env.SEED_HMS_NAME || "HMS Super Admin";
    // Ensure we match the "key" used in the code (LITTERBINS vs TWINBIN)
    // The backend seems to use "LITTERBINS" as the canonical key, but "TWINBIN" might be in legacy map.
    // Best to ensure the canonical names exist.
    const modules = ["TASKFORCE", "TOILET", "LITTERBINS", "SWEEPING"];

    // 1. Ensure HMS
    let hms = await prisma.hMS.findFirst();
    if (!hms) {
        hms = await prisma.hMS.create({ data: { name: "HMS" } });
    }

    // 2. Ensure Schema of Modules
    for (const mod of modules) {
        await prisma.module.upsert({
            where: { name: mod },
            update: {},
            create: { name: mod, displayName: mod }
        });
    }

    // 3. Ensure User Exists
    const hashed = await hashPassword(password);
    const user = await prisma.user.upsert({
        where: { email },
        update: { password: hashed, name },
        create: { email, password: hashed, name }
    });

    // 4. Find valid city to assign
    const city = await prisma.city.findFirst();
    if (!city) {
        console.log("❌ No city found. Run full seed first.");
        return;
    }

    // 5. GRANT ACCESS TO ALL MODULES with MULTIPLE ROLES
    console.log(`Giving ${user.email} access to all modules in ${city.name} with ALL roles...`);

    const allModules = await prisma.module.findMany();

    // Create a combined role list or just iterate and upsert permissions
    const rolesToAssign = [Role.CITY_ADMIN, Role.QC, Role.EMPLOYEE, Role.ACTION_OFFICER];

    for (const m of allModules) {
        // 5a. Enable module for city if not already
        await prisma.cityModule.upsert({
            where: { cityId_moduleId: { cityId: city.id, moduleId: m.id } },
            update: { enabled: true },
            create: { cityId: city.id, moduleId: m.id, enabled: true }
        });

        // 5b. Assign roles
        for (const role of rolesToAssign) {
            await prisma.userModuleRole.upsert({
                where: {
                    userId_cityId_moduleId_role: {
                        userId: user.id,
                        cityId: city.id,
                        moduleId: m.id,
                        role: role
                    }
                },
                update: {}, // already exists, do nothing
                create: {
                    userId: user.id,
                    cityId: city.id,
                    moduleId: m.id,
                    role: role,
                    canWrite: true
                }
            });
        }
    }

    console.log("✅ FIXED: Admin now has ALL roles (Admin, QC, Employee, AO) for ALL modules.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
