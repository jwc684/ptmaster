"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PtMasterLogo } from "@/components/ui/pt-master-logo";
import { MapPin } from "lucide-react";

interface Shop {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
}

interface SignupClientProps {
  shops: Shop[];
}

export function SignupClient({ shops }: SignupClientProps) {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleKakaoSignIn() {
    if (!selectedShopId || !name.trim()) return;

    setIsLoading(true);

    await fetch("/api/signup/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: selectedShopId, name: name.trim() }),
    });

    await signIn("kakao", { callbackUrl: "/my" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <PtMasterLogo size="md" />
          </div>
          <CardTitle className="text-2xl">회원 가입</CardTitle>
          <CardDescription className="text-base">
            PT 센터를 선택하고 가입하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>센터 선택</Label>
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
            onClick={handleKakaoSignIn}
            disabled={isLoading || !selectedShopId || !name.trim()}
            className="w-full h-12 text-base font-medium"
            style={{
              backgroundColor: "#FEE500",
              color: "#000000",
            }}
          >
            {isLoading ? (
              "처리 중..."
            ) : (
              <span className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10 2C5.029 2 1 5.129 1 8.996c0 2.489 1.658 4.677 4.158 5.92-.13.468-.838 3.013-.867 3.199 0 0-.017.144.076.199.093.055.202.025.202.025.267-.037 3.091-2.019 3.578-2.363.274.038.555.063.843.063 4.971 0 9-3.13 9-6.996S14.971 2 10 2Z"
                    fill="#000000"
                  />
                </svg>
                카카오로 가입하기
              </span>
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
