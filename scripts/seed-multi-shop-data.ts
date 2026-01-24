import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SHOP_DATA = [
  { name: "강남 피트니스", slug: "gangnam-fitness", address: "서울시 강남구 테헤란로 123", phone: "02-1234-5678" },
  { name: "홍대 PT센터", slug: "hongdae-pt", address: "서울시 마포구 홍대입구역 45", phone: "02-2345-6789" },
  { name: "판교 헬스클럽", slug: "pangyo-health", address: "경기도 성남시 분당구 판교역로 67", phone: "031-345-6789" },
  { name: "해운대 짐", slug: "haeundae-gym", address: "부산시 해운대구 해운대해변로 89", phone: "051-456-7890" },
  { name: "대전 파워짐", slug: "daejeon-power", address: "대전시 서구 둔산동 234", phone: "042-567-8901" },
  { name: "인천 스포츠센터", slug: "incheon-sports", address: "인천시 연수구 송도동 456", phone: "032-678-9012" },
  { name: "수원 피트니스랩", slug: "suwon-fitlab", address: "경기도 수원시 영통구 광교로 78", phone: "031-789-0123" },
  { name: "제주 웰니스", slug: "jeju-wellness", address: "제주시 노형동 901", phone: "064-890-1234" },
  { name: "광주 바디샵", slug: "gwangju-bodyshop", address: "광주시 서구 상무대로 123", phone: "062-901-2345" },
  { name: "대구 머슬팩토리", slug: "daegu-muscle", address: "대구시 수성구 범어동 456", phone: "053-012-3456" },
];

const TRAINER_NAMES = ["김태훈", "이준호", "박민수", "최영진", "정우성", "강동원", "손흥민", "이강인"];
const MEMBER_FIRST_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const MEMBER_LAST_NAMES = ["민준", "서준", "예준", "도윤", "시우", "주원", "하준", "지호", "지후", "준서", "서연", "서윤", "지우", "서현", "민서", "하은", "하윤", "윤서", "지민", "채원"];

