import { z } from "zod";

// Simplified member schema for PT shop
export const memberSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력해주세요."),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "비밀번호는 영문과 숫자를 포함해야 합니다."
    )
    .optional(),
  birthDate: z.string().optional(), // 생년월일
  gender: z.enum(["MALE", "FEMALE"]).optional(), // 성별
  trainerId: z.string().optional(), // 담당 트레이너
  remainingPT: z.number().min(0).default(0), // 잔여 PT 횟수
  notes: z.string().optional(), // 메모
});

export const memberUpdateSchema = memberSchema.omit({ password: true }).extend({
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "비밀번호는 영문과 숫자를 포함해야 합니다."
    )
    .optional()
    .or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
});

// PT 결제 스키마
export const paymentSchema = z.object({
  memberProfileId: z.string().min(1, "회원을 선택해주세요."),
  amount: z.number().min(1, "결제 금액을 입력해주세요."),
  ptCount: z.number().min(1, "PT 횟수를 입력해주세요."),
  description: z.string().optional(),
});

// 트레이너 할당용 스키마
export const assignTrainerSchema = z.object({
  trainerId: z.string().nullable(),
});

export type MemberInput = z.infer<typeof memberSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type AssignTrainerInput = z.infer<typeof assignTrainerSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
