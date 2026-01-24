import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCog, Phone, Users, ChevronRight } from "lucide-react";

async function getTrainers(shopFilter: { shopId?: string }) {
  // Limit results for "all shops" view
  const hasShopFilter = shopFilter.shopId !== undefined;

  return prisma.trainerProfile.findMany({
    where: shopFilter,
    select: {
      id: true,
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
    take: hasShopFilter ? undefined : 50, // Limit when viewing all shops
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

  if (authResult.userRole !== "ADMIN" && authResult.userRole !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

  // Run queries in parallel
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

      {trainers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <UserCog className="h-8 w-8 mx-auto mb-2 opacity-50" />
            등록된 트레이너가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              트레이너 목록
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="divide-y divide-border/50">
              {trainers.map((trainer) => (
                <Link
                  key={trainer.id}
                  href={`/trainers/${trainer.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  {/* 아이콘 */}
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UserCog className="h-6 w-6 text-primary" />
                  </div>

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-foreground truncate">
                      {trainer.user.name}
                    </p>
                    {trainer.user.phone && (
                      <p className="text-[15px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {trainer.user.phone}
                      </p>
                    )}
                    {trainer.bio && (
                      <p className="text-[13px] text-muted-foreground/70 mt-0.5 truncate">
                        {trainer.bio}
                      </p>
                    )}
                  </div>

                  {/* 담당 회원 & 화살표 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {trainer._count.members}명
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
