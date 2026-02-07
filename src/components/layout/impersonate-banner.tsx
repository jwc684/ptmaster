"use client";

import { useSession } from "next-auth/react";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImpersonateBanner() {
  const { data: session } = useSession();
  const [stopping, setStopping] = useState(false);

  if (!session?.user?.isImpersonating) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch("/api/super-admin/impersonate", { method: "DELETE" });
      if (!res.ok) {
        toast.error("세션 복구에 실패했습니다.");
        return;
      }
      toast.success("Super Admin으로 돌아갔습니다.");
      window.location.href = "/super-admin";
    } catch {
      toast.error("세션 복구에 실패했습니다.");
    } finally {
      setStopping(false);
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "관리자",
    TRAINER: "트레이너",
    MEMBER: "회원",
  };
  const roleLabel = roleLabels[session.user.role] || session.user.role;

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <span>
        {session.user.impersonateShopName && `[${session.user.impersonateShopName}] `}
        <strong>{session.user.name}</strong> {roleLabel}으로 로그인 중
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 px-3 text-xs"
        onClick={handleStop}
        disabled={stopping}
      >
        <X className="mr-1 h-3 w-3" />
        {stopping ? "복구 중..." : "돌아가기"}
      </Button>
    </div>
  );
}
