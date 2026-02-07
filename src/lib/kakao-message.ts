import { prisma } from "@/lib/prisma";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_MEMO_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send";

/**
 * Refresh Kakao access token using refresh token
 */
async function refreshKakaoToken(accountId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.KAKAO_CLIENT_ID!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      console.error("[KakaoMessage] Token refresh failed:", res.status);
      return null;
    }

    const data = await res.json();

    // Update tokens in DB
    await prisma.account.update({
      where: { id: accountId },
      data: {
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        ...(data.refresh_token && { refresh_token: data.refresh_token }),
      },
    });

    return data.access_token;
  } catch (error) {
    console.error("[KakaoMessage] Token refresh error:", error);
    return null;
  }
}

/**
 * Get a valid Kakao access token for a user
 */
async function getKakaoAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "kakao" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });

  if (!account || !account.access_token) return null;

  // Check if token is expired (with 5 min buffer)
  const isExpired = account.expires_at && account.expires_at < Math.floor(Date.now() / 1000) + 300;

  if (isExpired && account.refresh_token) {
    return refreshKakaoToken(account.id, account.refresh_token);
  }

  return account.access_token;
}

/**
 * Send a KakaoTalk message to a user (나에게 보내기)
 */
async function sendKakaoMemo(accessToken: string, text: string, url?: string): Promise<boolean> {
  try {
    const templateObject = {
      object_type: "text",
      text,
      link: {
        web_url: url || process.env.NEXT_PUBLIC_APP_URL || "",
        mobile_web_url: url || process.env.NEXT_PUBLIC_APP_URL || "",
      },
    };

    const res = await fetch(KAKAO_MEMO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(templateObject),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("[KakaoMessage] Send failed:", res.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[KakaoMessage] Send error:", error);
    return false;
  }
}

/**
 * Format date as "M월 D일(요일) 오전/오후 H시 MM분"
 */
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatKoreanDateTime(d: Date, includeDay = false): string {
  // KST (UTC+9) 기준으로 변환
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const hours = kst.getUTCHours();
  const minutes = kst.getUTCMinutes();
  const ampm = hours < 12 ? "오전" : "오후";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMin = String(minutes).padStart(2, "0");
  const dayStr = includeDay ? `(${DAY_NAMES[kst.getUTCDay()]})` : "";
  return `${month}월 ${day}일${dayStr} ${ampm} ${displayHour}시 ${displayMin}분`;
}

/**
 * Check if trainer has a specific notification type enabled
 */
async function isTrainerNotifyEnabled(
  trainerId: string | undefined,
  field: "notifySchedule" | "notifyAttendance" | "notifyCancellation" | "notifyScheduleChange" | "notifyReminder"
): Promise<boolean> {
  if (!trainerId) return true; // backward compat: no trainerId = send
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: { [field]: true },
  });
  return (trainer as Record<string, boolean> | null)?.[field] ?? true;
}

/**
 * Send a PT schedule notification to a member via KakaoTalk
 */
