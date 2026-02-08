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
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <ShopProvider>
        <PageViewLogger />
        {children}
        <Toaster position="top-right" />
      </ShopProvider>
    </SessionProvider>
  );
}
