import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DASHBOARD_PATH } from "@/types";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    const dashboardPath = DASHBOARD_PATH[session.user.role] || "/dashboard";
    redirect(dashboardPath);
  }

  redirect("/login");
}
