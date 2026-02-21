import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // First, create or get the default shop
  let defaultShop = await prisma.pTShop.findFirst({
    where: { slug: "default" },
  });

  if (!defaultShop) {
    defaultShop = await prisma.pTShop.create({
      data: {
        name: "Default PT Shop",
        slug: "default",
        description: "기본 PT샵입니다.",
        isActive: true,
      },
    });
    console.log("Created default PT Shop");
  } else {
    console.log("Using existing default PT Shop");
  }

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash("superadmin123!", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@ptmaster.com" },
    update: {},
    create: {
      email: "superadmin@ptmaster.com",
      password: superAdminPassword,
      name: "Super Admin",
      phone: "010-0000-0000",
      role: "SUPER_ADMIN",
      shopId: null, // Super Admin has no shop
    },
  });

  console.log("Created Super Admin: superadmin@ptmaster.com / superadmin123!");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ptshop.com" },
    update: {},
    create: {
      email: "admin@ptshop.com",
      password: hashedPassword,
      name: "관리자",
      phone: "010-1234-5678",
      role: "ADMIN",
      shopId: defaultShop.id,
    },
  });

  console.log("Created admin user: admin@ptshop.com / admin123!");

  // Create trainer
  const trainerPassword = await bcrypt.hash("trainer123!", 12);
  const trainer = await prisma.user.upsert({
    where: { email: "trainer@ptshop.com" },
    update: {},
    create: {
      email: "trainer@ptshop.com",
      password: trainerPassword,
      name: "김트레이너",
      phone: "010-2345-6789",
      role: "TRAINER",
      shopId: defaultShop.id,
      trainerProfile: {
        create: {
          shopId: defaultShop.id,
          bio: "10년 경력의 전문 PT 트레이너입니다.",
        },
      },
    },
    include: { trainerProfile: true },
  });

  console.log("Created trainer: trainer@ptshop.com / trainer123!");

  // Create member
  const memberPassword = await bcrypt.hash("member123!", 12);
  const member = await prisma.user.upsert({
    where: { email: "member@ptshop.com" },
    update: {},
    create: {
      email: "member@ptshop.com",
      password: memberPassword,
      name: "박회원",
      phone: "010-3456-7890",
      role: "MEMBER",
      shopId: defaultShop.id,
      memberProfile: {
        create: {
          shopId: defaultShop.id,
          qrCode: "MEMBER001",
          remainingPT: 10,
          notes: "PT 열심히 하는 회원입니다.",
          trainerId: trainer.trainerProfile?.id,
        },
      },
    },
    include: { memberProfile: true },
  });

  console.log("Created member: member@ptshop.com / member123!");

  // Create sample payment
  if (member.memberProfile) {
    await prisma.payment.upsert({
      where: { id: "sample-payment-1" },
      update: {},
      create: {
        id: "sample-payment-1",
        memberProfileId: member.memberProfile.id,
        shopId: defaultShop.id,
        amount: 500000,
        ptCount: 10,
        description: "PT 10회 결제",
      },
    });

    console.log("Created sample payment");
  }

  // Create a second member without trainer assignment
  const member2Password = await bcrypt.hash("member123!", 12);
  const member2 = await prisma.user.upsert({
    where: { email: "member2@ptshop.com" },
    update: {},
    create: {
      email: "member2@ptshop.com",
      password: member2Password,
      name: "이회원",
      phone: "010-5678-1234",
      role: "MEMBER",
      shopId: defaultShop.id,
      memberProfile: {
        create: {
          shopId: defaultShop.id,
          qrCode: "MEMBER002",
          remainingPT: 0,
        },
      },
    },
  });

  console.log("Created member2: member2@ptshop.com / member123!");

  // Seed system exercises
  const systemExercises = [
    // 중량 (WEIGHT)
    { name: "벤치프레스", type: "WEIGHT" as const },
    { name: "스쿼트", type: "WEIGHT" as const },
    { name: "데드리프트", type: "WEIGHT" as const },
    { name: "오버헤드프레스", type: "WEIGHT" as const },
    { name: "바벨로우", type: "WEIGHT" as const },
    { name: "덤벨컬", type: "WEIGHT" as const },
    { name: "레그프레스", type: "WEIGHT" as const },
    { name: "렛풀다운", type: "WEIGHT" as const },
    { name: "덤벨 숄더프레스", type: "WEIGHT" as const },
    { name: "케이블 플라이", type: "WEIGHT" as const },
    // 유산소 (CARDIO)
    { name: "러닝", type: "CARDIO" as const },
    { name: "사이클", type: "CARDIO" as const },
    { name: "로잉", type: "CARDIO" as const },
    { name: "줄넘기", type: "CARDIO" as const },
    { name: "수영", type: "CARDIO" as const },
    { name: "스텝퍼", type: "CARDIO" as const },
    { name: "걷기", type: "CARDIO" as const },
    // 맨몸 (BODYWEIGHT)
    { name: "푸시업", type: "BODYWEIGHT" as const },
    { name: "풀업", type: "BODYWEIGHT" as const },
    { name: "딥스", type: "BODYWEIGHT" as const },
    { name: "버피", type: "BODYWEIGHT" as const },
    { name: "플랭크", type: "BODYWEIGHT" as const },
    { name: "런지", type: "BODYWEIGHT" as const },
    { name: "맨몸 스쿼트", type: "BODYWEIGHT" as const },
    { name: "크런치", type: "BODYWEIGHT" as const },
  ];

  for (const ex of systemExercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, isSystem: true },
    });
    if (!existing) {
      await prisma.exercise.create({
        data: { name: ex.name, type: ex.type, isSystem: true },
      });
    }
  }
  console.log(`Seeded ${systemExercises.length} system exercises`);

  console.log("\nSeeding completed!");
  console.log("\nTest accounts:");
  console.log("  Super Admin: superadmin@ptmaster.com / superadmin123!");
  console.log("  Admin:       admin@ptshop.com / admin123!");
  console.log("  Trainer:     trainer@ptshop.com / trainer123!");
  console.log("  Member:      member@ptshop.com / member123!");
  console.log("  Member2:     member2@ptshop.com / member123!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
