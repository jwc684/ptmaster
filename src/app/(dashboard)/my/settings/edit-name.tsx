"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface Props {
  memberId: string;
  currentName: string;
}

export function EditName({ memberId, currentName }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (trimmed === currentName) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "이름 변경에 실패했습니다.");
        return;
      }

      toast.success("이름이 변경되었습니다.");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("이름 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">이름</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{currentName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setName(currentName);
              setEditing(true);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-sm text-muted-foreground">이름</span>
      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-sm w-32"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3 text-green-600" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
