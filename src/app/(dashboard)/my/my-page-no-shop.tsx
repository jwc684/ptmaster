"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Building2, MapPin, LogOut } from "lucide-react";

interface Shop {
  id: string;
  name: string;
  address: string | null;
}

interface MyPageNoShopProps {
  shops: Shop[];
  userName: string;
}

export function MyPageNoShop({ shops, userName }: MyPageNoShopProps) {
  const [open, setOpen] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [name, setName] = useState(userName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedShopId || !name.trim()) return;

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/signup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: selectedShopId, name: name.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "오류가 발생했습니다.");
      setIsLoading(false);
      return;
    }

    window.location.href = "/my";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{userName || "회원"}님, 환영합니다!</h1>
        <p className="text-sm text-muted-foreground">마이페이지</p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Building2 className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <p className="font-medium">등록된 센터가 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">
            센터를 등록하면 일정 관리, 출석 확인 등 다양한 서비스를 이용할 수 있습니다.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Building2 className="h-4 w-4 mr-2" />
          센터 선택하기
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>센터 선택</DialogTitle>
            <DialogDescription>이용하실 PT 센터를 선택해주세요</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10">
              {error}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto border space-y-1 p-1">
            {shops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 센터가 없습니다.
              </p>
            ) : (
              shops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => setSelectedShopId(shop.id)}
                  className={`w-full text-left p-3 border transition-colors ${
                    selectedShopId === shop.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium text-sm">{shop.name}</p>
                  {shop.address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {shop.address}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-name">이름</Label>
            <Input
              id="dialog-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedShopId || !name.trim()}
            className="w-full"
          >
            {isLoading ? "처리 중..." : "센터 등록"}
          </Button>

          <div className="flex items-center justify-between">
            <Button
              variant="link"
              className="px-0 text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              나중에 하기
            </Button>
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