async function seedMultiShopData() {
  console.log("Starting multi-shop test data seeding...\n");

  const hashedPassword = await bcrypt.hash("test1234!", 10);
  const adminPassword = await bcrypt.hash("admin123!", 10);

  const startDate = new Date(2025, 11, 1); // December 1, 2025
  const endDate = new Date(2026, 0, 24); // January 24, 2026

  let totalShops = 0;
  let totalTrainers = 0;
  let totalMembers = 0;
  let totalPayments = 0;
  let totalAttendances = 0;

  for (const shopData of SHOP_DATA) {
    console.log(`\n=== Creating ${shopData.name} ===`);

    // Check if shop already exists
    let shop = await prisma.pTShop.findFirst({ where: { slug: shopData.slug } });

    if (shop) {
      console.log(`Shop ${shopData.name} already exists, skipping...`);
      continue;
    }

    // Create PT Shop
    shop = await prisma.pTShop.create({
      data: {
        name: shopData.name,
        slug: shopData.slug,
        description: `${shopData.name} - 최고의 PT 서비스를 제공합니다.`,
        address: shopData.address,
        phone: shopData.phone,
        email: `contact@${shopData.slug}.com`,
        isActive: true,
      },
    });
    totalShops++;
    console.log(`Created shop: ${shop.name}`);

    // Create Admin for this shop
    const adminEmail = `admin@${shopData.slug}.com`;
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: adminPassword,
        name: `${shopData.name} 관리자`,
        phone: shopData.phone,
        role: "ADMIN",
        shopId: shop.id,
      },
    });
    console.log(`Created admin: ${adminEmail}`);

    // Create 2-3 trainers per shop
    const trainerCount = 2 + Math.floor(Math.random() * 2);
    const shopTrainers: string[] = [];

    for (let t = 0; t < trainerCount; t++) {
      const trainerName = TRAINER_NAMES[(totalTrainers + t) % TRAINER_NAMES.length];
      const trainerEmail = `trainer${t + 1}@${shopData.slug}.com`;

      const trainer = await prisma.user.create({
        data: {
          email: trainerEmail,
          password: hashedPassword,
          name: trainerName,
          phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          role: "TRAINER",
          shopId: shop.id,
          trainerProfile: {
            create: {
              shopId: shop.id,
              bio: `${trainerName} 트레이너 - ${5 + Math.floor(Math.random() * 10)}년 경력`,
            },
          },
        },
        include: { trainerProfile: true },
      });

      if (trainer.trainerProfile) {
        shopTrainers.push(trainer.trainerProfile.id);
      }
      totalTrainers++;
    }
    console.log(`Created ${trainerCount} trainers`);

    // Create 15-30 members per shop
    const memberCount = 15 + Math.floor(Math.random() * 16);
    const paymentAmounts = [300000, 500000, 700000, 1000000, 1500000];
    const ptCounts = [10, 20, 30, 40, 50];

    for (let m = 0; m < memberCount; m++) {
      const firstName = MEMBER_FIRST_NAMES[Math.floor(Math.random() * MEMBER_FIRST_NAMES.length)];
      const lastName = MEMBER_LAST_NAMES[Math.floor(Math.random() * MEMBER_LAST_NAMES.length)];
      const memberName = `${firstName}${lastName}`;
      const memberEmail = `member${m + 1}_${Date.now()}@${shopData.slug}.com`;

      // Random join date between start and end
      const joinOffset = Math.floor(Math.random() * ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const joinDate = new Date(startDate);
      joinDate.setDate(startDate.getDate() + joinOffset);
      joinDate.setHours(9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);

      const trainerId = shopTrainers[Math.floor(Math.random() * shopTrainers.length)];

      try {
        const member = await prisma.user.create({
          data: {
            email: memberEmail,
            password: hashedPassword,
            name: memberName,
            phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            role: "MEMBER",
            shopId: shop.id,
            createdAt: joinDate,
            memberProfile: {
              create: {
                shopId: shop.id,
                trainerId: trainerId,
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

        totalMembers++;

        // Create 1-2 payments
        const paymentCount = 1 + Math.floor(Math.random() * 2);
        let totalPT = 0;

        for (let p = 0; p < paymentCount; p++) {
          const paymentDate = new Date(joinDate);
          paymentDate.setHours(joinDate.getHours() + p + 1);

          const amountIndex = Math.floor(Math.random() * paymentAmounts.length);
          const amount = paymentAmounts[amountIndex];
          const ptCount = ptCounts[amountIndex];

          await prisma.payment.create({
            data: {
              memberProfileId: member.memberProfile!.id,
              shopId: shop.id,
              amount,
              ptCount,
              status: "COMPLETED",
              description: `PT ${ptCount}회 등록`,
              paidAt: paymentDate,
              createdAt: paymentDate,
            },
          });

          totalPT += ptCount;
          totalPayments++;
        }

        // Update remaining PT
        await prisma.memberProfile.update({
          where: { id: member.memberProfile!.id },
          data: { remainingPT: totalPT },
        });

        // Create attendances
        const daysUntilNow = Math.ceil((endDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
        const attendanceDays = Math.min(Math.floor(Math.random() * 10) + 3, Math.min(daysUntilNow, totalPT));

        for (let a = 0; a < attendanceDays; a++) {
          const memberProfile = await prisma.memberProfile.findUnique({
            where: { id: member.memberProfile!.id },
          });

          if (!memberProfile || memberProfile.remainingPT <= 0) break;

          const attendanceDate = new Date(joinDate);
          attendanceDate.setDate(joinDate.getDate() + Math.floor((a + 1) * (daysUntilNow / attendanceDays)));

          if (attendanceDate > endDate) continue;

          attendanceDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

          // Create schedule
          const schedule = await prisma.schedule.create({
            data: {
              memberProfileId: member.memberProfile!.id,
              trainerId: trainerId,
              shopId: shop.id,
              scheduledAt: attendanceDate,
              status: "COMPLETED",
              createdAt: attendanceDate,
            },
          });

          // Calculate unit price
          const payments = await prisma.payment.findMany({
            where: { memberProfileId: member.memberProfile!.id, status: "COMPLETED" },
            select: { amount: true, ptCount: true },
          });
          const totalAmount = payments.reduce((sum, pay) => sum + pay.amount, 0);
          const totalPTCount = payments.reduce((sum, pay) => sum + pay.ptCount, 0);
          const unitPrice = totalPTCount > 0 ? Math.round(totalAmount / totalPTCount) : null;

          const remainingPTAfter = memberProfile.remainingPT - 1;

          await prisma.attendance.create({
            data: {
              memberProfileId: member.memberProfile!.id,
              scheduleId: schedule.id,
              shopId: shop.id,
              checkInTime: attendanceDate,
              remainingPTAfter,
              unitPrice,
              createdAt: attendanceDate,
            },
          });

          await prisma.memberProfile.update({
            where: { id: member.memberProfile!.id },
            data: { remainingPT: { decrement: 1 } },
          });

          totalAttendances++;
        }
      } catch (error) {
        console.error(`Error creating member ${memberName}:`, error);
      }
    }
    console.log(`Created ${memberCount} members`);
  }

  console.log("\n========================================");
  console.log("Multi-Shop Test Data Seeding Complete!");
  console.log("========================================");
  console.log(`Total PT Shops created: ${totalShops}`);
  console.log(`Total Trainers created: ${totalTrainers}`);
  console.log(`Total Members created: ${totalMembers}`);
  console.log(`Total Payments created: ${totalPayments}`);
  console.log(`Total Attendances created: ${totalAttendances}`);

  // Summary
  const shopCount = await prisma.pTShop.count();
  const memberCount = await prisma.memberProfile.count();
  const paymentCount = await prisma.payment.count();
  const attendanceCount = await prisma.attendance.count();
  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "COMPLETED" },
  });

  console.log("\n=== Database Summary ===");
  console.log(`Total PT Shops: ${shopCount}`);
  console.log(`Total Members: ${memberCount}`);
  console.log(`Total Payments: ${paymentCount}`);
  console.log(`Total Attendances: ${attendanceCount}`);
  console.log(`Total Revenue: ₩${totalRevenue._sum.amount?.toLocaleString() || 0}`);
}

seedMultiShopData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
