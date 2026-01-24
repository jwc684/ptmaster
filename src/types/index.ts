import type { UserRole } from "@prisma/client";

export type { UserRole } from "@prisma/client";

// Route access configuration - Simplified for PT shop
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  ADMIN: [
    "/dashboard",
    "/members",
    "/trainers",
    "/registration",
    "/attendance",
    "/payments",
    "/admins",
  ],
  TRAINER: [
    "/dashboard",
    "/my-members",
    "/schedule",
    "/attendance",
  ],
  MEMBER: [
    "/my",
  ],
};

// Public routes that don't require authentication
export const PUBLIC_ROUTES = ["/login", "/register", "/"];

// API routes that are public
export const PUBLIC_API_ROUTES = ["/api/auth", "/api/health", "/api/debug", "/api/setup"];

// Dashboard paths by role
export const DASHBOARD_PATH: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  TRAINER: "/dashboard",
  MEMBER: "/my",
};

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

// Simplified navigation for PT shop
export const NAV_ITEMS: NavItem[] = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["ADMIN", "TRAINER"],
  },
  {
    title: "회원 관리",
    href: "/members",
    icon: "Users",
    roles: ["ADMIN"],
  },
  {
    title: "트레이너 관리",
    href: "/trainers",
    icon: "UserCog",
    roles: ["ADMIN"],
  },
  {
    title: "PT 등록",
    href: "/registration",
    icon: "PlusCircle",
    roles: ["ADMIN"],
  },
  {
    title: "내 회원",
    href: "/my-members",
    icon: "Users",
    roles: ["TRAINER"],
  },
  {
    title: "일정 관리",
    href: "/schedule",
    icon: "CalendarDays",
    roles: ["TRAINER"],
  },
  {
    title: "PT 출석",
    href: "/attendance",
    icon: "ClipboardCheck",
    roles: ["ADMIN", "TRAINER"],
  },
  {
    title: "결제 관리",
    href: "/payments",
    icon: "CreditCard",
    roles: ["ADMIN"],
  },
  {
    title: "관리자 관리",
    href: "/admins",
    icon: "Shield",
    roles: ["ADMIN"],
  },
  {
    title: "마이페이지",
    href: "/my",
    icon: "User",
    roles: ["MEMBER"],
  },
];
