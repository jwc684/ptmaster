import { z } from "zod";

// Simplified payment schema for PT shop
export const paymentSchema = z.object({
  memberProfileId: z.string().min(1, "회원을 선택해주세요."),
  amount: z.number().min(0, "결제 금액을 입력해주세요."),
  ptCount: z.number().min(1, "PT 횟수를 입력해주세요."),
  description: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
