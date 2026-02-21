import { z } from "zod";

// 운동 추가
export const createExerciseSchema = z.object({
  name: z.string().min(1, "운동 이름을 입력해주세요.").max(50),
  type: z.enum(["WEIGHT", "CARDIO", "BODYWEIGHT"]),
});

// 세트 추가
export const createSetSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.int().min(1),
  order: z.int().min(0).optional(),
  weight: z.number().min(0).optional(),
  reps: z.int().min(0).optional(),
  durationMinutes: z.int().min(0).optional(),
  isCompleted: z.boolean().optional(),
});

// 세트 bulk 추가
export const createSetsSchema = z.object({
  sets: z.array(createSetSchema).min(1, "최소 1개의 세트를 입력해주세요."),
});

// 세트 완료 토글
export const updateSetSchema = z.object({
  isCompleted: z.boolean(),
});

// 세션 시작
export const createWorkoutSessionSchema = z.object({
  notes: z.string().optional(),
  date: z.string().optional(),
});

// 세션 완료/시작 (PATCH)
export const updateWorkoutSessionSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
  notes: z.string().optional(),
});

// 트레이너/관리자 운동 계획 추가
export const createWorkoutPlanSchema = z.object({
  date: z.string().min(1, "날짜를 선택해주세요."),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.array(z.object({
      weight: z.number().min(0).optional(),
      reps: z.int().min(0).optional(),
      durationMinutes: z.int().min(0).optional(),
    })).min(1),
  })).min(1, "최소 1개의 운동을 선택해주세요."),
  notes: z.string().optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type CreateSetsInput = z.infer<typeof createSetsSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type CreateWorkoutSessionInput = z.infer<typeof createWorkoutSessionSchema>;
export type UpdateWorkoutSessionInput = z.infer<typeof updateWorkoutSessionSchema>;
export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
