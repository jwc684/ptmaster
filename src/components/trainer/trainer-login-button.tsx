"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

interface TrainerLoginButtonProps {
  userId: string;
  trainerName: string;
}

export function TrainerLoginButton({ userId, trainerName }: TrainerLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, openInNewTab: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "트레이너 로그인에 실패했습니다.");
        return;
      }

      const data = await response.json();
      toast.success(`${trainerName} 트레이너로 새 탭에서 열립니다.`);
      window.open(`/api/super-admin/impersonate/start?token=${data.token}`, "_blank");
    } catch {
      toast.error("트레이너 계정으로 로그인하는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
      title={`${trainerName} 트레이너로 로그인`}
    >
      <LogIn className="h-4 w-4" />
    </button>
  );
}
