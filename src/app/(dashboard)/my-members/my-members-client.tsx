"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ClipboardCheck,
  UserPlus,
  LinkIcon,
  Search,
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

interface ShopMember {
  id: string;
  name: string;
  phone: string | null;
  trainerName: string | null;
}

interface Props {
  members: MyMember[];
  shopMembers: ShopMember[];
  trainerProfileId: string;
}

export function MyMembersClient({ members, shopMembers, trainerProfileId }: Props) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredShopMembers = shopMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleAssignMember(memberId: string) {
    setAssigning(memberId);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerId: trainerProfileId }),
      });
      if (res.ok) {
        setAddDialogOpen(false);
        setSearchQuery("");
        router.refresh();
      }
    } finally {
      setAssigning(null);
    }
  }

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          내 회원 추가
        </Button>
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

      {/* 기존 회원 목록 */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              담당 회원이 없습니다.
            </CardContent>
          </Card>
        ) : (
          members.map((member) => {
            const lastAttendance = member.attendances[0];
            return (
              <Card key={member.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
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
                    </div>
                    <Link href={`/attendance?memberId=${member.id}`}>
                      <Button size="sm" variant="outline">
                        <ClipboardCheck className="h-4 w-4 mr-1" />
                        출석
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 내 회원 추가 Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 회원 추가</DialogTitle>
            <DialogDescription>
              같은 PT샵의 회원을 내 담당으로 배정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredShopMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {shopMembers.length === 0
                  ? "배정 가능한 회원이 없습니다."
                  : "검색 결과가 없습니다."}
              </p>
            ) : (
              filteredShopMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssignMember(member.id)}
                  disabled={assigning !== null}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.trainerName ? `담당: ${member.trainerName}` : "미배정"}
                      </p>
                    </div>
                  </div>
                  {assigning === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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
