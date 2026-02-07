"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

interface ImpersonateButtonProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function ImpersonateButton({ userId, userName, userEmail }: ImpersonateButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImpersonate = async () => {
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
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)}>
        <LogIn className="mr-2 h-4 w-4" />
        회원으로 로그인
      </Button>
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="회원 계정으로 로그인"
        description={`${userName} (${userEmail}) 계정으로 새 탭에서 로그인하시겠습니까?`}
        confirmLabel="로그인"
        onConfirm={handleImpersonate}
        isLoading={loading}
      />
    </>
  );
}
