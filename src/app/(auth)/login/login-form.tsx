"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const ERROR_MESSAGES: Record<string, string> = {
  NoInvitation: "초대 링크를 통해 먼저 가입해주세요.",
  InvalidInvitation: "유효하지 않은 초대입니다.",
  InvitationUsed: "이미 사용된 초대 링크입니다.",
  InvitationExpired: "만료된 초대 링크입니다.",
  SignupError: "가입 중 오류가 발생했습니다. 다시 시도해주세요.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] || null : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "Configuration") {
          setError("서버 설정 오류입니다. 관리자에게 문의하세요. (서버 로그 확인 필요)");
          console.error("Auth Configuration error - check server logs");
        } else {
          setError(result.error);
        }
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleKakaoSignIn() {
    setIsKakaoLoading(true);
    setError(null);
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
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
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

        {/* SUPER_ADMIN 이메일/비밀번호 로그인 (토글) */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <button
              type="button"
              className="bg-card px-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowCredentials(!showCredentials)}
            >
              {showCredentials ? "닫기" : "관리자 로그인"}
            </button>
          </div>
        </div>

        {showCredentials && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "로그인 중..." : "이메일로 로그인"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
