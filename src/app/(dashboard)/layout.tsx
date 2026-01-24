import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-x-hidden">
          <div className="w-full max-w-full px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
