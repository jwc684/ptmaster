"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

interface Shop {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface ShopContextValue {
  // Current shop info
  currentShop: Shop | null;
  shops: Shop[];
  isLoading: boolean;
  isSuperAdmin: boolean;

  // Actions
  selectShop: (shopId: string) => void;
  clearShop: () => void;
  refreshShops: () => Promise<void>;

  // Utility for API calls
  getShopHeader: () => Record<string, string>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

const STORAGE_KEY = "selected-shop-id";
const COOKIE_KEY = "selected-shop-id";

function setShopCookie(shopId: string | null) {
  if (shopId) {
    document.cookie = `${COOKIE_KEY}=${shopId}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
  }
}

interface ShopProviderProps {
  children: ReactNode;
}

export function ShopProvider({ children }: ShopProviderProps) {
  const { data: session, status } = useSession();
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperAdmin = (session?.user?.roles ?? []).includes("SUPER_ADMIN");

  // Fetch shops (only for Super Admin)
  const refreshShops = useCallback(async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/super-admin/shops");
      if (response.ok) {
        const data = await response.json();
        setShops(data);
      }
    } catch (error) {
      console.error("Failed to fetch shops:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  // Initialize on mount and when session changes
  useEffect(() => {
    if (status === "loading") return;

    if (isSuperAdmin) {
      // Load saved shop from localStorage for Super Admin
      const savedShopId = localStorage.getItem(STORAGE_KEY);
      refreshShops().then(() => {
        if (savedShopId) {
          // Find the saved shop in the loaded shops
          setShops((currentShops) => {
            const savedShop = currentShops.find((s) => s.id === savedShopId);
            if (savedShop) {
              setCurrentShop(savedShop);
            }
            return currentShops;
          });
        }
      });
    } else if (session?.user?.shopId) {
      // Regular users - fetch their assigned shop details
      fetch(`/api/shops/${session.user.shopId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((shop) => {
          if (shop) {
            setCurrentShop({
              id: shop.id,
              name: shop.name,
              slug: shop.slug,
              isActive: shop.isActive,
            });
          } else {
            setCurrentShop({
              id: session.user.shopId!,
              name: "",
              slug: "",
              isActive: true,
            });
          }
        })
        .catch(() => {
          setCurrentShop({
            id: session.user.shopId!,
            name: "",
            slug: "",
            isActive: true,
          });
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [status, session, isSuperAdmin, refreshShops]);

  // Update currentShop when shops are loaded
  useEffect(() => {
    if (isSuperAdmin && shops.length > 0) {
      const savedShopId = localStorage.getItem(STORAGE_KEY);
      if (savedShopId) {
        const savedShop = shops.find((s) => s.id === savedShopId);
        if (savedShop) {
          setCurrentShop(savedShop);
          // Sync cookie with localStorage
          setShopCookie(savedShopId);
        }
      }
    }
  }, [shops, isSuperAdmin]);

  const selectShop = useCallback(
    (shopId: string) => {
      if (!isSuperAdmin) return;

      const shop = shops.find((s) => s.id === shopId);
      if (shop) {
        setCurrentShop(shop);
        localStorage.setItem(STORAGE_KEY, shopId);
        setShopCookie(shopId);
      }
    },
    [shops, isSuperAdmin]
  );

  const clearShop = useCallback(() => {
    if (!isSuperAdmin) return;

    setCurrentShop(null);
    localStorage.removeItem(STORAGE_KEY);
    setShopCookie(null);
  }, [isSuperAdmin]);

  const getShopHeader = useCallback((): Record<string, string> => {
    if (isSuperAdmin && currentShop) {
      return { "x-shop-id": currentShop.id };
    }
    return {};
  }, [isSuperAdmin, currentShop]);

  return (
    <ShopContext.Provider
      value={{
        currentShop,
        shops,
        isLoading,
        isSuperAdmin,
        selectShop,
        clearShop,
        refreshShops,
        getShopHeader,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShopContext() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShopContext must be used within a ShopProvider");
  }
  return context;
}

// Hook for making API calls with shop context
export function useShopFetch() {
  const { getShopHeader, currentShop, isSuperAdmin } = useShopContext();

  const fetchWithShop = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = {
        ...options.headers,
        ...getShopHeader(),
      };

      return fetch(url, { ...options, headers });
    },
    [getShopHeader]
  );

  return {
    fetchWithShop,
    currentShop,
    isSuperAdmin,
    needsShopContext: isSuperAdmin && !currentShop,
  };
}
