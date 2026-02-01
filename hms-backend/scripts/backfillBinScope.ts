
import { prisma } from "../src/prisma";

async function main() {
    console.log("Starting backfill of missing QC scope (zoneId/wardId) for bins...");

    const bins = await prisma.litterBin.findMany({
        where: {
            OR: [{ zoneId: null }, { wardId: null }]
        },
        include: {
            requestedBy: true
        }
    });

    console.log(`Found ${bins.length} bins with missing scope.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const bin of bins) {
        if (!bin.requestedBy) {
            console.warn(`Bin ${bin.id} has no requester. Skipping.`);
            skippedCount++;
            continue;
        }

        // Find requester's scope (Employee role)
        // Note: Assuming 'EMPLOYEE' role for requester context, or fallback to any role's scope if needed.
        // Usually bins are requested by EMPLOYEES.
        const userCity = await prisma.userCity.findFirst({
            where: {
                userId: bin.requestedById,
                cityId: bin.cityId,
                role: "EMPLOYEE"
            }
        });

        if (!userCity || !userCity.zoneIds || userCity.zoneIds.length === 0) {
            console.warn(`Requester ${bin.requestedById} has no EMPLOYEE scope. Skipping bin ${bin.id}.`);
            skippedCount++;
            continue;
        }

        // Fallback: Take the first zone and first ward
        const zoneId = userCity.zoneIds[0];
        const wardId = userCity.wardIds?.[0]; // Scope might have only zones? Usually wardIds should match parent zone.

        if (!zoneId || !wardId) {
            console.warn(`Requester ${bin.requestedById} has incomplete scope (Zone: ${zoneId}, Ward: ${wardId}). Skipping bin ${bin.id}.`);
            skippedCount++;
            continue;
        }

        console.log(`Updating bin ${bin.id} -> Zone: ${zoneId}, Ward: ${wardId}`);

        await prisma.litterBin.update({
            where: { id: bin.id },
            data: {
                zoneId,
                wardId
            }
        });
        updatedCount++;
    }

    console.log(`Backfill complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
