import { prisma } from "@/lib/prisma";
import { SignupClient } from "./signup-client";

export default async function SignupPage() {
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

  return <SignupClient shops={shops} />;
}
