import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TrainerForm } from "@/components/forms/trainer-form";

export default async function NewTrainerPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="트레이너 등록"
        description="새로운 트레이너를 등록합니다."
      />
      <TrainerForm />
    </div>
  );
}
