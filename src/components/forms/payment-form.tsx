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

const paymentFormSchema = z.object({
  memberProfileId: z.string().min(1, "회원을 선택해주세요."),
  amount: z.string().min(1, "결제 금액을 입력해주세요."),
  ptCount: z.string().min(1, "PT 횟수를 입력해주세요."),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface Member {
  id: string;
  user: { name: string };
  remainingPT: number;
}

interface PaymentFormProps {
  members: Member[];
}

export function PaymentForm({ members }: PaymentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      memberProfileId: "",
      amount: "",
      ptCount: "10",
      description: "",
    },
  });

  // 회당 비용 계산
  const watchAmount = form.watch("amount");
  const watchPtCount = form.watch("ptCount");
  const costPerSession =
    watchAmount && watchPtCount && parseInt(watchPtCount) > 0
      ? Math.round(parseInt(watchAmount) / parseInt(watchPtCount))
      : null;

  async function onSubmit(data: PaymentFormData) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: data.memberProfileId,
          amount: parseInt(data.amount),
          ptCount: parseInt(data.ptCount),
          description: data.description || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "오류가 발생했습니다.");
        return;
      }

      toast.success(result.message);
      router.push("/payments");
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
            <CardTitle className="text-lg">결제 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="memberProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>회원 선택 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="회원을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.user.name} (잔여 PT: {member.remainingPT}회)
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
              name="ptCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PT 횟수 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10"
                      min={1}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>결제 금액 (원) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="500000"
                      min={0}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 회당 비용 표시 */}
            {costPerSession !== null && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">회당 비용</span>
                  <span className="text-lg font-semibold">
                    {costPerSession.toLocaleString()}원
                  </span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="결제 관련 메모 (선택사항)"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
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
            {isLoading ? "처리 중..." : "결제 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
