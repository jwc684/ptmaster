import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCog, Users } from "lucide-react";
import { TrainerLoginButton } from "@/components/trainer/trainer-login-button";
import { ClickableRow } from "@/components/ui/clickable-row";

async function getTrainers(shopFilter: { shopId?: string }) {
  const hasShopFilter = shopFilter.shopId !== undefined;

  return prisma.trainerProfile.findMany({
    where: shopFilter,
    select: {
      id: true,
      userId: true,
      bio: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: hasShopFilter ? undefined : 50,
  });
}

async function getTrainerCount(shopFilter: { shopId?: string }) {
  return prisma.trainerProfile.count({ where: shopFilter });
}

export default async function TrainersPage() {
  const authResult = await getAuthWithShop();

  if (!authResult.isAuthenticated) {
    redirect("/login");
  }

  if (!authResult.userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

  const [trainers, totalCount] = await Promise.all([
    getTrainers(shopFilter),
    getTrainerCount(shopFilter),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="트레이너 관리"
        description={
          trainers.length < totalCount
            ? `총 ${totalCount}명 중 최근 ${trainers.length}명 표시`
            : `트레이너 ${totalCount}명`
        }
        action={{
          label: "트레이너 등록",
          href: "/trainers/new",
        }}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="hidden sm:table-cell">연락처</TableHead>
                <TableHead>담당 회원</TableHead>
                {authResult.isSuperAdmin && <TableHead className="w-[60px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={authResult.isSuperAdmin ? 4 : 3} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <UserCog className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">등록된 트레이너가 없습니다.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                trainers.map((trainer) => (
                  <ClickableRow key={trainer.id} href={`/trainers/${trainer.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{trainer.user.name}</div>
                        {trainer.bio && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {trainer.bio}
                          </div>
                        )}
                        <div className="sm:hidden text-xs text-muted-foreground">
                          {trainer.user.phone || ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground">
                        {trainer.user.phone || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {trainer._count.members}명
                      </div>
                    </TableCell>
                    {authResult.isSuperAdmin && (
                      <TableCell>
                        <TrainerLoginButton
                          userId={trainer.userId}
                          trainerName={trainer.user.name}
                        />
                      </TableCell>
                    )}
                  </ClickableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
