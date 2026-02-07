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

const registrationSchema = z.object({
  memberProfileId: z.string().min(1, "회원을 선택해주세요."),
  trainerId: z.string().optional(),
  ptCount: z.number().min(1, "PT 횟수는 1회 이상이어야 합니다."),
  amount: z.number().min(0, "금액을 입력해주세요."),
  notes: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface Member {
  id: string;
  remainingPT: number;
  user: { name: string; phone: string | null };
}

interface Trainer {
  id: string;
  user: { name: string };
}

interface RegistrationFormProps {
  members: Member[];
  trainers: Trainer[];
}

export function RegistrationForm({ members, trainers }: RegistrationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      memberProfileId: "",
      trainerId: "",
      ptCount: 10,
      amount: 0,
      notes: "",
    },
  });

  const selectedMemberId = form.watch("memberProfileId");
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  async function onSubmit(data: RegistrationFormData) {
    setIsLoading(true);

    try {
      // 1. 결제 기록 생성
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: data.memberProfileId,
          amount: data.amount,
          ptCount: data.ptCount,
          description: data.notes,
        }),
      });

      if (!paymentRes.ok) {
        const error = await paymentRes.json();
        toast.error(error.error || "결제 등록에 실패했습니다.");
        return;
      }

      // 2. 트레이너 배정 (선택한 경우)
      if (data.trainerId && data.trainerId !== "none") {
        await fetch(`/api/members/${data.memberProfileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainerId: data.trainerId }),
        });
      }

      toast.success("PT 등록이 완료되었습니다.");
      router.push("/registration");
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
            <CardTitle className="text-lg">회원 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="memberProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>회원 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="회원을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.user.name}
                          {member.user.phone && ` (${member.user.phone})`}
                          {" - "}잔여 PT: {member.remainingPT}회
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMember && (
              <div className="p-3 bg-muted rounded-none text-sm">
                <p><strong>{selectedMember.user.name}</strong></p>
                <p className="text-muted-foreground">
                  현재 잔여 PT: {selectedMember.remainingPT}회
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                    onValueChange={field.onChange}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ptCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PT 횟수 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10"
                        value={field.value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === "" || isNaN(Number(val))) {
                            field.onChange(1);
                          }
                        }}
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
                    <FormLabel>금액 (원) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={10000}
                        placeholder="500000"
                        value={field.value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === "" || isNaN(Number(val))) {
                            field.onChange(0);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="메모를 입력하세요"
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
            {isLoading ? "등록 중..." : "PT 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
