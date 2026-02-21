import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { ImpersonateBanner } from "@/components/layout/impersonate-banner";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // MEMBER without shopId must complete signup (runs in Node.js, Prisma works)
  const session = await auth();
  if (session?.user?.role === "MEMBER" && !session.user.shopId) {
    redirect("/signup/select-shop");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ImpersonateBanner />
        <Header />
        <div className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-full">
          <div className="w-full max-w-full px-4 py-4 md:px-6 md:py-6 overflow-hidden pb-20 md:pb-6">
            {children}
          </div>
        </div>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
