
import { prisma } from "./prisma";

async function debug() {
    const employeeId = "rishi-id"; // I need a real ID
    const toiletId = "tyu-id"; // I need a real ID
    const cityId = "city-id"; // I need a real ID

    try {
        const toilet = await prisma.toilet.findUnique({
            where: { id: toiletId },
            select: { assignedEmployeeIds: true }
        });
        console.log("Toilet found:", toilet);

        if (!toilet) {
            console.log("Toilet not found");
            return;
        }

        const updatedIds = toilet.assignedEmployeeIds.filter(id => id !== employeeId);
        console.log("Updated IDs:", updatedIds);

        const result = await prisma.$transaction([
            prisma.toilet.update({
                where: { id: toiletId },
                data: {
                    assignedEmployeeIds: {
                        set: updatedIds
                    }
                }
            }),
            prisma.toiletAssignment.deleteMany({
                where: {
                    toiletId,
                    employeeId,
                    cityId
                }
            })
        ]);
        console.log("Transaction success:", result);
    } catch (err) {
        console.error("Transaction failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
