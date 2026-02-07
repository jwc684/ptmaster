import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  notifySchedule: z.boolean().optional(),
  notifyAttendance: z.boolean().optional(),
  notifyCancellation: z.boolean().optional(),
  notifyScheduleChange: z.boolean().optional(),
  notifyReminder: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!trainerProfile) {
      return NextResponse.json(
        { error: "트레이너 프로필을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updated = await prisma.trainerProfile.update({
      where: { id: trainerProfile.id },
      data: parsed.data,
      select: {
        notifySchedule: true,
        notifyAttendance: true,
        notifyCancellation: true,
        notifyScheduleChange: true,
        notifyReminder: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating trainer settings:", error);
    return NextResponse.json(
      { error: "설정 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
