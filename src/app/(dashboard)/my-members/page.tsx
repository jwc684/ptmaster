import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, ChevronRight, ClipboardCheck } from "lucide-react";

async function getMyMembers(trainerId: string) {
  return prisma.memberProfile.findMany({
    where: { trainerId },
    select: {
      id: true,
      remainingPT: true,
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
      attendances: {
        select: { checkInTime: true },
        orderBy: { checkInTime: "desc" },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

async function getTrainerProfile(userId: string) {
  return prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export default async function MyMembersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "TRAINER") {
    redirect("/dashboard");
  }

  const trainerProfile = await getTrainerProfile(session.user.id);
  if (!trainerProfile) {
    redirect("/dashboard");
  }

  const members = await getMyMembers(trainerProfile.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="내 회원"
        description={`담당 회원 ${members.length}명`}
      />

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
                            마지막 PT: {lastAttendance.checkInTime.toLocaleDateString("ko-KR")}
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
    </div>
  );
}
