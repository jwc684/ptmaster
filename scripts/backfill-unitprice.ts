import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillUnitPrice() {
  console.log("Starting unitPrice backfill...");

  // Get all attendances without unitPrice
  const attendances = await prisma.attendance.findMany({
    where: { unitPrice: null },
    select: {
      id: true,
      memberProfileId: true,
    },
  });

  console.log(`Found ${attendances.length} attendance records without unitPrice`);

  let updated = 0;
  let skipped = 0;

  for (const attendance of attendances) {
    // Calculate unit price from member's payments
    const payments = await prisma.payment.findMany({
      where: {
        memberProfileId: attendance.memberProfileId,
        status: "COMPLETED",
      },
      select: { amount: true, ptCount: true },
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPTCount = payments.reduce((sum, p) => sum + p.ptCount, 0);

    if (totalPTCount > 0) {
      const unitPrice = Math.round(totalAmount / totalPTCount);

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { unitPrice },
      });

      updated++;
      console.log(`Updated attendance ${attendance.id} with unitPrice: ${unitPrice}`);
    } else {
      skipped++;
      console.log(`Skipped attendance ${attendance.id} - no payment records`);
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

backfillUnitPrice()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
