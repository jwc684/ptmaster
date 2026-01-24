import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
    email: z.string().email("올바른 이메일 주소를 입력해주세요."),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        "비밀번호는 영문과 숫자를 포함해야 합니다."
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

// API용 회원가입 스키마 (confirmPassword 검증 없이)
export const registerApiSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력해주세요."),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "비밀번호는 영문과 숫자를 포함해야 합니다."
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterApiInput = z.infer<typeof registerApiSchema>;
