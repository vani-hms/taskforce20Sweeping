import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function qcEscalationJob() {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const overdue = await prisma.sweepingInspection.findMany({
    where: {
      status: "REVIEW_PENDING",
      createdAt: { lt: cutoff }
    }
  });

  for (const i of overdue) {
    await prisma.inspectionAudit.create({
      data: {
        inspectionId: i.id,
        fromStatus: "REVIEW_PENDING",
        toStatus: "ESCALATED",
        actorId: "SYSTEM"
      }
    });

    await prisma.sweepingInspection.update({
      where: { id: i.id },
      data: { status: "ESCALATED" }
    });
  }

  console.log("QC Escalations:", overdue.length);
}
