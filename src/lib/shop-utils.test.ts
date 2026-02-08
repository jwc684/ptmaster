/**
 * Tests for shop-utils.ts
 * Tests the pure utility functions: buildShopFilter, requireRoles, requireShopContext
 * Tests the async functions with mocked Prisma and auth
 */

import type { UserRole } from "@prisma/client";

// Mock next/headers before importing the module
jest.mock("next/headers", () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    pTShop: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  buildShopFilter,
  requireRoles,
  requireShopContext,
  getAuthWithShop,
  userBelongsToShop,
  getShopById,
  getAllShops,
  type ShopAuthResult,
  type ShopAuthError,
  type AuthWithShopResult,
} from "@/lib/shop-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers, cookies } from "next/headers";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockHeaders = headers as jest.MockedFunction<typeof headers>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

// ============================================================
// buildShopFilter
// ============================================================
describe("buildShopFilter", () => {
  it("returns empty filter for super admin without shop context", () => {
    const result = buildShopFilter(null, true);
    expect(result).toEqual({});
  });

  it("returns shopId filter for super admin with shop context", () => {
    const result = buildShopFilter("shop-123", true);
    expect(result).toEqual({ shopId: "shop-123" });
  });

  it("returns shopId filter for regular user with shop", () => {
    const result = buildShopFilter("shop-456", false);
    expect(result).toEqual({ shopId: "shop-456" });
  });

  it("returns empty filter for regular user without shop (fallback)", () => {
    const result = buildShopFilter(null, false);
    expect(result).toEqual({});
  });
});

// ============================================================
// requireRoles
// ============================================================
describe("requireRoles", () => {
  const authenticatedAdmin: ShopAuthResult = {
    userId: "user-1",
    userRole: "ADMIN" as UserRole,
    shopId: "shop-1",
    isSuperAdmin: false,
    isAuthenticated: true,
  };

  const authenticatedSuperAdmin: ShopAuthResult = {
    userId: "user-2",
    userRole: "SUPER_ADMIN" as UserRole,
    shopId: null,
    isSuperAdmin: true,
    isAuthenticated: true,
  };

  const authenticatedTrainer: ShopAuthResult = {
    userId: "user-3",
    userRole: "TRAINER" as UserRole,
    shopId: "shop-1",
    isSuperAdmin: false,
    isAuthenticated: true,
  };

  const authenticatedMember: ShopAuthResult = {
    userId: "user-4",
    userRole: "MEMBER" as UserRole,
    shopId: "shop-1",
    isSuperAdmin: false,
    isAuthenticated: true,
  };

  const unauthenticated: ShopAuthError = {
    isAuthenticated: false,
    error: "Unauthorized",
  };

  it("returns error for unauthenticated user", () => {
    const result = requireRoles(unauthenticated, ["ADMIN"]);
    expect(result).toBe("Unauthorized");
  });

  it("returns null (allowed) for super admin regardless of allowed roles", () => {
    const result = requireRoles(authenticatedSuperAdmin, ["MEMBER"]);
    expect(result).toBeNull();
  });

  it("returns null when user role is in allowed list", () => {
    const result = requireRoles(authenticatedAdmin, ["ADMIN", "TRAINER"]);
    expect(result).toBeNull();
  });

  it("returns Forbidden when user role is not in allowed list", () => {
    const result = requireRoles(authenticatedMember, ["ADMIN", "TRAINER"]);
    expect(result).toBe("Forbidden");
  });

  it("returns null for trainer when TRAINER is allowed", () => {
    const result = requireRoles(authenticatedTrainer, ["TRAINER"]);
    expect(result).toBeNull();
  });

  it("returns Forbidden for trainer when only ADMIN is allowed", () => {
    const result = requireRoles(authenticatedTrainer, ["ADMIN"]);
    expect(result).toBe("Forbidden");
  });
});

// ============================================================
// requireShopContext
// ============================================================
describe("requireShopContext", () => {
  it("returns error for unauthenticated user", () => {
    const result = requireShopContext({
      isAuthenticated: false,
      error: "Unauthorized",
    });
    expect(result).toBe("Unauthorized");
  });

  it("returns error for super admin without shop context", () => {
    const result = requireShopContext({
      userId: "u1",
      userRole: "SUPER_ADMIN" as UserRole,
      shopId: null,
      isSuperAdmin: true,
      isAuthenticated: true,
    });
    expect(result).toBe("Please select a shop first");
  });

  it("returns null for super admin with shop context", () => {
    const result = requireShopContext({
      userId: "u1",
      userRole: "SUPER_ADMIN" as UserRole,
      shopId: "shop-1",
      isSuperAdmin: true,
      isAuthenticated: true,
    });
    expect(result).toBeNull();
  });

  it("returns null for regular user with shop", () => {
    const result = requireShopContext({
      userId: "u1",
      userRole: "TRAINER" as UserRole,
      shopId: "shop-1",
      isSuperAdmin: false,
      isAuthenticated: true,
    });
    expect(result).toBeNull();
  });

  it("returns error for regular user without shop", () => {
    const result = requireShopContext({
      userId: "u1",
      userRole: "TRAINER" as UserRole,
      shopId: null,
      isSuperAdmin: false,
      isAuthenticated: true,
    });
    expect(result).toBe("No shop context found");
  });
});

