"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User,
  Phone,
  UserPlus,
  LinkIcon,
  Check,
} from "lucide-react";

interface MyMember {
  id: string;
  remainingPT: number;
  user: { name: string; phone: string | null };
  attendances: { checkInTime: string }[];
}

interface Props {
  members: MyMember[];
  trainerProfileId: string;
  inviteUrl: string;
}

export function MyMembersClient({ members, trainerProfileId, inviteUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("회원 가입 링크가 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="내 회원"
        description={`담당 회원 ${members.length}명`}
      />

      <div className="flex gap-2">
        <Link href="/my-members/add">
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            내 회원 추가
          </Button>
        </Link>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopyInviteLink}
          title="회원 가입 링크 복사"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 회원 목록 */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            담당 회원이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {members.map((member) => {
                const lastAttendance = member.attendances[0];
                return (
                  <Link
                    key={member.id}
                    href={`/my-members/${member.id}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.user.name}</p>
                        <Badge variant={member.remainingPT > 0 ? "default" : "secondary"}>
                          PT {member.remainingPT}회
                        </Badge>
                      </div>
                      {member.user.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.user.phone}
                        </div>
                      )}
                      {lastAttendance && (
                        <p className="text-xs text-muted-foreground mt-1">
                          마지막 PT: {new Date(lastAttendance.checkInTime).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
