import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ChevronRight } from "lucide-react";

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
      <div className="space-y-3">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              등록된 내역이 없습니다.
            </CardContent>
          </Card>
        ) : (
          payments.map((payment) => (
            <Link
              key={payment.id}
              href={`/members/${payment.memberProfile.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {payment.memberProfile.user.name}
                          </p>
                          <Badge variant="default">
                            PT {payment.ptCount}회
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ₩{payment.amount.toLocaleString()}
                          {payment.memberProfile.trainer && (
                            <span> · {payment.memberProfile.trainer.user.name}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paidAt).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {payment.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {payment.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
