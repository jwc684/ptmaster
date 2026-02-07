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
  Activity,
  MessageSquare,
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
  Activity,
  MessageSquare,
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

  // TRAINER/MEMBER use bottom navigation on mobile — hide sidebar entirely on mobile
  if ((userRole === "TRAINER" || userRole === "MEMBER") && isMobile) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href={dashboardLink} className="flex items-center gap-4 group" onClick={handleMenuClick}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold truncate max-w-[140px] text-foreground" title={displayName}>
            {displayName}
          </span>
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
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                            isActive
                              ? 'bg-primary/15'
                              : 'bg-muted group-hover/item:bg-muted/80'
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
