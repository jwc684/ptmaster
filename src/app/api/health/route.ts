import { NextResponse } from "next/server";
import { testDbConnection } from "@/lib/prisma";

export async function GET() {
  console.log("[Health] Checking health...");

  const dbTest = await testDbConnection();

  const response = {
    status: dbTest.ok ? "healthy" : "unhealthy",
    database: {
      connected: dbTest.ok,
      error: dbTest.error || null,
      details: dbTest.details || null,
    },
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  console.log("[Health] Result:", response.status);

  return NextResponse.json(response, {
    status: dbTest.ok ? 200 : 503,
  });
}
