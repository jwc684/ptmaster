import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Building2, UserPlus } from "lucide-react";
import { MemberLoginButton } from "@/components/members/member-login-button";
import { ClickableRow } from "@/components/ui/clickable-row";
import { format } from "date-fns";

async function getMembers(shopFilter: { shopId?: string }) {
  const hasShopFilter = shopFilter.shopId !== undefined;

  return prisma.memberProfile.findMany({
    where: shopFilter,
    select: {
      id: true,
      userId: true,
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
      shop: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: hasShopFilter ? undefined : 100,
  });
}

async function getMemberCount(shopFilter: { shopId?: string }) {
  return prisma.memberProfile.count({ where: shopFilter });
}

/**
 * 카카오로 가입했지만 센터를 선택하지 않은 회원 (SUPER_ADMIN 전용)
 */
async function getUnregisteredMembers() {
  return prisma.user.findMany({
    where: {
      role: "MEMBER",
      shopId: null,
      memberProfile: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      accounts: {
        select: { provider: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
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

  const [members, totalCount, unregisteredMembers] = await Promise.all([
    getMembers(shopFilter),
    getMemberCount(shopFilter),
    authResult.isSuperAdmin ? getUnregisteredMembers() : Promise.resolve([]),
  ]);

  const colCount = authResult.isSuperAdmin ? 6 : 5;

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="hidden sm:table-cell">연락처</TableHead>
                {authResult.isSuperAdmin && <TableHead className="hidden md:table-cell">샵</TableHead>}
                <TableHead className="hidden sm:table-cell">트레이너</TableHead>
                <TableHead>잔여 PT</TableHead>
                {authResult.isSuperAdmin && <TableHead className="w-[60px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">등록된 회원이 없습니다.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <ClickableRow key={member.id} href={`/members/${member.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.user.name}</div>
                        <div className="sm:hidden text-xs text-muted-foreground">
                          {member.trainer ? member.trainer.user.name : ""}
                          {member.user.phone && (
                            <span>{member.trainer ? " · " : ""}{member.user.phone}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground">
                        {member.user.phone || "-"}
                      </span>
                    </TableCell>
                    {authResult.isSuperAdmin && (
                      <TableCell className="hidden md:table-cell">
                        {member.shop ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            {member.shop.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground">
                        {member.trainer ? member.trainer.user.name : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.remainingPT > 0 ? "default" : "secondary"}
                      >
                        {member.remainingPT}회
                      </Badge>
                    </TableCell>
                    {authResult.isSuperAdmin && (
                      <TableCell>
                        <MemberLoginButton
                          userId={member.userId}
                          userName={member.user.name}
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

      {authResult.isSuperAdmin && unregisteredMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              미등록 회원
              <Badge variant="secondary">{unregisteredMembers.length}</Badge>
            </CardTitle>
            <CardDescription>
              카카오로 가입했지만 센터를 선택하지 않은 회원
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="hidden sm:table-cell">이메일</TableHead>
                  <TableHead className="hidden sm:table-cell">연락처</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unregisteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="sm:hidden text-xs text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground">{member.email}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground">{member.phone || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {format(member.createdAt, "yy.MM.dd")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MemberLoginButton
                        userId={member.id}
                        userName={member.name}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
