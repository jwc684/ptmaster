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
      const response = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "회원 로그인에 실패했습니다.");
        return;
      }

      toast.success(`${userName} 회원으로 전환했습니다.`);
      window.location.href = "/my";
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
        description={`${userName} (${userEmail}) 회원으로 전환하시겠습니까?`}
        confirmLabel="로그인"
        onConfirm={handleImpersonate}
        isLoading={loading}
      />
    </>
  );
}
