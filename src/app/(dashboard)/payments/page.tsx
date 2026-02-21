import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, TrendingUp } from "lucide-react";
import { PaymentList } from "@/components/payments/payment-list";

async function getPaymentStats(shopFilter: { shopId?: string }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [payments, monthlyStats] = await Promise.all([
    prisma.payment.findMany({
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
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 30,
    }),
    prisma.payment.aggregate({
      _sum: { amount: true, ptCount: true },
      _count: true,
      where: {
        status: "COMPLETED",
        paidAt: { gte: startOfMonth },
        ...shopFilter,
      },
    }),
  ]);

  return {
    payments,
    monthlyTotal: Number(monthlyStats._sum.amount || 0),
    monthlyPTCount: monthlyStats._sum.ptCount || 0,
    monthlyCount: monthlyStats._count,
  };
}


export default async function PaymentsPage() {
  const authResult = await getAuthWithShop();

  if (!authResult.isAuthenticated) {
    redirect("/login");
  }

  if (!authResult.userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);
  const { payments, monthlyTotal, monthlyPTCount, monthlyCount } = await getPaymentStats(shopFilter);

  return (
    <div className="space-y-4">
      <PageHeader
        title="결제 관리"
        description="PT 결제 내역을 관리합니다."
        action={{
          label: "결제 등록",
          href: "/payments/new",
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  ₩{monthlyTotal.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">이번달 매출</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{monthlyPTCount}회</p>
                <p className="text-xs text-muted-foreground">이번달 PT 판매</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Card>
        <CardContent className="p-0">
          <PaymentList
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
