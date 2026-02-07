"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "접근이 거부되었습니다. 초대 링크를 통해 가입해주세요.",
  NoInvitation: "초대 링크를 통해 먼저 가입해주세요.",
  InvalidInvitation: "유효하지 않은 초대입니다.",
  InvitationUsed: "이미 사용된 초대 링크입니다.",
  InvitationExpired: "만료된 초대 링크입니다.",
  SignupError: "가입 중 오류가 발생했습니다. 다시 시도해주세요.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const [error] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] || null : null
  );
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);

  async function handleKakaoSignIn() {
    setIsKakaoLoading(true);
    await signIn("kakao", { callbackUrl });
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">로그인</CardTitle>
        <CardDescription className="text-center">
          카카오 계정으로 로그인하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-none">
            {error}
          </div>
        )}

        <Button
          onClick={handleKakaoSignIn}
          disabled={isKakaoLoading}
          className="w-full h-12 text-base font-medium"
          style={{
            backgroundColor: "#FEE500",
            color: "#000000",
          }}
        >
          {isKakaoLoading ? (
            "로그인 중..."
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
              카카오로 로그인
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
