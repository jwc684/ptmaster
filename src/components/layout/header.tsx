"use client";

import { useState, useEffect } from "react";
import { LogOut, Menu, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { ShopSelector } from "@/components/layout/shop-selector";

const roleLabels = {
  SUPER_ADMIN: "슈퍼 관리자",
  ADMIN: "관리자",
  TRAINER: "트레이너",
  MEMBER: "회원",
};

export function Header() {
  const { data: session } = useSession();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user;
  const userRoles = (user?.roles ?? []) as string[];
  const hasAdminAccess = userRoles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
  const useBottomNav = !hasAdminAccess && userRoles.some((r) => r === "TRAINER" || r === "MEMBER");
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className={`sticky top-0 z-50 flex h-12 items-center border-b bg-background px-3 sm:px-4 w-full ${useBottomNav ? "hidden md:flex" : ""}`}>
      {/* Left: Menu button (mobile only, hidden for roles using bottom nav) */}
      {!useBottomNav && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 flex-shrink-0"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      )}

      {/* Center: Shop Selector (Super Admin only) */}
      <div className="flex-1 flex justify-center md:justify-start md:ml-0 min-w-0 px-2">
        <ShopSelector />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* User Menu */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {userRoles.map((r) => (
                      <Badge key={r} variant="secondary" className="w-fit">
                        {roleLabels[r as keyof typeof roleLabels] ?? r}
                      </Badge>
                    ))}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/my">
                  <User className="mr-2 h-4 w-4" />
                  마이페이지
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </div>
    </header>
  );
}
