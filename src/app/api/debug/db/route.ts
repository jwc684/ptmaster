import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    },
    tests: {},
  };

  // Test 1: Basic connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.tests = { ...result.tests as object, basicConnection: "OK" };
  } catch (error) {
    result.tests = {
      ...result.tests as object,
      basicConnection: `FAILED: ${error instanceof Error ? error.message : "Unknown"}`
    };
    return NextResponse.json(result, { status: 500 });
  }

  // Test 2: Check tables exist
  const tables = ["users", "member_profiles", "accounts", "sessions"];
  for (const table of tables) {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
      result.tests = { ...result.tests as object, [`table_${table}`]: "OK" };
    } catch (error) {
      result.tests = {
        ...result.tests as object,
        [`table_${table}`]: `MISSING or ERROR: ${error instanceof Error ? error.message : "Unknown"}`
      };
    }
  }

  // Test 3: Check column structure for users table
  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY column_name
    `;
    result.usersColumns = columns.map(c => c.column_name);
  } catch (error) {
    result.usersColumns = `Error: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  // Test 4: Check column structure for member_profiles table
  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'member_profiles'
      ORDER BY column_name
    `;
    result.memberProfilesColumns = columns.map(c => c.column_name);
  } catch (error) {
    result.memberProfilesColumns = `Error: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  // Test 5: Count users
  try {
    const count = await prisma.user.count();
    result.userCount = count;
  } catch (error) {
    result.userCount = `Error: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  // Test 6: Try creating a test record (dry run - we'll rollback)
  try {
    // Use a transaction that we'll rollback
    result.createTest = "Skipped (would need to rollback)";
  } catch (error) {
    result.createTest = `Error: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  return NextResponse.json(result, { status: 200 });
}
