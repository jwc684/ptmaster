"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User,
  Phone,
  Search,
  UserPlus,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface AvailableMember {
  id: string;
  name: string;
  phone: string | null;
  remainingPT: number;
  trainerName: string | null;
}

interface Props {
  members: AvailableMember[];
  trainerProfileId: string;
}

export function AddMemberClient({ members, trainerProfileId }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery))
  );

  async function handleAssign(memberId: string) {
    setAssigning(memberId);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerId: trainerProfileId }),
      });
      if (res.ok) {
        toast.success("회원이 배정되었습니다.");
        router.push("/my-members");
        router.refresh();
      } else {
        toast.error("배정에 실패했습니다.");
      }
    } catch {
      toast.error("배정에 실패했습니다.");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/my-members"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          내 회원
        </Link>
        <h1 className="text-xl font-bold">내 회원 추가</h1>
        <p className="text-sm text-muted-foreground">
          배정 가능한 회원 {members.length}명
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름 또는 전화번호로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {members.length === 0
                ? "배정 가능한 회원이 없습니다."
                : "검색 결과가 없습니다."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((member) => (
            <Card key={member.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <button
                  onClick={() => handleAssign(member.id)}
                  disabled={assigning !== null}
                  className="w-full flex items-center justify-between text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge variant="outline" className="text-xs">
                          PT {member.remainingPT}회
                        </Badge>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {member.trainerName
                          ? `현재 담당: ${member.trainerName}`
                          : "미배정"}
                      </p>
                    </div>
                  </div>
                  {assigning === member.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
                  ) : (
                    <UserPlus className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
