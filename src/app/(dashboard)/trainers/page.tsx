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
import { UserCog, Phone, Users, ChevronRight } from "lucide-react";

async function getTrainers(shopFilter: { shopId?: string }) {
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
      members: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
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
  const trainers = await getTrainers(shopFilter);

  return (
    <div className="space-y-4">
      <PageHeader
        title="트레이너 관리"
        description={`트레이너 ${trainers.length}명`}
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
                    <TableHead>담당 회원</TableHead>
                    <TableHead>소개</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((trainer) => (
                    <TableRow
                      key={trainer.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <Link
                          href={`/trainers/${trainer.id}`}
                          className="font-medium hover:underline"
                        >
                          {trainer.user.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {trainer.user.phone || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {trainer.user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {trainer.members.length}명
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {trainer.bio ? (
                          <span className="text-muted-foreground text-sm truncate block">
                            {trainer.bio}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {trainers.map((trainer) => (
              <Link key={trainer.id} href={`/trainers/${trainer.id}`} className="block">
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserCog className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{trainer.user.name}</p>
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {trainer.members.length}명
                            </Badge>
                          </div>
                          {trainer.user.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {trainer.user.phone}
                            </div>
                          )}
                          {trainer.bio && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {trainer.bio}
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
