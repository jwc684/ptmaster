"use client";

import { useState, useEffect } from "react";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const impersonateToken = searchParams.get("impersonateToken");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto sign-in with impersonation token (opened from Super Admin in new tab)
  useEffect(() => {
    if (!impersonateToken) return;

    setIsLoading(true);
    (async () => {
      try {
        const result = await signIn("credentials", {
          impersonateToken,
          redirect: false,
        });

        if (result?.error) {
          setError("로그인 토큰이 만료되었거나 유효하지 않습니다.");
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch {
        setError("로그인 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [impersonateToken, callbackUrl, router]);

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
        // Auth.js Configuration 에러 처리
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

  if (impersonateToken) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">로그인 중...</CardTitle>
          <CardDescription className="text-center">
            {error || "계정 전환 중입니다. 잠시만 기다려주세요."}
          </CardDescription>
        </CardHeader>
        {error && (
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/login")}
            >
              로그인 페이지로 돌아가기
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">로그인</CardTitle>
        <CardDescription className="text-center">
          이메일과 비밀번호를 입력하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

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
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
