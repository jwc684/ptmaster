import { NextResponse } from "next/server";

// GET: 인증 설정 상태 확인
export async function GET() {
  const authSecret = process.env.AUTH_SECRET;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const databaseUrl = process.env.DATABASE_URL;

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    authConfig: {
      AUTH_SECRET: authSecret ? `설정됨 (${authSecret.length}자)` : "미설정",
      NEXTAUTH_SECRET: nextAuthSecret ? `설정됨 (${nextAuthSecret.length}자)` : "미설정",
      NEXTAUTH_URL: nextAuthUrl || "미설정",
      DATABASE_URL: databaseUrl ? "설정됨" : "미설정",
    },
    message: !authSecret && process.env.NODE_ENV === "production"
      ? "WARNING: AUTH_SECRET is not set in production! This will cause Configuration errors."
      : "Auth configuration looks OK",
  });
}
