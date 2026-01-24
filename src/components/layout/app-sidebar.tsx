"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardCheck,
  CreditCard,
  User,
  Dumbbell,
  PlusCircle,
  CalendarDays,
  Shield,
  Crown,
  Building2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/types";
import type { UserRole } from "@/types";
import { useShopContext } from "@/hooks/use-shop-context";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardCheck,
  CreditCard,
  User,
  PlusCircle,
  CalendarDays,
  Shield,
  Crown,
  Building2,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setOpenMobile, isMobile } = useSidebar();
  const { currentShop, isSuperAdmin } = useShopContext();
  const userRole = session?.user?.role as UserRole | undefined;

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => userRole && item.roles.includes(userRole)
  );

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Display shop name: use currentShop name if available, otherwise default to "PT Shop"
  const displayName = currentShop?.name || "PT Shop";
  const dashboardLink = isSuperAdmin ? "/super-admin" : "/dashboard";

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href={dashboardLink} className="flex items-center gap-2" onClick={handleMenuClick}>
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold truncate max-w-[160px]" title={displayName}>
            {displayName}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} onClick={handleMenuClick}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
