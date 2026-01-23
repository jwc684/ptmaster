import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

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
    },
  });

  console.log("✅ Created admin user: admin@ptshop.com / admin123!");

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
      trainerProfile: {
        create: {
          bio: "10년 경력의 전문 PT 트레이너입니다.",
        },
      },
    },
    include: { trainerProfile: true },
  });

  console.log("✅ Created trainer: trainer@ptshop.com / trainer123!");

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
      memberProfile: {
        create: {
          qrCode: "MEMBER001",
          remainingPT: 10,
          notes: "PT 열심히 하는 회원입니다.",
          trainerId: trainer.trainerProfile?.id,
        },
      },
    },
    include: { memberProfile: true },
  });

  console.log("✅ Created member: member@ptshop.com / member123!");

  // Create sample payment
  if (member.memberProfile) {
    await prisma.payment.create({
      data: {
        memberProfileId: member.memberProfile.id,
        amount: 500000,
        ptCount: 10,
        description: "PT 10회 결제",
      },
    });

    console.log("✅ Created sample payment");
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
      memberProfile: {
        create: {
          qrCode: "MEMBER002",
          remainingPT: 0,
        },
      },
    },
  });

  console.log("✅ Created member2: member2@ptshop.com / member123!");

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Test accounts:");
  console.log("  Admin:   admin@ptshop.com / admin123!");
  console.log("  Trainer: trainer@ptshop.com / trainer123!");
  console.log("  Member:  member@ptshop.com / member123!");
  console.log("  Member2: member2@ptshop.com / member123!");
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
