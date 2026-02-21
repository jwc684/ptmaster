"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface Shop {
  id: string;
  name: string;
  address: string | null;
}

interface SelectShopFormProps {
  shops: Shop[];
  defaultName: string;
}

export function SelectShopForm({ shops, defaultName }: SelectShopFormProps) {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
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

    // Full reload to refresh JWT with new shopId
    window.location.href = "/my";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">센터 선택</h1>
        <p className="text-sm text-muted-foreground">이용하실 PT 센터를 선택해주세요</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">센터 목록</CardTitle>
          <CardDescription>원하시는 센터를 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-none">
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
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
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
        </CardContent>
      </Card>
    </div>
  );
}
