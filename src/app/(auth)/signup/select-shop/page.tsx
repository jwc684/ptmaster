import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SelectShopClient } from "./select-shop-client";

export default async function SelectShopPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signup");
  }

  // Already completed signup
  if (session.user.shopId) {
    redirect("/my");
  }

  const shops = await prisma.pTShop.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  return <SelectShopClient shops={shops} defaultName={session.user.name || ""} />;
}
