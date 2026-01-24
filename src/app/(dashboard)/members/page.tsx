import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Phone, ChevronRight } from "lucide-react";

async function getMembers() {
  return prisma.memberProfile.findMany({
    select: {
      id: true,
      remainingPT: true,
      joinDate: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      trainer: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function MembersPage() {
  const session = await auth();

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const members = await getMembers();

  return (
    <div className="space-y-4">
      <PageHeader
        title="회원 관리"
        description={`총 ${members.length}명의 회원`}
        action={{
          label: "회원 등록",
          href: "/members/new",
        }}
      />

      {/* 모바일 친화적 회원 목록 */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              등록된 회원이 없습니다.
            </CardContent>
          </Card>
        ) : (
          members.map((member) => (
            <Link key={member.id} href={`/members/${member.id}`} className="block">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{member.user.name}</p>
                          <Badge variant={member.remainingPT > 0 ? "default" : "secondary"} className="text-xs">
                            PT {member.remainingPT}회
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {member.user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {member.user.phone}
                            </span>
                          )}
                        </div>
                        {member.trainer && (
                          <p className="text-xs text-muted-foreground mt-1">
                            담당: {member.trainer.user.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
