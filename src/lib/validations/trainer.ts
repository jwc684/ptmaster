import { z } from "zod";

// Simplified trainer schema for PT shop
export const trainerSchema = z.object({
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
  bio: z.string().optional(), // 간단한 소개
});

export const trainerUpdateSchema = trainerSchema.extend({
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "비밀번호는 영문과 숫자를 포함해야 합니다."
    )
    .optional()
    .or(z.literal("")),
});

export type TrainerInput = z.infer<typeof trainerSchema>;
export type TrainerUpdateInput = z.infer<typeof trainerUpdateSchema>;
