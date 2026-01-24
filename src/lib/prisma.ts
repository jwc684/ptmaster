import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  console.log("[Prisma] Creating new PrismaClient...");
  console.log("[Prisma] DATABASE_URL exists:", !!process.env.DATABASE_URL);

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// DB 연결 테스트 함수
export async function testDbConnection(): Promise<{
  ok: boolean;
  error?: string;
  details?: Record<string, unknown>;
}> {
  console.log("[DB Test] Starting connection test...");

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("[DB Test] DATABASE_URL is not set!");
    return {
      ok: false,
      error: "DATABASE_URL environment variable is not set",
      details: { hasDbUrl: false }
    };
  }

  try {
    // Basic connection test
    await prisma.$queryRaw`SELECT 1`;
    console.log("[DB Test] Basic connection successful");

    // Check if users table exists
    try {
      await prisma.$queryRaw`SELECT COUNT(*) FROM users LIMIT 1`;
      console.log("[DB Test] users table exists");
    } catch (tableError) {
      console.error("[DB Test] users table check failed:", tableError);
      return {
        ok: false,
        error: "Database tables not initialized. Run prisma db push.",
        details: { connected: true, tablesExist: false }
      };
    }

    return { ok: true, details: { connected: true, tablesExist: true } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown database error";
    console.error("[DB Test] Connection failed:", errorMessage);
    return {
      ok: false,
      error: errorMessage,
      details: { connected: false }
    };
  }
}
