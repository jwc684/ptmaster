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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Form-specific schema to avoid type issues with Zod defaults
const memberFormSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력해주세요."),
  phone: z.string().optional(),
  password: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", ""]).optional(),
  trainerId: z.string().optional(),
  remainingPT: z.number().min(0),
  notes: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberFormSchema>;

interface Trainer {
  id: string;
  user: { name: string };
}

interface MemberFormProps {
  initialData?: {
    id: string;
    user: {
      name: string;
      email: string;
      phone: string | null;
    };
    trainerId: string | null;
    remainingPT: number;
    notes: string | null;
    birthDate: string | null;
    gender: "MALE" | "FEMALE" | null;
  };
  trainers: Trainer[];
}

export function MemberForm({ initialData, trainers }: MemberFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: initialData?.user.name || "",
      email: initialData?.user.email || "",
      phone: initialData?.user.phone || "",
      password: "",
      birthDate: initialData?.birthDate || "",
      gender: initialData?.gender || "",
      trainerId: initialData?.trainerId || "",
      remainingPT: initialData?.remainingPT || 0,
      notes: initialData?.notes || "",
    },
  });

  async function onSubmit(data: MemberFormData) {
    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/members/${initialData.id}`
        : "/api/members";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "오류가 발생했습니다.");
        return;
      }

      toast.success(isEditing ? "회원 정보가 수정되었습니다." : "회원이 등록되었습니다.");
      router.push("/members");
      router.refresh();
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
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
                  <FormLabel>이메일 *</FormLabel>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>생년월일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>성별</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">남성</SelectItem>
                        <SelectItem value="FEMALE">여성</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditing ? "새 비밀번호" : "비밀번호 *"}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  {isEditing && (
                    <FormDescription>변경 시에만 입력하세요</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {isEditing && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">PT 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="trainerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>담당 트레이너</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="트레이너 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">미배정</SelectItem>
                        {trainers.map((trainer) => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remainingPT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>잔여 PT 횟수</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="회원에 대한 메모를 입력하세요"
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
        )}

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
            {isLoading ? "저장 중..." : isEditing ? "수정" : "등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
