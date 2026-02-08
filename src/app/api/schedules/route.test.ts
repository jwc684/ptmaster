/**
 * @jest-environment node
 */

/**
 * Tests for /api/schedules route (GET and POST)
 * Tests authentication, authorization, validation, and database query logic
 */

// Mock next/server
jest.mock("next/server", () => {
  const actualNextResponse = {
    json: (body: unknown, init?: { status?: number }) => ({
      _body: body,
      _status: init?.status || 200,
      async json() {
        return this._body;
      },
      get status() {
        return this._status;
      },
    }),
  };
  return { NextResponse: actualNextResponse };
});

// Mock next/headers
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
    trainerProfile: {
      findUnique: jest.fn(),
    },
    schedule: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    memberProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock kakao-message
jest.mock("@/lib/kakao-message", () => ({
  sendScheduleNotification: jest.fn().mockResolvedValue(undefined),
}));

// Mock shop-utils - keep real implementations for buildShopFilter and requireShopContext
jest.mock("@/lib/shop-utils", () => {
  const actual = jest.requireActual("@/lib/shop-utils");
  return {
    ...actual,
    getAuthWithShop: jest.fn(),
  };
});

import { GET, POST } from "./route";
import { getAuthWithShop } from "@/lib/shop-utils";
import { prisma } from "@/lib/prisma";
import type { AuthWithShopResult } from "@/lib/shop-utils";

const mockGetAuth = getAuthWithShop as jest.MockedFunction<typeof getAuthWithShop>;

function createRequest(url: string, init?: RequestInit): Request {
  return new Request(`http://localhost:3000${url}`, init);
}

// ============================================================
// GET /api/schedules
// ============================================================
describe("GET /api/schedules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: false,
      error: "Unauthorized",
    });

    const response = await GET(createRequest("/api/schedules"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("인증이 필요합니다.");
  });

  it("returns schedules for admin user", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    const mockSchedules = [
      {
        id: "sched-1",
        scheduledAt: new Date("2025-01-15T10:00:00Z"),
        status: "SCHEDULED",
        notes: null,
        shopId: "shop-1",
        memberProfile: {
          id: "mp-1",
          remainingPT: 5,
          user: { name: "김회원", phone: "010-1234-5678" },
        },
        trainer: { id: "tp-1", user: { name: "박트레이너" } },
        attendance: null,
        shop: { id: "shop-1", name: "Test Gym" },
      },
    ];
    (prisma.schedule.findMany as jest.Mock).mockResolvedValue(mockSchedules);

    const response = await GET(createRequest("/api/schedules"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockSchedules);
    expect(prisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ shopId: "shop-1" }),
        orderBy: { scheduledAt: "asc" },
      })
    );
  });

  it("filters by date query parameter", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules?date=2025-03-15"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.scheduledAt).toBeDefined();
    expect(whereClause.scheduledAt.gte).toBeInstanceOf(Date);
    expect(whereClause.scheduledAt.lte).toBeInstanceOf(Date);

    // Verify date range covers the full day
    const gte = whereClause.scheduledAt.gte as Date;
    const lte = whereClause.scheduledAt.lte as Date;
    expect(gte.getHours()).toBe(0);
    expect(gte.getMinutes()).toBe(0);
    expect(lte.getHours()).toBe(23);
    expect(lte.getMinutes()).toBe(59);
  });

  it("filters by startDate and endDate", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules?startDate=2025-01-01&endDate=2025-01-31"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.scheduledAt.gte).toBeInstanceOf(Date);
    expect(whereClause.scheduledAt.lte).toBeInstanceOf(Date);
  });

  it("filters by status query parameter", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules?status=COMPLETED"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.status).toBe("COMPLETED");
  });

  it("ignores invalid status values", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules?status=INVALID_STATUS"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.status).toBeUndefined();
  });

  it("filters by memberId query parameter", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules?memberId=mp-99"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.memberProfileId).toBe("mp-99");
  });

  it("trainer can only see own schedules", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "trainer-user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "tp-1",
    });
    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.trainerId).toBe("tp-1");
  });

  it("returns 404 when trainer profile not found", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "trainer-user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(createRequest("/api/schedules"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("트레이너 프로필이 없습니다.");
  });

  it("super admin without shop sees all schedules (no shopId filter)", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "sa-1",
      userRole: "SUPER_ADMIN",
      shopId: null,
      isSuperAdmin: true,
    } as AuthWithShopResult);

    (prisma.schedule.findMany as jest.Mock).mockResolvedValue([]);

    await GET(createRequest("/api/schedules"));

    const whereClause = (prisma.schedule.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereClause.shopId).toBeUndefined();
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuth.mockRejectedValue(new Error("DB down"));

    const response = await GET(createRequest("/api/schedules"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("일정을 불러오는 중 오류가 발생했습니다.");
  });
});

