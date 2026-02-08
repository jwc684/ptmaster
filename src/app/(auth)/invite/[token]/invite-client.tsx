"use client";

import { useState } from "react";
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

interface InviteClientProps {
  token: string;
  shopName: string;
  roleLabel: string;
  email: string | null;
  name: string | null;
}

export function InviteClient({
  token,
  shopName,
  roleLabel,
  email,
  name: initialName,
}: InviteClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(initialName || "");

  async function handleKakaoSignIn() {
    setIsLoading(true);

    // invite cookies를 서버사이드에서 httpOnly로 설정
    await fetch("/api/invite/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: name.trim() }),
    });

    // 카카오 로그인 시작
    await signIn("kakao", {
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <PtMasterLogo size="md" />
          </div>
          <CardTitle className="text-2xl">초대받으셨습니다!</CardTitle>
          <CardDescription className="text-base">
            <span className="font-semibold text-foreground">{shopName}</span>
            에서{" "}
            <span className="font-semibold text-foreground">{roleLabel}</span>
            (으)로 초대했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <p className="text-sm text-muted-foreground text-center">
              초대 이메일: {email}
            </p>
          )}

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
            disabled={isLoading || !name.trim()}
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

          <p className="text-xs text-muted-foreground text-center">
            카카오 계정으로 간편하게 가입할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
