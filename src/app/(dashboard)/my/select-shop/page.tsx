import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SelectShopForm } from "./select-shop-form";

export default async function SelectShopPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Already has a shop
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { shopId: true },
  });

  if (user?.shopId) {
    redirect("/my");
  }

  const shops = await prisma.pTShop.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      address: true,
    },
    orderBy: { name: "asc" },
  });

  return <SelectShopForm shops={shops} defaultName={session.user.name || ""} />;
}
