"use client";

import { Building2, Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useShopContext } from "@/hooks/use-shop-context";
import { Badge } from "@/components/ui/badge";

export function ShopSelector() {
  const [open, setOpen] = useState(false);
  const { currentShop, shops, isSuperAdmin, selectShop, clearShop, isLoading } =
    useShopContext();

  // Only show for Super Admin
  if (!isSuperAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="w-[200px]">
        <Building2 className="mr-2 h-4 w-4" />
        로딩 중...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          size="sm"
        >
          <div className="flex items-center truncate">
            {currentShop ? (
              <>
                <Building2 className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{currentShop.name}</span>
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4 shrink-0" />
                <span>전체 샵 보기</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="PT샵 검색..." />
          <CommandList>
            <CommandEmpty>PT샵을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup heading="전체">
              <CommandItem
                onSelect={() => {
                  clearShop();
                  setOpen(false);
                }}
              >
                <Globe className="mr-2 h-4 w-4" />
                전체 샵 보기
                {!currentShop && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="PT샵 목록">
              {shops.map((shop) => (
                <CommandItem
                  key={shop.id}
                  onSelect={() => {
                    selectShop(shop.id);
                    setOpen(false);
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="truncate">{shop.name}</span>
                  {!shop.isActive && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      비활성
                    </Badge>
                  )}
                  {currentShop?.id === shop.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
