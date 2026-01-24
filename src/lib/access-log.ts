import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import type { ActionType, UserRole, Prisma } from "@prisma/client";

export interface LogAccessParams {
  userId: string;
  userName: string;
  userRole: UserRole;
  shopId?: string | null;
  shopName?: string | null;
  actionType: ActionType;
  page: string;
  action?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Log user access/action
 * Call this from API routes or server components to record user activity
 */
export async function logAccess(params: LogAccessParams): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
    const userAgent = headersList.get("user-agent") || null;

    await prisma.accessLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        shopId: params.shopId || null,
        shopName: params.shopName || null,
        actionType: params.actionType,
        page: params.page,
        action: params.action || null,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        metadata: params.metadata ?? undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw errors for logging failures - just log to console
    console.error("Failed to log access:", error);
  }
}

/**
 * Log page view - simplified version for page views
 */
export async function logPageView(
  userId: string,
  userName: string,
  userRole: UserRole,
  page: string,
  shopId?: string | null,
  shopName?: string | null
): Promise<void> {
  await logAccess({
    userId,
    userName,
    userRole,
    shopId,
    shopName,
    actionType: "PAGE_VIEW",
    page,
  });
}

/**
 * Log API action - for create/update/delete operations
 */
export async function logApiAction(
  userId: string,
  userName: string,
  userRole: UserRole,
  actionType: "CREATE" | "UPDATE" | "DELETE" | "API_CALL",
  page: string,
  action: string,
  shopId?: string | null,
  shopName?: string | null,
  targetId?: string,
  targetType?: string,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  await logAccess({
    userId,
    userName,
    userRole,
    shopId,
    shopName,
    actionType,
    page,
    action,
    targetId,
    targetType,
    metadata,
  });
}

/**
 * Log login event
 */
export async function logLogin(
  userId: string,
  userName: string,
  userRole: UserRole,
  shopId?: string | null,
  shopName?: string | null
): Promise<void> {
  await logAccess({
    userId,
    userName,
    userRole,
    shopId,
    shopName,
    actionType: "LOGIN",
    page: "/login",
    action: "로그인",
  });
}

/**
 * Log logout event
 */
export async function logLogout(
  userId: string,
  userName: string,
  userRole: UserRole,
  shopId?: string | null,
  shopName?: string | null
): Promise<void> {
  await logAccess({
    userId,
    userName,
    userRole,
    shopId,
    shopName,
    actionType: "LOGOUT",
    page: "/logout",
    action: "로그아웃",
  });
}
