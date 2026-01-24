import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, ChevronRight, Users } from "lucide-react";

async function getMembers(shopFilter: { shopId?: string }) {
  // Limit results for performance - for "all shops" view (no filter), limit to 100
  const hasShopFilter = shopFilter.shopId !== undefined;

  return prisma.memberProfile.findMany({
    where: shopFilter,
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
    take: hasShopFilter ? undefined : 100, // Limit when viewing all shops
  });
}

async function getMemberCount(shopFilter: { shopId?: string }) {
  return prisma.memberProfile.count({ where: shopFilter });
}

export default async function MembersPage() {
  const authResult = await getAuthWithShop();

  if (!authResult.isAuthenticated) {
    redirect("/login");
  }

  if (authResult.userRole !== "ADMIN" && authResult.userRole !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

  // Run queries in parallel
  const [members, totalCount] = await Promise.all([
    getMembers(shopFilter),
    getMemberCount(shopFilter),
  ]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="회원 관리"
        description={
          members.length < totalCount
            ? `총 ${totalCount}명 중 최근 ${members.length}명 표시`
            : `총 ${totalCount}명의 회원`
        }
        action={{
          label: "회원 등록",
          href: "/members/new",
        }}
      />

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            등록된 회원이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              회원 목록
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="divide-y divide-border/50">
              {members.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  {/* 아이콘 */}
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-foreground truncate">
                      {member.user.name}
                    </p>
                    {member.user.phone && (
                      <p className="text-[14px] text-muted-foreground flex items-center gap-1 truncate">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{member.user.phone}</span>
                      </p>
                    )}
                    {member.trainer && (
                      <p className="text-[12px] text-muted-foreground/70 mt-0.5 truncate">
                        담당: {member.trainer.user.name}
                      </p>
                    )}
                  </div>

                  {/* 잔여 PT & 화살표 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge
                      variant={member.remainingPT > 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      PT {member.remainingPT}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
