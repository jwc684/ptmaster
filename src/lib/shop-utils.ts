import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers, cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

export interface ShopAuthResult {
  userId: string;
  userRole: UserRole;
  shopId: string | null;
  isSuperAdmin: boolean;
  isAuthenticated: true;
}

export interface ShopAuthError {
  isAuthenticated: false;
  error: string;
}

export type AuthWithShopResult = ShopAuthResult | ShopAuthError;

/**
 * Get authenticated user with shop context
 * For API routes, retrieves the session and shop information
 * Super Admin can optionally override shopId via header
 *
 * @param validateShop - If true, validates that the shop exists (slower, use for write operations)
 */
export async function getAuthWithShop(validateShop = false): Promise<AuthWithShopResult> {
  const session = await auth();

  if (!session?.user) {
    return { isAuthenticated: false, error: "Unauthorized" };
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  let effectiveShopId = session.user.shopId ?? null;

  // Super Admin can override shop context via header or cookie
  if (isSuperAdmin) {
    const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);

    // First check header (for API calls)
    let overrideShopId = headersList.get("x-shop-id");

    // If no header, check cookie (for page renders)
    if (!overrideShopId) {
      overrideShopId = cookieStore.get("selected-shop-id")?.value ?? null;
    }

    if (overrideShopId) {
      // Only validate shop existence for write operations
      if (validateShop) {
        const shop = await prisma.pTShop.findUnique({
          where: { id: overrideShopId },
          select: { id: true },
        });
        if (shop) {
          effectiveShopId = overrideShopId;
        }
      } else {
        // Trust the cookie value for read operations
        effectiveShopId = overrideShopId;
      }
    }
  }

  return {
    userId: session.user.id,
    userRole: session.user.role,
    shopId: effectiveShopId,
    isSuperAdmin,
    isAuthenticated: true,
  };
}

/**
 * Build a Prisma where filter for shop-scoped queries
 * @param shopId - The shop ID to filter by
 * @param isSuperAdmin - Whether the current user is a Super Admin
 * @returns An object to spread into Prisma where clauses
 */
export function buildShopFilter(
  shopId: string | null,
  isSuperAdmin: boolean
): { shopId?: string } {
  // If Super Admin without specific shop context, return empty filter (show all)
  if (isSuperAdmin && !shopId) {
    return {};
  }

  // Regular users or Super Admin with shop context
  if (shopId) {
    return { shopId };
  }

  // Fallback - should not happen for properly set up users
  return {};
}

/**
 * Require specific roles for an API endpoint
 * @param authResult - The auth result from getAuthWithShop
 * @param allowedRoles - Array of roles that are allowed
 * @returns null if authorized, or an error message
 */
export function requireRoles(
  authResult: AuthWithShopResult,
  allowedRoles: UserRole[]
): string | null {
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  // Super Admin has access to everything
  if (authResult.isSuperAdmin) {
    return null;
  }

  if (!allowedRoles.includes(authResult.userRole)) {
    return "Forbidden";
  }

  return null;
}

/**
 * Require shop context for operations that need a specific shop
 * @param authResult - The auth result from getAuthWithShop
 * @returns null if shop context exists, or an error message
 */
export function requireShopContext(
  authResult: AuthWithShopResult
): string | null {
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  // Super Admin without shop context cannot perform shop-specific operations
  if (authResult.isSuperAdmin && !authResult.shopId) {
    return "Please select a shop first";
  }

  if (!authResult.shopId) {
    return "No shop context found";
  }

  return null;
}

/**
 * Get the current shop details
 * @param shopId - The shop ID
 * @returns The shop details or null
 */
export async function getShopById(shopId: string) {
  return prisma.pTShop.findUnique({
    where: { id: shopId },
  });
}

/**
 * Get all active shops (for Super Admin)
 */
export async function getAllShops() {
  return prisma.pTShop.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Check if a user belongs to a specific shop
 * @param userId - The user ID
 * @param shopId - The shop ID
 * @returns true if user belongs to shop
 */
export async function userBelongsToShop(
  userId: string,
  shopId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shopId: true, role: true },
  });

  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return user.shopId === shopId;
}
