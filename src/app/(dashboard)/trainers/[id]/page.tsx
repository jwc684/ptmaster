import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, User, Phone, Mail, Users } from "lucide-react";
import { AssignMemberDialog } from "@/components/trainer/assign-member-dialog";
import { DeleteTrainerButton } from "@/components/trainer/delete-trainer-button";

async function getTrainer(id: string) {
  return prisma.trainerProfile.findUnique({
    where: { id },
    select: {
      id: true,
      bio: true,
      createdAt: true,
      user: { select: { name: true, email: true, phone: true } },
      members: {
        select: {
          id: true,
          remainingPT: true,
          user: { select: { name: true, phone: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
}

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const trainer = await getTrainer(id);

  if (!trainer) {
    notFound();
  }

  const totalPT = trainer.members.reduce((sum, m) => sum + m.remainingPT, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={trainer.user.name}
        description="트레이너 정보"
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/trainers/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </Link>
        </Button>
        <AssignMemberDialog
          trainerId={id}
          trainerName={trainer.user.name}
          currentMemberIds={trainer.members.map((m) => m.id)}
        />
        <DeleteTrainerButton
          trainerId={id}
          trainerName={trainer.user.name}
          hasMember={trainer.members.length > 0}
        />
      </div>
      {trainer.members.length > 0 && (
        <p className="text-xs text-muted-foreground">
          * 담당 회원이 있는 트레이너는 삭제할 수 없습니다. 먼저 회원을 다른 트레이너에게 재배정해주세요.
        </p>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-lg">{trainer.user.name}</p>
              <p className="text-sm text-muted-foreground">트레이너</p>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{trainer.user.email}</span>
            </div>
            {trainer.user.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{trainer.user.phone}</span>
              </div>
            )}
          </div>
          {trainer.bio && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">소개</p>
              <p className="text-sm whitespace-pre-wrap">{trainer.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">담당 회원</p>
            <p className="text-2xl font-bold">{trainer.members.length}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">잔여 PT</p>
            <p className="text-2xl font-bold">{totalPT}회</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Members */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            담당 회원 ({trainer.members.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trainer.members.length > 0 ? (
            <div className="space-y-3">
              {trainer.members.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-accent/50 -mx-2 px-2 rounded"
                >
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    {member.user.phone && (
                      <p className="text-xs text-muted-foreground">
                        {member.user.phone}
                      </p>
                    )}
                  </div>
                  <Badge variant={member.remainingPT > 0 ? "default" : "secondary"}>
                    PT {member.remainingPT}회
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              아직 배정된 회원이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
