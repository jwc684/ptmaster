"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Phone,
  UserPlus,
  LinkIcon,
  Copy,
  Check,
  Loader2,
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
}

export function MyMembersClient({ members, trainerProfileId }: Props) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MEMBER" }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteUrl(data.inviteUrl);
      }
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="내 회원"
        description={`담당 회원 ${members.length}명`}
      />

      <div className="flex gap-2">
        <Link href="/my-members/add">
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            내 회원 추가
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setInviteUrl(null);
            setCopied(false);
            setInviteDialogOpen(true);
          }}
        >
          <LinkIcon className="h-4 w-4 mr-1" />
          회원 가입 링크
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

      {/* 회원 가입 링크 Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 가입 링크</DialogTitle>
            <DialogDescription>
              링크를 공유하면 신규 회원이 가입 시 자동으로 내 담당으로 배정됩니다.
            </DialogDescription>
          </DialogHeader>

          {inviteUrl ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                30일 유효, 1회 사용 가능
              </p>
            </div>
          ) : (
            <Button
              onClick={handleCreateInvite}
              disabled={inviteLoading}
              className="w-full"
            >
              {inviteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              초대 링크 생성
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
