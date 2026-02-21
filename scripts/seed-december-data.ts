import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDecemberData() {
  console.log("Starting December test data seeding...");

  // Get the default shop (or first active shop)
  let defaultShop = await prisma.pTShop.findFirst({
    where: { isActive: true },
  });

  if (!defaultShop) {
    console.log("No active shop found. Creating default shop...");
    defaultShop = await prisma.pTShop.create({
      data: {
        name: "Default PT Shop",
        slug: "default",
        description: "기본 PT샵",
        isActive: true,
      },
    });
  }

  console.log(`Using shop: ${defaultShop.name} (${defaultShop.id})`);

  // Get existing trainer
  const trainers = await prisma.trainerProfile.findMany({
    include: { user: true },
    where: { shopId: defaultShop.id },
  });

  if (trainers.length === 0) {
    console.log("No trainer found for this shop. Please create a trainer first.");
    return;
  }

  console.log(`Found ${trainers.length} trainers`);

  const hashedPassword = await bcrypt.hash("test1234", 10);

  // Start from December 1st, 2024
  const startDate = new Date(2024, 11, 1); // December 1, 2024
  const endDate = new Date(); // Today
  endDate.setHours(23, 59, 59, 999);

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`Creating data for ${daysDiff} days (Dec 1, 2024 to today)`);

  const paymentAmounts = [300000, 500000, 700000, 1000000, 1500000];
  const ptCounts = [10, 20, 30, 40, 50];

  let totalMembersCreated = 0;
  let totalPaymentsCreated = 0;
  let totalAttendancesCreated = 0;

  // Create members for each day
  for (let dayOffset = 0; dayOffset < daysDiff; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);

    // Skip future dates
    if (currentDate > new Date()) break;

    // Create 0-3 members per day (weighted towards 1-2)
    const memberCount = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < memberCount; j++) {
      const trainer = trainers[Math.floor(Math.random() * trainers.length)];
      const dateStr = `${currentDate.getMonth() + 1}월${currentDate.getDate()}일`;
      const memberName = `회원_${dateStr}_${j + 1}`;
      const email = `member_${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, "0")}${currentDate.getDate().toString().padStart(2, "0")}_${j}_${Date.now()}@test.com`;

      try {
        // Create user and member profile
        const joinDate = new Date(currentDate);
        joinDate.setHours(9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);

        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name: memberName,
            phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            roles: ["MEMBER"],
            createdAt: joinDate,
            shopId: defaultShop.id,
            memberProfile: {
              create: {
                shopId: defaultShop.id,
                trainerId: trainer.id,
                remainingPT: 0,
                joinDate: joinDate,
                createdAt: joinDate,
                gender: Math.random() > 0.5 ? "MALE" : "FEMALE",
                birthDate: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
              },
            },
          },
          include: { memberProfile: true },
        });

        totalMembersCreated++;

        // Create 1-2 payments per member
        const paymentCount = Math.floor(Math.random() * 2) + 1;

        for (let k = 0; k < paymentCount; k++) {
          const paymentDate = new Date(joinDate);
          paymentDate.setHours(joinDate.getHours() + k + 1, Math.floor(Math.random() * 60), 0, 0);

          const amountIndex = Math.floor(Math.random() * paymentAmounts.length);
          const amount = paymentAmounts[amountIndex];
          const ptCount = ptCounts[amountIndex];

          await prisma.payment.create({
            data: {
              memberProfileId: user.memberProfile!.id,
              shopId: defaultShop.id,
              amount,
              ptCount,
              status: "COMPLETED",
              description: `PT ${ptCount}회 등록`,
              paidAt: paymentDate,
              createdAt: paymentDate,
            },
          });

          await prisma.memberProfile.update({
            where: { id: user.memberProfile!.id },
            data: { remainingPT: { increment: ptCount } },
          });

          totalPaymentsCreated++;
        }

        // Create attendances for this member (spread over days after joining)
        const daysUntilNow = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const attendanceDays = Math.min(Math.floor(Math.random() * 8) + 2, daysUntilNow); // 2-9 attendance days

        for (let a = 0; a < attendanceDays; a++) {
          const memberProfile = await prisma.memberProfile.findUnique({
            where: { id: user.memberProfile!.id },
          });

          if (!memberProfile || memberProfile.remainingPT <= 0) break;

          const attendanceDate = new Date(currentDate);
          attendanceDate.setDate(currentDate.getDate() + Math.floor((a + 1) * (daysUntilNow / attendanceDays)));

          // Skip if attendance date is in the future
          if (attendanceDate > new Date()) continue;

          attendanceDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

          // Create schedule
          const schedule = await prisma.schedule.create({
            data: {
              memberProfileId: user.memberProfile!.id,
              trainerId: trainer.id,
              shopId: defaultShop.id,
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

          await prisma.attendance.create({
            data: {
              memberProfileId: user.memberProfile!.id,
              scheduleId: schedule.id,
              shopId: defaultShop.id,
              checkInTime: attendanceDate,
              remainingPTAfter,
              unitPrice,
              createdAt: attendanceDate,
            },
          });

          await prisma.memberProfile.update({
            where: { id: user.memberProfile!.id },
            data: { remainingPT: { decrement: 1 } },
          });

          totalAttendancesCreated++;
        }
      } catch (error) {
        console.error(`Error creating member ${memberName}:`, error);
      }
    }

    // Progress log every 7 days
    if (dayOffset % 7 === 0) {
      console.log(`Progress: Day ${dayOffset + 1}/${daysDiff} - ${currentDate.toLocaleDateString("ko-KR")}`);
    }
  }

  console.log("\n=== December Data Seeding Complete! ===");
  console.log(`Created ${totalMembersCreated} members`);
  console.log(`Created ${totalPaymentsCreated} payments`);
  console.log(`Created ${totalAttendancesCreated} attendances`);

  // Final summary
  const totalMembers = await prisma.memberProfile.count();
  const totalPayments = await prisma.payment.count();
  const totalAttendances = await prisma.attendance.count();
  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "COMPLETED" },
  });

  console.log("\n=== Database Summary ===");
  console.log(`Total members: ${totalMembers}`);
  console.log(`Total payments: ${totalPayments}`);
  console.log(`Total attendances: ${totalAttendances}`);
  console.log(`Total revenue: ₩${totalRevenue._sum.amount?.toLocaleString() || 0}`);
}

seedDecemberData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
