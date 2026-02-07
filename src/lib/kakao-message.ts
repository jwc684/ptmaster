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
 * Send a PT schedule notification to a member via KakaoTalk
 */
export async function sendScheduleNotification({
  memberUserId,
  shopName,
  trainerName,
  scheduledAt,
  remainingPT,
  shopId,
}: {
  memberUserId: string;
  shopName: string;
  trainerName: string;
  scheduledAt: Date;
  remainingPT: number;
  shopId?: string;
}): Promise<boolean> {
  let message = "";
  let success = false;
  let errorMsg: string | undefined;

  try {
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

    // Format date
    const date = new Date(scheduledAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    message = `[${shopName}] PT 예약 확인 메세지\n트레이너명: ${trainerName}\n수업일자: ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분\n현재 남은 PT: ${remainingPT}회`;

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
