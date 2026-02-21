"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  User,
  Settings,
  Dumbbell,
} from "lucide-react";

import { NAV_ITEMS } from "@/types";
import type { UserRole } from "@/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  User,
  Settings,
  Dumbbell,
};

// Roles that use bottom navigation on mobile instead of sidebar
const BOTTOM_NAV_ROLES: UserRole[] = ["TRAINER", "MEMBER"];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRoles = (session?.user?.roles ?? []) as UserRole[];

  // Show bottom nav only for TRAINER/MEMBER who don't also have ADMIN/SUPER_ADMIN
  const hasAdminAccess = userRoles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
  const hasBottomNavRole = userRoles.some((r) => BOTTOM_NAV_ROLES.includes(r));
  if (!hasBottomNavRole || hasAdminAccess) return null;

  const navItems = NAV_ITEMS.filter(
    (item) => userRoles.some((r) => item.roles.includes(r))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/my"
              ? pathname === "/my"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="text-[10px] font-medium leading-none">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
