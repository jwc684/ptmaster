import { Dumbbell } from "lucide-react";

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
          <Dumbbell className="h-20 w-20 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-2">FitCenter</h1>
          <p className="text-lg opacity-90">피트니스 센터 관리 시스템</p>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
