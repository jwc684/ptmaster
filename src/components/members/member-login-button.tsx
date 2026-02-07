"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

interface MemberLoginButtonProps {
  userId: string;
  userName: string;
}

export function MemberLoginButton({ userId, userName }: MemberLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      const tokenResponse = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        toast.error(data.error || "로그인 토큰 생성에 실패했습니다.");
        return;
      }

      const { token } = await tokenResponse.json();

      window.open(
        `/login?impersonateToken=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent("/my")}`,
        "_blank"
      );
      toast.success(`${userName} 계정으로 새 탭에서 로그인합니다.`);
    } catch {
      toast.error("회원 계정으로 로그인하는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
      title={`${userName} 회원으로 로그인`}
    >
      <LogIn className="h-4 w-4" />
    </button>
  );
}