// ============================================================
// getAuthWithShop
// ============================================================
describe("getAuthWithShop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unauthenticated when no session", async () => {
    mockAuth.mockResolvedValue(null as any);

    const result = await getAuthWithShop();
    expect(result).toEqual({
      isAuthenticated: false,
      error: "Unauthorized",
    });
  });

  it("returns unauthenticated when session has no user", async () => {
    mockAuth.mockResolvedValue({ user: undefined } as any);

    const result = await getAuthWithShop();
    expect(result).toEqual({
      isAuthenticated: false,
      error: "Unauthorized",
    });
  });

  it("returns auth result for regular trainer", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        role: "TRAINER",
        shopId: "shop-1",
      },
    } as any);

    const result = await getAuthWithShop();
    expect(result).toEqual({
      userId: "user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
      isAuthenticated: true,
    });
  });

  it("super admin reads shopId from x-shop-id header", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "sa-1",
        role: "SUPER_ADMIN",
        shopId: null,
      },
    } as any);

    mockHeaders.mockResolvedValue({
      get: jest.fn((name: string) => (name === "x-shop-id" ? "override-shop" : null)),
    } as any);
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as any);

    const result = await getAuthWithShop();
    expect(result).toEqual({
      userId: "sa-1",
      userRole: "SUPER_ADMIN",
      shopId: "override-shop",
      isSuperAdmin: true,
      isAuthenticated: true,
    });
  });

  it("super admin reads shopId from cookie when no header", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "sa-1",
        role: "SUPER_ADMIN",
        shopId: null,
      },
    } as any);

    mockHeaders.mockResolvedValue({
      get: jest.fn(() => null),
    } as any);
    mockCookies.mockResolvedValue({
      get: jest.fn((name: string) =>
        name === "selected-shop-id" ? { value: "cookie-shop" } : undefined
      ),
    } as any);

    const result = await getAuthWithShop();
    expect(result).toEqual({
      userId: "sa-1",
      userRole: "SUPER_ADMIN",
      shopId: "cookie-shop",
      isSuperAdmin: true,
      isAuthenticated: true,
    });
  });

  it("super admin with validateShop=true validates shop existence", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "sa-1",
        role: "SUPER_ADMIN",
        shopId: null,
      },
    } as any);

    mockHeaders.mockResolvedValue({
      get: jest.fn((name: string) => (name === "x-shop-id" ? "valid-shop" : null)),
    } as any);
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as any);

    (prisma.pTShop.findUnique as jest.Mock).mockResolvedValue({ id: "valid-shop" });

    const result = await getAuthWithShop(true);
    expect(prisma.pTShop.findUnique).toHaveBeenCalledWith({
      where: { id: "valid-shop" },
      select: { id: true },
    });
    expect(result).toMatchObject({
      shopId: "valid-shop",
      isAuthenticated: true,
    });
  });

  it("super admin with validateShop=true returns null shopId for non-existent shop", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "sa-1",
        role: "SUPER_ADMIN",
        shopId: null,
      },
    } as any);

    mockHeaders.mockResolvedValue({
      get: jest.fn((name: string) => (name === "x-shop-id" ? "nonexistent-shop" : null)),
    } as any);
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as any);

    (prisma.pTShop.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await getAuthWithShop(true);
    expect(result).toMatchObject({
      shopId: null,
      isAuthenticated: true,
    });
  });
});

// ============================================================
// userBelongsToShop
// ============================================================
describe("userBelongsToShop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when user not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await userBelongsToShop("user-1", "shop-1");
    expect(result).toBe(false);
  });

  it("returns true for SUPER_ADMIN regardless of shopId", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      shopId: null,
      role: "SUPER_ADMIN",
    });

    const result = await userBelongsToShop("sa-1", "any-shop");
    expect(result).toBe(true);
  });

  it("returns true when user shopId matches", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      shopId: "shop-1",
      role: "TRAINER",
    });

    const result = await userBelongsToShop("user-1", "shop-1");
    expect(result).toBe(true);
  });

  it("returns false when user shopId does not match", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      shopId: "shop-2",
      role: "TRAINER",
    });

    const result = await userBelongsToShop("user-1", "shop-1");
    expect(result).toBe(false);
  });
});

// ============================================================
// getShopById, getAllShops
// ============================================================
describe("getShopById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls prisma with the correct where clause", async () => {
    const mockShop = { id: "shop-1", name: "Test Shop" };
    (prisma.pTShop.findUnique as jest.Mock).mockResolvedValue(mockShop);

    const result = await getShopById("shop-1");
    expect(prisma.pTShop.findUnique).toHaveBeenCalledWith({
      where: { id: "shop-1" },
    });
    expect(result).toEqual(mockShop);
  });

  it("returns null for non-existent shop", async () => {
    (prisma.pTShop.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await getShopById("nonexistent");
    expect(result).toBeNull();
  });
});

describe("getAllShops", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns all shops ordered by createdAt desc", async () => {
    const mockShops = [
      { id: "shop-2", name: "Shop B" },
      { id: "shop-1", name: "Shop A" },
    ];
    (prisma.pTShop.findMany as jest.Mock).mockResolvedValue(mockShops);

    const result = await getAllShops();
    expect(prisma.pTShop.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual(mockShops);
  });
});
