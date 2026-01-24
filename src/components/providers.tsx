"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ShopProvider } from "@/hooks/use-shop-context";
import { PageViewLogger } from "@/components/logging/page-view-logger";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ShopProvider>
        <PageViewLogger />
        {children}
        <Toaster position="top-right" />
      </ShopProvider>
    </SessionProvider>
  );
}
