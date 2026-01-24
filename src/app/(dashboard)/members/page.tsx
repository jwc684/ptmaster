import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Phone, ChevronRight, Users } from "lucide-react";

async function getMembers(shopFilter: { shopId?: string }) {
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
  const members = await getMembers(shopFilter);

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
        description={`총 ${members.length}명의 회원`}
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
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>담당 트레이너</TableHead>
                    <TableHead>잔여 PT</TableHead>
                    <TableHead>가입일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {}}
                    >
                      <TableCell>
                        <Link
                          href={`/members/${member.id}`}
                          className="font-medium hover:underline"
                        >
                          {member.user.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {member.user.phone || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {member.user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {member.trainer?.user.name || (
                          <span className="text-muted-foreground">미배정</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.remainingPT > 0 ? "default" : "secondary"}
                        >
                          {member.remainingPT}회
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.joinDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {members.map((member) => (
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
                            <Badge
                              variant={member.remainingPT > 0 ? "default" : "secondary"}
                              className="text-xs"
                            >
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
            ))}
          </div>
        </>
      )}
    </div>
  );
}
