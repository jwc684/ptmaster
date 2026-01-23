"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Loader2 } from "lucide-react";

interface Member {
  id: string;
  user: { name: string; phone: string | null };
  remainingPT: number;
  trainerId: string | null;
  trainer: { id: string; user: { name: string } } | null;
}

interface AssignMemberDialogProps {
  trainerId: string;
  trainerName: string;
  currentMemberIds: string[];
}

export function AssignMemberDialog({
  trainerId,
  trainerName,
  currentMemberIds,
}: AssignMemberDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/members?limit=1000", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const memberList = data.members || [];
        setMembers(memberList);
        // 현재 배정된 회원들은 기본 선택
        setSelectedIds(currentMemberIds);
      } else {
        const error = await res.json().catch(() => ({}));
        console.error("API Error:", res.status, error);
        toast.error(error.error || `회원 목록을 불러오는데 실패했습니다. (${res.status})`);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("회원 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.user.name.toLowerCase().includes(search.toLowerCase()) ||
    m.user.phone?.includes(search)
  );

  function toggleMember(memberId: string) {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 새로 추가할 회원들
      const toAssign = selectedIds.filter((id) => !currentMemberIds.includes(id));
      // 해제할 회원들
      const toUnassign = currentMemberIds.filter((id) => !selectedIds.includes(id));

      // 할당
      for (const memberId of toAssign) {
        await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainerId }),
        });
      }

      // 해제
      for (const memberId of toUnassign) {
        await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainerId: null }),
        });
      }

      toast.success("회원 배정이 완료되었습니다.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("회원 배정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1">
          <UserPlus className="mr-2 h-4 w-4" />
          회원 배정
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{trainerName} 트레이너 회원 배정</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 전화번호로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {search ? "검색 결과가 없습니다." : "배정 가능한 회원이 없습니다."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => {
                const isCurrentTrainer = member.trainerId === trainerId;
                const hasOtherTrainer = member.trainerId && !isCurrentTrainer;
                return (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.user.phone || "전화번호 없음"} · PT {member.remainingPT}회
                      </p>
                    </div>
                    {isCurrentTrainer && (
                      <span className="text-xs text-primary">현재 배정</span>
                    )}
                    {hasOtherTrainer && (
                      <span className="text-xs text-orange-500">
                        {member.trainer?.user.name}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="flex-1"
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "저장 중..." : `저장 (${selectedIds.length}명)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
