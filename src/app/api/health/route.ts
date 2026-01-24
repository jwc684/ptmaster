import { NextResponse } from "next/server";
import { testDbConnection } from "@/lib/prisma";

export async function GET() {
  const dbTest = await testDbConnection();

  return NextResponse.json({
    status: dbTest.ok ? "healthy" : "unhealthy",
    database: dbTest.ok ? "connected" : "disconnected",
    error: dbTest.error || undefined,
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
  }, {
    status: dbTest.ok ? 200 : 503,
  });
}
