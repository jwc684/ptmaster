import { PtMasterLogo } from "@/components/ui/pt-master-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center">
        <div className="text-center text-primary-foreground">
          <PtMasterLogo size="lg" className="justify-center mb-6" />
          <p className="text-lg opacity-90">PT 센터 관리 시스템</p>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