export async function sendScheduleNotification({
  memberUserId,
  shopName,
  trainerName,
  scheduledAt,
  remainingPT,
  shopId,
  trainerId,
}: {
  memberUserId: string;
  shopName: string;
  trainerName: string;
  scheduledAt: Date;
  remainingPT: number;
  shopId?: string;
  trainerId?: string;
}): Promise<boolean> {
  let message = "";
  let success = false;
  let errorMsg: string | undefined;

  try {
    // Check trainer notification setting
    if (!(await isTrainerNotifyEnabled(trainerId, "notifySchedule"))) {
      console.log("[KakaoMessage] Trainer has schedule notifications disabled");
      return false;
    }

    // Check if member has kakao notification enabled
    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: memberUserId },
      select: { kakaoNotification: true, user: { select: { name: true } } },
    });

    if (!memberProfile?.kakaoNotification) {
      console.log("[KakaoMessage] Member has notifications disabled");
      return false;
    }

    // Get access token
    const accessToken = await getKakaoAccessToken(memberUserId);
    if (!accessToken) {
      errorMsg = "No valid access token";
      console.error("[KakaoMessage] No valid access token for user:", memberUserId);

      // Log the failure
      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: memberProfile.user.name,
          receiverUserId: memberUserId,
          message: "(메세지 생성 전 토큰 오류)",
          success: false,
          error: errorMsg,
          shopId,
        },
      });

      return false;
    }

    const dateStr = formatKoreanDateTime(new Date(scheduledAt), true);

    message = `[${shopName}] 🔔 PT 수업이 예약되었습니다!\n\n일시: ${dateStr}\n장소: ${shopName}\n남은 횟수: ${remainingPT}회\n\n※ 원활한 수업을 위해 5분 전 도착 부탁드립니다.\n※ 변경사항은 앱에서 확인해 주세요: ptmaster.onrender.com`;

    success = await sendKakaoMemo(accessToken, message);
    if (!success) {
      errorMsg = "Failed to send KakaoTalk message";
    }

    // Log the result
    await prisma.notificationLog.create({
      data: {
        type: "KAKAO",
        senderName: trainerName,
        receiverName: memberProfile.user.name,
        receiverUserId: memberUserId,
        message,
        success,
        error: errorMsg,
        shopId,
      },
    });

    return success;
  } catch (error) {
    console.error("[KakaoMessage] Notification error:", error);

    // Try to log the error
    try {
      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: "(unknown)",
          receiverUserId: memberUserId,
          message: message || "(메세지 생성 전 오류)",
          success: false,
          error: error instanceof Error ? error.message : String(error),
          shopId,
        },
      });
    } catch {
      console.error("[KakaoMessage] Failed to log notification error");
    }

    return false;
  }
}

/**
 * Send a PT attendance check notification to a member via KakaoTalk
 */
export async function sendAttendanceNotification({
  memberUserId,
  shopName,
  trainerName,
  scheduledAt,
  remainingPT,
  shopId,
  trainerId,
}: {
  memberUserId: string;
  shopName: string;
  trainerName: string;
  scheduledAt: Date;
  remainingPT: number;
  shopId?: string;
  trainerId?: string;
}): Promise<boolean> {
  let message = "";
  let success = false;
  let errorMsg: string | undefined;

  try {
    if (!(await isTrainerNotifyEnabled(trainerId, "notifyAttendance"))) {
      console.log("[KakaoMessage] Trainer has attendance notifications disabled");
      return false;
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: memberUserId },
      select: { kakaoNotification: true, user: { select: { name: true } } },
    });

    if (!memberProfile?.kakaoNotification) {
      console.log("[KakaoMessage] Member has notifications disabled");
      return false;
    }

    const accessToken = await getKakaoAccessToken(memberUserId);
    if (!accessToken) {
      errorMsg = "No valid access token";
      console.error("[KakaoMessage] No valid access token for user:", memberUserId);

      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: memberProfile.user.name,
          receiverUserId: memberUserId,
          message: "(메세지 생성 전 토큰 오류)",
          success: false,
          error: errorMsg,
          shopId,
        },
      });

      return false;
    }

    const dateStr = formatKoreanDateTime(new Date(scheduledAt), true);

    message = `[${shopName}] ✅ PT 출석 체크 완료\n\n트레이너: ${trainerName} 코치\n수업일시: ${dateStr}\n남은 횟수: ${remainingPT}회\n\n※ 변경사항은 앱에서 확인해 주세요: ptmaster.onrender.com`;

    success = await sendKakaoMemo(accessToken, message);
    if (!success) {
      errorMsg = "Failed to send KakaoTalk message";
    }

    await prisma.notificationLog.create({
      data: {
        type: "KAKAO",
        senderName: trainerName,
        receiverName: memberProfile.user.name,
        receiverUserId: memberUserId,
        message,
        success,
        error: errorMsg,
        shopId,
      },
    });

    return success;
  } catch (error) {
    console.error("[KakaoMessage] Attendance notification error:", error);

    try {
      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: "(unknown)",
          receiverUserId: memberUserId,
          message: message || "(메세지 생성 전 오류)",
          success: false,
          error: error instanceof Error ? error.message : String(error),
          shopId,
        },
      });
    } catch {
      console.error("[KakaoMessage] Failed to log notification error");
    }

    return false;
  }
}

