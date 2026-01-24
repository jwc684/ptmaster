import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RegistrationList } from "@/components/registration/registration-list";

async function getPayments() {
  return prisma.payment.findMany({
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
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const payments = await getPayments();

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
      <RegistrationList
        payments={payments.map((p) => ({
          ...p,
          paidAt: p.paidAt.toISOString(),
        }))}
      />
    </div>
  );
}
