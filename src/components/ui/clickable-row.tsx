"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";

export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <TableRow
      className={`cursor-pointer ${className || ""}`}
      onClick={() => router.push(href)}
    >
      {children}
    </TableRow>
  );
}
