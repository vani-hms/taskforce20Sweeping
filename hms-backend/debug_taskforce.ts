
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- START DEBUG ---");

    // 1. Get ALL PENDING_QC records
    const allPending = await prisma.taskforceFeederPoint.findMany({
        where: { status: 'PENDING_QC' },
        select: { id: true, cityId: true, zoneId: true, wardId: true, requestedById: true }
    });

    console.log(`Total PENDING_QC Records in DB: ${allPending.length}`);
    allPending.forEach((p, i) => {
        console.log(`[${i}] ID: ${p.id}, City: ${p.cityId}, Zone: ${p.zoneId}, Ward: ${p.wardId}`);
    });

    if (allPending.length === 0) {
        console.log("No records to debug.");
        return;
    }

    // 2. Find a QC User
    const moduleId = await prisma.module.findFirst({ where: { key: 'TASKFORCE' } });
    if (!moduleId) { console.error("Module TASKFORCE not found"); return; }

    console.log(`Module ID: ${moduleId.id}`);

    // Find FIRST QC User involved (maybe the one who requested if they have dual role, or just any QC)
    const userRole = await prisma.userModuleRole.findFirst({
        where: { moduleId: moduleId.id, role: 'QC' },
        include: { user: true }
    });

    if (!userRole) { console.log("No QC User found."); return; }

    const userId = userRole.userId;
    console.log(`Checking Scope for QC User: ${userId} (${userRole.user.email})`);

    // Get Scope
    const userScope = await prisma.userModuleRole.findMany({
        where: { userId: userId, moduleId: moduleId.id, role: 'QC' }
    });

    const zoneIds = userScope.flatMap(r => r.zoneId ? [r.zoneId] : []);
    const wardIds = userScope.flatMap(r => r.wardId ? [r.wardId] : []);

    console.log(`QC Scope: Zones [${zoneIds.length}], Wards [${wardIds.length}]`);

    // 3. Match
    const visible = allPending.filter(p => {
        const zMatch = p.zoneId && zoneIds.includes(p.zoneId);
        const wMatch = p.wardId && wardIds.includes(p.wardId);
        // Logic in backend uses OR: if zone matches OR ward matches.
        return zMatch || wMatch;
    });

    console.log(`Visible to this QC: ${visible.length}`);
    console.log(`Invisible: ${allPending.length - visible.length}`);

    if (visible.length < allPending.length) {
        console.log("CONCLUSION: Some records are invisible due to Scope Mismatch or Missing Zone/Ward.");
    } else {
        console.log("CONCLUSION: All records should be visible. If not appearing in App, check Frontend/API.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