// ============================================================
// POST /api/schedules
// ============================================================
describe("POST /api/schedules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: false,
      error: "Unauthorized",
    });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("인증이 필요합니다.");
  });

  it("returns 403 for MEMBER role", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "member-1",
      userRole: "MEMBER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("권한이 없습니다.");
  });

  it("returns 400 when super admin has no shop context", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "sa-1",
      userRole: "SUPER_ADMIN",
      shopId: null,
      isSuperAdmin: true,
    } as AuthWithShopResult);

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Please select a shop first");
  });

  it("returns 400 for invalid body (missing memberProfileId)", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
  });

  it("returns 400 for empty memberProfileId", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("회원을 선택해주세요.");
  });

  it("returns 404 when member not found in shop", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: "tp-1" });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-nonexist",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("해당 회원을 찾을 수 없습니다.");
  });

  it("returns 400 when member has no remaining PT and not free", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue({
      id: "mp-1",
      remainingPT: 0,
      trainerId: "tp-1",
    });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("잔여 PT가 없습니다. PT를 등록해주세요.");
  });

  it("allows free PT even when remainingPT is 0", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "trainer-user",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue({
      id: "mp-1",
      remainingPT: 0,
      trainerId: "tp-1",
    });
    (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "tp-1",
    });

    const mockSchedule = {
      id: "new-sched",
      scheduledAt: new Date("2025-03-15T10:00:00Z"),
      status: "SCHEDULED",
      memberProfile: {
        userId: "member-user",
        user: { name: "김회원" },
        remainingPT: 0,
      },
      trainer: { id: "tp-1", user: { name: "박트레이너" } },
      shop: { name: "Test Gym" },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
      return fn({
        schedule: { create: jest.fn().mockResolvedValue(mockSchedule) },
        memberProfile: { update: jest.fn() },
      });
    });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
          isFree: true,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toContain("무료");
  });

  it("returns 404 when trainer profile not found for TRAINER role", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "trainer-user",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue({
      id: "mp-1",
      remainingPT: 5,
      trainerId: "tp-1",
    });
    (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("트레이너 프로필이 없습니다.");
  });

  it("returns 400 when admin creates schedule for member without trainer", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "admin-user",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue({
      id: "mp-1",
      remainingPT: 5,
      trainerId: null,  // No trainer assigned
    });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("회원에게 배정된 트레이너가 없습니다.");
  });

  it("creates schedule successfully for trainer with PT deduction", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "trainer-user",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue({
      id: "mp-1",
      remainingPT: 5,
      trainerId: "tp-1",
    });
    (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "tp-1",
    });

    const mockSchedule = {
      id: "new-sched-1",
      scheduledAt: new Date("2025-03-15T10:00:00Z"),
      status: "SCHEDULED",
      memberProfile: {
        userId: "member-user",
        user: { name: "김회원" },
        remainingPT: 5,
      },
      trainer: { id: "tp-1", user: { name: "박트레이너" } },
      shop: { name: "Test Gym" },
    };

    let txCallback: Function;
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
      txCallback = fn;
      const mockTx = {
        schedule: { create: jest.fn().mockResolvedValue(mockSchedule) },
        memberProfile: { update: jest.fn() },
      };
      return fn(mockTx);
    });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
          notes: "Morning session",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toContain("김회원");
    expect(body.message).toContain("잔여 PT: 4회");
    expect(body.schedule).toBeDefined();
  });

  it("creates schedule for admin using member's assigned trainer", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "admin-user",
      userRole: "ADMIN",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    (prisma.memberProfile.findFirst as jest.Mock).mockResolvedValue({
      id: "mp-1",
      remainingPT: 10,
      trainerId: "assigned-tp",
    });

    const mockSchedule = {
      id: "new-sched-2",
      scheduledAt: new Date("2025-03-15T10:00:00Z"),
      status: "SCHEDULED",
      memberProfile: {
        userId: "member-user",
        user: { name: "이회원" },
        remainingPT: 10,
      },
      trainer: { id: "assigned-tp", user: { name: "김트레이너" } },
      shop: { name: "Test Gym" },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
      const mockTx = {
        schedule: {
          create: jest.fn().mockResolvedValue(mockSchedule),
        },
        memberProfile: { update: jest.fn() },
      };
      const result = await fn(mockTx);

      // Verify the trainer ID used is the member's assigned trainer
      const createCall = mockTx.schedule.create.mock.calls[0][0];
      expect(createCall.data.trainerId).toBe("assigned-tp");

      return result;
    });

    const response = await POST(
      createRequest("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: "mp-1",
          scheduledAt: "2025-03-15T10:00:00Z",
        }),
      })
    );

    expect(response.status).toBe(201);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      userRole: "TRAINER",
      shopId: "shop-1",
      isSuperAdmin: false,
    } as AuthWithShopResult);

    // Simulate request.json() throwing
    const badRequest = {
      url: "http://localhost:3000/api/schedules",
      json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as Request;

    const response = await POST(badRequest);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("예약 등록 중 오류가 발생했습니다.");
  });
});
