import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentForm } from "@/components/forms/payment-form";

async function getMembers() {
  return prisma.memberProfile.findMany({
    select: {
      id: true,
      remainingPT: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export default async function NewPaymentPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const members = await getMembers();

  return (
    <div className="space-y-4">
      <PageHeader
        title="결제 등록"
        description="PT 결제를 등록합니다."
      />
      <PaymentForm members={members} />
    </div>
  );
}
