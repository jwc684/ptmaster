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
  PlusCircle,
  CalendarDays,
  Shield,
  Crown,
  Building2,
  Activity,
  MessageSquare,
  Timer,
  Settings,
  Dumbbell,
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
import { PtMasterLogo } from "@/components/ui/pt-master-logo";

type IconComponentType = React.ComponentType<{ className?: string }>;
const iconMap: Record<string, IconComponentType> = {
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
  Activity,
  MessageSquare,
  Timer,
  Settings,
  Dumbbell,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setOpenMobile, isMobile } = useSidebar();
  const { currentShop, isSuperAdmin } = useShopContext();
  const userRoles = (session?.user?.roles ?? []) as UserRole[];

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => userRoles.some((r) => item.roles.includes(r))
  );

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Display shop name: use currentShop name if available, otherwise default to "PT Shop"
  const displayName = currentShop?.name || "PT Shop";
  const dashboardLink = isSuperAdmin ? "/super-admin" : "/dashboard";

  // TRAINER/MEMBER (without ADMIN/SUPER_ADMIN) use bottom navigation on mobile — hide sidebar entirely on mobile
  const hasAdminAccess = userRoles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
  if (!hasAdminAccess && isMobile) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href={dashboardLink} className="flex items-center gap-2 group" onClick={handleMenuClick}>
          <PtMasterLogo size="sm" variant="full" className="text-foreground" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 현재 경로와 가장 구체적으로 매칭되는 항목만 활성화 */}
              {filteredNavItems.map((item) => {
                const Icon = iconMap[item.icon];
                const activeHref = filteredNavItems
                  .filter(nav => pathname === nav.href || pathname.startsWith(`${nav.href}/`))
                  .sort((a, b) => b.href.length - a.href.length)[0]?.href;
                const isActive = item.href === activeHref;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} onClick={handleMenuClick} className="group/item">
                        {Icon && (
                          <div className={`flex h-11 w-11 items-center justify-center rounded-none transition-colors ${
                            isActive
                              ? 'bg-transparent'
                              : 'bg-transparent group-hover/item:bg-muted'
                          }`}>
                            <Icon className={`h-5 w-5 transition-colors ${
                              isActive ? 'text-primary' : 'text-muted-foreground group-hover/item:text-foreground'
                            }`} />
                          </div>
                        )}
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