/**
 * Send a PT cancellation notification to a member via KakaoTalk
 */
export async function sendCancellationNotification({
  memberUserId,
  shopName,
  trainerName,
  scheduledAt,
  remainingPT,
  shopId,
  trainerId,
}: {
  memberUserId: string;
  shopName: string;
  trainerName: string;
  scheduledAt: Date;
  remainingPT: number;
  shopId?: string;
  trainerId?: string;
}): Promise<boolean> {
  let message = "";
  let success = false;
  let errorMsg: string | undefined;

  try {
    if (!(await isTrainerNotifyEnabled(trainerId, "notifyCancellation"))) {
      console.log("[KakaoMessage] Trainer has cancellation notifications disabled");
      return false;
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: memberUserId },
      select: { kakaoNotification: true, user: { select: { name: true } } },
    });

    if (!memberProfile?.kakaoNotification) {
      console.log("[KakaoMessage] Member has notifications disabled");
      return false;
    }

    const accessToken = await getKakaoAccessToken(memberUserId);
    if (!accessToken) {
      errorMsg = "No valid access token";
      console.error("[KakaoMessage] No valid access token for user:", memberUserId);

      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: memberProfile.user.name,
          receiverUserId: memberUserId,
          message: "(메세지 생성 전 토큰 오류)",
          success: false,
          error: errorMsg,
          shopId,
        },
      });

      return false;
    }

    const dateStr = formatKoreanDateTime(new Date(scheduledAt));

    message = `[${shopName}] ❌ PT 수업 취소 안내\n\n트레이너: ${trainerName} 코치\n취소된 수업: ${dateStr}\n현재 남은 PT: ${remainingPT}회 (취소분이 복구되었습니다)\n\n다시 예약하기: ptmaster.onrender.com`;

    success = await sendKakaoMemo(accessToken, message);
    if (!success) {
      errorMsg = "Failed to send KakaoTalk message";
    }

    await prisma.notificationLog.create({
      data: {
        type: "KAKAO",
        senderName: trainerName,
        receiverName: memberProfile.user.name,
        receiverUserId: memberUserId,
        message,
        success,
        error: errorMsg,
        shopId,
      },
    });

    return success;
  } catch (error) {
    console.error("[KakaoMessage] Cancellation notification error:", error);

    try {
      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: "(unknown)",
          receiverUserId: memberUserId,
          message: message || "(메세지 생성 전 오류)",
          success: false,
          error: error instanceof Error ? error.message : String(error),
          shopId,
        },
      });
    } catch {
      console.error("[KakaoMessage] Failed to log notification error");
    }

    return false;
  }
}

/**
 * Send a PT schedule time change notification to a member via KakaoTalk
 */
