"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Client component that logs page views
 * Place this in the layout to automatically log page views
 */
export function PageViewLogger() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const lastLoggedPath = useRef<string | null>(null);

  useEffect(() => {
    // Only log if authenticated and path changed
    if (
      status === "authenticated" &&
      session?.user &&
      pathname &&
      pathname !== lastLoggedPath.current
    ) {
      lastLoggedPath.current = pathname;

      // Don't log certain paths
      const ignoredPaths = ["/api", "/_next", "/favicon"];
      if (ignoredPaths.some((p) => pathname.startsWith(p))) {
        return;
      }

      // Log page view via API
      fetch("/api/log-page-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: pathname,
        }),
      }).catch((error) => {
        console.error("Failed to log page view:", error);
      });
    }
  }, [pathname, session, status]);

  return null;
}
