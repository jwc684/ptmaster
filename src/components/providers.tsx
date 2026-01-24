"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ShopProvider } from "@/hooks/use-shop-context";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ShopProvider>
        {children}
        <Toaster position="top-right" />
      </ShopProvider>
    </SessionProvider>
  );
}