export async function sendScheduleChangeNotification({
  memberUserId,
  shopName,
  trainerName,
  previousScheduledAt,
  newScheduledAt,
  remainingPT,
  shopId,
  trainerId,
}: {
  memberUserId: string;
  shopName: string;
  trainerName: string;
  previousScheduledAt: Date;
  newScheduledAt: Date;
  remainingPT: number;
  shopId?: string;
  trainerId?: string;
}): Promise<boolean> {
  let message = "";
  let success = false;
  let errorMsg: string | undefined;

  try {
    if (!(await isTrainerNotifyEnabled(trainerId, "notifyScheduleChange"))) {
      console.log("[KakaoMessage] Trainer has schedule change notifications disabled");
      return false;
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: memberUserId },
      select: { kakaoNotification: true, user: { select: { name: true } } },
    });

    if (!memberProfile?.kakaoNotification) {
      return false;
    }

    const accessToken = await getKakaoAccessToken(memberUserId);
    if (!accessToken) {
      errorMsg = "No valid access token";

      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: memberProfile.user.name,
          receiverUserId: memberUserId,
          message: "(메세지 생성 전 토큰 오류)",
          success: false,
          error: errorMsg,
          shopId,
        },
      });

      return false;
    }

    const prevDateStr = formatKoreanDateTime(new Date(previousScheduledAt), true);
    const newDateStr = formatKoreanDateTime(new Date(newScheduledAt), true);

    message = `[${shopName}] 🔄 PT 수업 시간이 변경되었습니다\n\n트레이너: ${trainerName} 코치\n\n기존 시간: ${prevDateStr}\n\n변경 시간: ${newDateStr}\n잔여 횟수: ${remainingPT}회\n\n변경된 시간을 꼭 확인해 주세요!\n앱에서 확인: ptmaster.onrender.com`;

    success = await sendKakaoMemo(accessToken, message);
    if (!success) {
      errorMsg = "Failed to send KakaoTalk message";
    }

    await prisma.notificationLog.create({
      data: {
        type: "KAKAO",
        senderName: trainerName,
        receiverName: memberProfile.user.name,
        receiverUserId: memberUserId,
        message,
        success,
        error: errorMsg,
        shopId,
      },
    });

    return success;
  } catch (error) {
    console.error("[KakaoMessage] Schedule change notification error:", error);

    try {
      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: "(unknown)",
          receiverUserId: memberUserId,
          message: message || "(메세지 생성 전 오류)",
          success: false,
          error: error instanceof Error ? error.message : String(error),
          shopId,
        },
      });
    } catch {
      console.error("[KakaoMessage] Failed to log notification error");
    }

    return false;
  }
}

/**
 * Send a PT schedule reminder notification to a member via KakaoTalk
 * (수업 하루 전 리마인더)
 */
export async function sendReminderNotification({
  memberUserId,
  shopName,
  trainerName,
  scheduledAt,
  remainingPT,
  shopId,
  trainerId,
}: {
  memberUserId: string;
  shopName: string;
  trainerName: string;
  scheduledAt: Date;
  remainingPT: number;
  shopId?: string;
  trainerId?: string;
}): Promise<boolean> {
  let message = "";
  let success = false;
  let errorMsg: string | undefined;

  try {
    if (!(await isTrainerNotifyEnabled(trainerId, "notifyReminder"))) {
      console.log("[KakaoMessage] Trainer has reminder notifications disabled");
      return false;
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: memberUserId },
      select: { kakaoNotification: true, user: { select: { name: true } } },
    });

    if (!memberProfile?.kakaoNotification) {
      return false;
    }

    const accessToken = await getKakaoAccessToken(memberUserId);
    if (!accessToken) {
      errorMsg = "No valid access token";

      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: memberProfile.user.name,
          receiverUserId: memberUserId,
          message: "(메세지 생성 전 토큰 오류)",
          success: false,
          error: errorMsg,
          shopId,
        },
      });

      return false;
    }

    const dateStr = formatKoreanDateTime(new Date(scheduledAt), true);

    message = `[${shopName}] 🔔 내일은 PT 수업이 있는 날입니다!\n\n일시: ${dateStr}\n장소: ${shopName}\n남은 횟수: ${remainingPT}회\n\n※ 원활한 수업을 위해 5분 전 도착 부탁드립니다.\n※ 변경사항은 앱에서 확인해 주세요: ptmaster.onrender.com`;

    success = await sendKakaoMemo(accessToken, message);
    if (!success) {
      errorMsg = "Failed to send KakaoTalk message";
    }

    await prisma.notificationLog.create({
      data: {
        type: "KAKAO",
        senderName: trainerName,
        receiverName: memberProfile.user.name,
        receiverUserId: memberUserId,
        message,
        success,
        error: errorMsg,
        shopId,
      },
    });

    return success;
  } catch (error) {
    console.error("[KakaoMessage] Reminder notification error:", error);

    try {
      await prisma.notificationLog.create({
        data: {
          type: "KAKAO",
          senderName: trainerName,
          receiverName: "(unknown)",
          receiverUserId: memberUserId,
          message: message || "(메세지 생성 전 오류)",
          success: false,
          error: error instanceof Error ? error.message : String(error),
          shopId,
        },
      });
    } catch {
      console.error("[KakaoMessage] Failed to log notification error");
    }

    return false;
  }
}
