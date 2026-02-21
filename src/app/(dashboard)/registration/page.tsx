import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RegistrationList } from "@/components/registration/registration-list";

async function getPayments(shopFilter: { shopId?: string }) {
  return prisma.payment.findMany({
    where: shopFilter,
    select: {
      id: true,
      amount: true,
      ptCount: true,
      status: true,
      description: true,
      paidAt: true,
      memberProfile: {
        select: {
          id: true,
          user: { select: { name: true, phone: true } },
          trainer: { select: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });
}

export default async function RegistrationListPage() {
  const authResult = await getAuthWithShop();

  if (!authResult.isAuthenticated) {
    redirect("/login");
  }

  if (!authResult.userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);
  const payments = await getPayments(shopFilter);

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPT = payments.reduce((sum, p) => sum + p.ptCount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="PT 등록 내역"
        description={`총 ${payments.length}건의 등록`}
        action={{
          label: "PT 등록",
          href: "/registration/new",
        }}
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">총 결제금액</p>
            <p className="text-xl font-bold">₩{totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">총 PT 등록</p>
            <p className="text-xl font-bold">{totalPT}회</p>
          </CardContent>
        </Card>
      </div>

      {/* 등록 리스트 */}
      <Card>
        <CardContent className="p-0">
          <RegistrationList
            payments={payments.map((p) => ({
              ...p,
              paidAt: p.paidAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
