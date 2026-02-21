import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDashboardPath } from "@/lib/role-utils";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    const dashboardPath = getDashboardPath(session.user.roles);
    redirect(dashboardPath);
  }

  redirect("/login");
}
