"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trainerUpdateSchema } from "@/lib/validations/trainer";

// 신규 등록 시 초대용 스키마 (비밀번호 불필요)
const trainerInviteSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("올바른 이메일 주소를 입력해주세요.").optional()
  ),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

interface TrainerFormProps {
  initialData?: {
    id: string;
    user: {
      name: string;
      email: string;
      phone: string | null;
    };
    bio: string | null;
  };
}

type TrainerFormData = {
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  password?: string;
};

export function TrainerForm({ initialData }: TrainerFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const isEditing = !!initialData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<TrainerFormData>({
    resolver: zodResolver(isEditing ? trainerUpdateSchema : trainerInviteSchema) as any,
    defaultValues: {
      name: initialData?.user.name || "",
      email: initialData?.user.email || "",
      phone: initialData?.user.phone || "",
      bio: initialData?.bio || "",
    },
  });

  async function onSubmit(data: TrainerFormData) {
    setIsLoading(true);

    try {
      if (isEditing) {
        // 수정 모드: 기존 API 사용
        const response = await fetch(`/api/trainers/${initialData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "오류가 발생했습니다.");
          return;
        }

        toast.success("트레이너 정보가 수정되었습니다.");
        router.push("/trainers");
        router.refresh();
      } else {
        // 신규 등록: 초대 링크 생성
        const response = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "TRAINER",
            ...(data.email && { email: data.email }),
            metadata: {
              name: data.name,
              phone: data.phone,
              bio: data.bio,
            },
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "오류가 발생했습니다.");
          return;
        }

        toast.success("초대 링크가 생성되었습니다.");
        setInviteUrl(result.inviteUrl);
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (inviteUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">초대 링크 생성 완료</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            아래 링크를 트레이너에게 전달해주세요. 카카오 계정으로 가입할 수 있습니다.
          </p>
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="text-xs" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("링크가 복사되었습니다.");
              }}
            >
              복사
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            이 링크는 30일간 유효하며 1회만 사용 가능합니다.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push("/trainers")}
              className="flex-1"
            >
              트레이너 목록
            </Button>
            <Button
              onClick={() => {
                setInviteUrl(null);
                form.reset();
              }}
              className="flex-1"
            >
              추가 초대
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="홍길동" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? "이메일 *" : "이메일 (선택)"}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전화번호</FormLabel>
                  <FormControl>
                    <Input placeholder="010-0000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>소개</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="트레이너 소개를 입력하세요"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "처리 중..." : isEditing ? "수정" : "초대 링크 생성"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
