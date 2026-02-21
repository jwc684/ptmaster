"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PtMasterLogo } from "@/components/ui/pt-master-logo";

export function SignupClient() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleKakaoSignIn() {
    setIsLoading(true);
    await signIn("kakao", { callbackUrl: "/signup/select-shop" });
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
            카카오 계정으로 간편하게 가입하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleKakaoSignIn}
            disabled={isLoading}
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
