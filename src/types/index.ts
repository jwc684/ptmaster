import type { UserRole } from "@prisma/client";

export type { UserRole } from "@prisma/client";

// Route access configuration - Simplified for PT shop
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    "/super-admin",
    "/members",
    "/trainers",
    "/registration",
    "/schedule",
    "/attendance",
    "/payments",
    "/admins",
    "/super-admin/notification-logs",
    "/super-admin/cron-logs",
  ],
  ADMIN: [
    "/dashboard",
    "/members",
    "/trainers",
    "/registration",
    "/schedule",
    "/attendance",
    "/payments",
    "/admins",
  ],
  TRAINER: [
    "/dashboard",
    "/my-members",
    "/schedule",
    "/settings",
  ],
  MEMBER: [
    "/my",
    "/my/schedule",
    "/my/workout",
    "/my/settings",
  ],
};

// Public routes that don't require authentication
export const PUBLIC_ROUTES = ["/login", "/", "/invite", "/signup", "/admin/login"];

// API routes that are public
export const PUBLIC_API_ROUTES = ["/api/auth", "/api/health", "/api/invite", "/api/signup"];

// Dashboard paths by role
export const DASHBOARD_PATH: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin",
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
  // Super Admin only
  {
    title: "Dashboard",
    href: "/super-admin",
    icon: "Crown",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "PT샵 관리",
    href: "/super-admin/shops",
    icon: "Building2",
    roles: ["SUPER_ADMIN"],
  },
  // Regular navigation
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
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "트레이너 관리",
    href: "/trainers",
    icon: "UserCog",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "PT 등록",
    href: "/registration",
    icon: "PlusCircle",
    roles: ["SUPER_ADMIN", "ADMIN"],
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
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "예약",
    href: "/schedule",
    icon: "CalendarDays",
    roles: ["TRAINER"],
  },
  {
    title: "PT 출석",
    href: "/attendance",
    icon: "ClipboardCheck",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "설정",
    href: "/settings",
    icon: "Settings",
    roles: ["TRAINER"],
  },
  {
    title: "결제 관리",
    href: "/payments",
    icon: "CreditCard",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "관리자 관리",
    href: "/admins",
    icon: "Shield",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "대시보드",
    href: "/my",
    icon: "LayoutDashboard",
    roles: ["MEMBER"],
  },
  {
    title: "예약",
    href: "/my/schedule",
    icon: "CalendarDays",
    roles: ["MEMBER"],
  },
  {
    title: "운동",
    href: "/my/workout",
    icon: "Dumbbell",
    roles: ["MEMBER"],
  },
  {
    title: "설정",
    href: "/my/settings",
    icon: "Settings",
    roles: ["MEMBER"],
  },
  // Super Admin - Logs (bottom)
  {
    title: "알림 로그",
    href: "/super-admin/notification-logs",
    icon: "MessageSquare",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Cron 로그",
    href: "/super-admin/cron-logs",
    icon: "Timer",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "접근 기록",
    href: "/super-admin/logs",
    icon: "Activity",
    roles: ["SUPER_ADMIN"],
  },
];
