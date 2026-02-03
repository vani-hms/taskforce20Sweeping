import "dotenv/config";
import { prisma } from "../src/prisma";
import { ToiletType, ToiletGender, ToiletStatus, Role } from "../generated/prisma";

async function main() {
    console.log("🌱 Seeding Sample Toilet Module Data");

    // 1. Get a city
    const city = await prisma.city.findFirst();
    if (!city) {
        console.log("❌ No city found. Please run main seed first.");
        return;
    }

    // 2. Get an employee
    const employee = await prisma.userCity.findFirst({
        where: { role: Role.EMPLOYEE, cityId: city.id },
        include: { user: true }
    });

    if (!employee) {
        console.log("ℹ️ No employee found in this city. Creating one...");
        // (Simplified creation if needed, but assuming base seed is run)
    }

    const testToilets = [
        {
            name: "Central Park Community Toilet",
            type: ToiletType.CT,
            gender: ToiletGender.UNISEX,
            address: "Near Central Fountain, Zone 1",
            latitude: 28.6139,
            longitude: 77.2090,
            status: ToiletStatus.APPROVED
        },
        {
            name: "Market Square Public Toilet",
            type: ToiletType.PT,
            gender: ToiletGender.MALE,
            address: "Main Market Gate, Ward 5",
            latitude: 28.6145,
            longitude: 77.2095,
            status: ToiletStatus.APPROVED
        },
        {
            name: "Railway Colony CT",
            type: ToiletType.CT,
            gender: ToiletGender.FEMALE,
            address: "Colony Block B, Ward 2",
            latitude: 28.6150,
            longitude: 77.2100,
            status: ToiletStatus.PENDING
        }
    ];

    console.log("Creating toilets...");
    const adminUser = await prisma.user.findFirst();
    if (!adminUser) return;

    for (const t of testToilets) {
        const created = await prisma.toilet.upsert({
            where: { code: t.name.replace(/\s+/g, '_').toUpperCase() },
            update: {},
            create: {
                ...t,
                code: t.name.replace(/\s+/g, '_').toUpperCase(),
                cityId: city.id,
                requestedById: adminUser.id
            }
        });

        // Assign to employee if exists
        if (employee) {
            await prisma.toiletAssignment.upsert({
                where: {
                    toiletId_employeeId: {
                        toiletId: created.id,
                        employeeId: employee.userId
                    }
                },
                update: {},
                create: {
                    cityId: city.id,
                    toiletId: created.id,
                    employeeId: employee.userId
                }
            });
        }
    }

    console.log("✅ Sample toilet data seeded!");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
