import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("Starting test data seeding...");

  // Get existing trainer
  const trainer = await prisma.trainerProfile.findFirst({
    include: { user: true },
  });

  if (!trainer) {
    console.log("No trainer found. Please create a trainer first.");
    return;
  }

  console.log(`Using trainer: ${trainer.user.name}`);

  const now = new Date();
  const hashedPassword = await bcrypt.hash("test1234", 10);

  // Create test members and payments for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(10, 0, 0, 0);

    // Create 1-3 members per day
    const memberCount = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < memberCount; j++) {
      const memberName = `테스트회원_${date.getMonth() + 1}월${date.getDate()}일_${j + 1}`;
      const email = `test_${date.getTime()}_${j}@example.com`;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        console.log(`Skipping existing user: ${email}`);
        continue;
      }

      // Create user and member profile
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: memberName,
          phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          role: "MEMBER",
          createdAt: date,
          memberProfile: {
            create: {
              trainerId: trainer.id,
              remainingPT: 0,
              joinDate: date,
              createdAt: date,
              gender: Math.random() > 0.5 ? "MALE" : "FEMALE",
              birthDate: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            },
          },
        },
        include: { memberProfile: true },
      });

      console.log(`Created member: ${memberName} (${date.toLocaleDateString("ko-KR")})`);

      // Create 1-2 payments per member
      const paymentCount = Math.floor(Math.random() * 2) + 1;
      const paymentAmounts = [300000, 500000, 700000, 1000000, 1500000];
      const ptCounts = [10, 20, 30, 40, 50];

      for (let k = 0; k < paymentCount; k++) {
        const paymentDate = new Date(date);
        paymentDate.setHours(11 + k, Math.floor(Math.random() * 60), 0, 0);

        const amountIndex = Math.floor(Math.random() * paymentAmounts.length);
        const amount = paymentAmounts[amountIndex];
        const ptCount = ptCounts[amountIndex];

        await prisma.payment.create({
          data: {
            memberProfileId: user.memberProfile!.id,
            amount,
            ptCount,
            status: "COMPLETED",
            description: `PT ${ptCount}회 등록`,
            paidAt: paymentDate,
            createdAt: paymentDate,
          },
        });

        // Update remaining PT
        await prisma.memberProfile.update({
          where: { id: user.memberProfile!.id },
          data: { remainingPT: { increment: ptCount } },
        });

        console.log(`  - Payment: ₩${amount.toLocaleString()} (${ptCount}회)`);
      }

      // Create some attendances for older members (not today)
      if (i > 0 && Math.random() > 0.3) {
        const attendanceCount = Math.floor(Math.random() * 3) + 1;

        for (let a = 0; a < attendanceCount; a++) {
          const attendanceDate = new Date(date);
          attendanceDate.setDate(attendanceDate.getDate() + Math.floor(Math.random() * i));
          attendanceDate.setHours(14 + a, Math.floor(Math.random() * 60), 0, 0);

          // Check if we have remaining PT
          const memberProfile = await prisma.memberProfile.findUnique({
            where: { id: user.memberProfile!.id },
          });

          if (memberProfile && memberProfile.remainingPT > 0) {
            // Create schedule
            const schedule = await prisma.schedule.create({
              data: {
                memberProfileId: user.memberProfile!.id,
                trainerId: trainer.id,
                scheduledAt: attendanceDate,
                status: "COMPLETED",
                createdAt: attendanceDate,
              },
            });

            // Calculate unit price
            const payments = await prisma.payment.findMany({
              where: { memberProfileId: user.memberProfile!.id, status: "COMPLETED" },
              select: { amount: true, ptCount: true },
            });
            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
            const totalPTCount = payments.reduce((sum, p) => sum + p.ptCount, 0);
            const unitPrice = totalPTCount > 0 ? Math.round(totalAmount / totalPTCount) : null;

            const remainingPTAfter = memberProfile.remainingPT - 1;

            // Create attendance
            await prisma.attendance.create({
              data: {
                memberProfileId: user.memberProfile!.id,
                scheduleId: schedule.id,
                checkInTime: attendanceDate,
                remainingPTAfter,
                unitPrice,
                createdAt: attendanceDate,
              },
            });

            // Decrement remaining PT
            await prisma.memberProfile.update({
              where: { id: user.memberProfile!.id },
              data: { remainingPT: { decrement: 1 } },
            });

            console.log(`  - Attendance: ${attendanceDate.toLocaleDateString("ko-KR")} (unitPrice: ₩${unitPrice?.toLocaleString()})`);
          }
        }
      }
    }
  }

  console.log("\nTest data seeding complete!");

  // Summary
  const totalMembers = await prisma.memberProfile.count();
  const totalPayments = await prisma.payment.count();
  const totalAttendances = await prisma.attendance.count();

  console.log(`\nSummary:`);
  console.log(`- Total members: ${totalMembers}`);
  console.log(`- Total payments: ${totalPayments}`);
  console.log(`- Total attendances: ${totalAttendances}`);
}

seedTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
