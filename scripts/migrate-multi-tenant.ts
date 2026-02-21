import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  console.log("Starting multi-tenant migration...\n");

  try {
    // Step 1: Check if Default PT Shop already exists
    const existingShop = await prisma.pTShop.findFirst({
      where: { slug: "default" },
    });

    let defaultShopId: string;

    if (existingShop) {
      console.log("Default PT Shop already exists, using existing shop.");
      defaultShopId = existingShop.id;
    } else {
      // Create Default PT Shop
      console.log("Creating Default PT Shop...");
      const defaultShop = await prisma.pTShop.create({
        data: {
          name: "Default PT Shop",
          slug: "default",
          description: "기존 데이터가 이전된 기본 PT샵입니다.",
          isActive: true,
        },
      });
      defaultShopId = defaultShop.id;
      console.log(`Default PT Shop created with ID: ${defaultShopId}`);
    }

    // Step 2: Ensure Super Admin exists with correct role
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { roles: { has: "SUPER_ADMIN" } },
    });

    if (existingSuperAdmin) {
      console.log("Super Admin already exists, skipping creation.");
    } else {
      // Check if the email exists but lost SUPER_ADMIN role (e.g. after db push reset)
      const existingByEmail = await prisma.user.findUnique({
        where: { email: "superadmin@ptmaster.com" },
      });

      if (existingByEmail) {
        // Restore SUPER_ADMIN role
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { roles: ["SUPER_ADMIN"], shopId: null },
        });
        console.log(`Super Admin role restored for: ${existingByEmail.email}`);
      } else {
        // Create Super Admin
        console.log("Creating Super Admin...");
        const hashedPassword = await bcrypt.hash("superadmin123!", 10);
        const superAdmin = await prisma.user.create({
          data: {
            email: "superadmin@ptmaster.com",
            password: hashedPassword,
            name: "Super Admin",
            roles: ["SUPER_ADMIN"],
            shopId: null, // Super Admin has no shop
          },
        });
        console.log(`Super Admin created: ${superAdmin.email}`);
      }
    }

    // Step 2.5: Restore lost roles based on existing profiles
    // After db push, all users may have been reset to [MEMBER] default.
    // Restore ADMIN/TRAINER roles based on existing profiles and access logs.
    console.log("\nRestoring roles from existing profiles...");

    // Restore TRAINER role for users with TrainerProfile
    const trainersWithMemberOnly = await prisma.user.findMany({
      where: {
        trainerProfile: { isNot: null },
        NOT: { roles: { has: "TRAINER" } },
      },
      select: { id: true, email: true, roles: true },
    });
    for (const user of trainersWithMemberOnly) {
      const newRoles = [...new Set([...user.roles, "TRAINER" as const])];
      await prisma.user.update({
        where: { id: user.id },
        data: { roles: newRoles },
      });
      console.log(`  Restored TRAINER role for: ${user.email}`);
    }

    // Restore ADMIN role for users who have access logs as ADMIN but currently only MEMBER
    // (AccessLog.userRole preserved the original role)
    const adminLogs = await prisma.accessLog.findMany({
      where: { userRole: "ADMIN" },
      select: { userId: true },
      distinct: ["userId"],
    });
    for (const log of adminLogs) {
      const user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { id: true, email: true, roles: true },
      });
      if (user && !user.roles.includes("ADMIN")) {
        const newRoles = [...new Set([...user.roles, "ADMIN" as const])];
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: newRoles },
        });
        console.log(`  Restored ADMIN role for: ${user.email}`);
      }
    }

    console.log("Role restoration complete.");

    // Step 3: Update all existing users with shopId (except SUPER_ADMIN)
    console.log("\nUpdating users with shopId...");
    const usersUpdated = await prisma.user.updateMany({
      where: {
        shopId: null,
        NOT: { roles: { has: "SUPER_ADMIN" } },
      },
      data: {
        shopId: defaultShopId,
      },
    });
    console.log(`Updated ${usersUpdated.count} users with shopId`);

    // Step 4: Update all MemberProfiles with shopId
    console.log("Updating member profiles with shopId...");
    const memberProfiles = await prisma.memberProfile.findMany({
      where: {
        shopId: { equals: undefined as unknown as string },
      },
    });

    // Use raw update for profiles that don't have shopId yet
    const membersUpdated = await prisma.$executeRaw`
      UPDATE member_profiles SET "shopId" = ${defaultShopId} WHERE "shopId" IS NULL
    `;
    console.log(`Updated ${membersUpdated} member profiles with shopId`);

    // Step 5: Update all TrainerProfiles with shopId
    console.log("Updating trainer profiles with shopId...");
    const trainersUpdated = await prisma.$executeRaw`
      UPDATE trainer_profiles SET "shopId" = ${defaultShopId} WHERE "shopId" IS NULL
    `;
    console.log(`Updated ${trainersUpdated} trainer profiles with shopId`);

    // Step 6: Update all Schedules with shopId
    console.log("Updating schedules with shopId...");
    const schedulesUpdated = await prisma.$executeRaw`
      UPDATE schedules SET "shopId" = ${defaultShopId} WHERE "shopId" IS NULL
    `;
    console.log(`Updated ${schedulesUpdated} schedules with shopId`);

    // Step 7: Update all Attendances with shopId
    console.log("Updating attendances with shopId...");
    const attendancesUpdated = await prisma.$executeRaw`
      UPDATE attendances SET "shopId" = ${defaultShopId} WHERE "shopId" IS NULL
    `;
    console.log(`Updated ${attendancesUpdated} attendances with shopId`);

    // Step 8: Update all Payments with shopId
    console.log("Updating payments with shopId...");
    const paymentsUpdated = await prisma.$executeRaw`
      UPDATE payments SET "shopId" = ${defaultShopId} WHERE "shopId" IS NULL
    `;
    console.log(`Updated ${paymentsUpdated} payments with shopId`);

    // Summary
    console.log("\n=== Multi-Tenant Migration Complete! ===");
    console.log(`Default PT Shop ID: ${defaultShopId}`);
    console.log("\nSuper Admin Credentials:");
    console.log("  Email: superadmin@ptmaster.com");
    console.log("  Password: superadmin123!");
    console.log("\nPlease change the Super Admin password after first login!");

    // Verify migration
    console.log("\n=== Migration Verification ===");
    const shopCount = await prisma.pTShop.count();
    const usersWithoutShop = await prisma.user.count({
      where: {
        shopId: null,
        NOT: { roles: { has: "SUPER_ADMIN" } },
      },
    });

    console.log(`Total PT Shops: ${shopCount}`);
    console.log(`Users without shop (should be 0 except SUPER_ADMIN): ${usersWithoutShop}`);

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateToMultiTenant()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
