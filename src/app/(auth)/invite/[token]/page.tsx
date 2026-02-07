import { prisma } from "@/lib/prisma";
import { InviteClient } from "./invite-client";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "관리자",
  TRAINER: "트레이너",
  MEMBER: "회원",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      shop: {
        select: { name: true },
      },
    },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-6xl">😔</div>
          <h1 className="text-2xl font-bold">유효하지 않은 초대</h1>
          <p className="text-muted-foreground">
            초대 링크가 올바르지 않습니다. 관리자에게 새로운 링크를 요청해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (invitation.usedAt && !invitation.reusable) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-bold">이미 사용된 초대</h1>
          <p className="text-muted-foreground">
            이 초대 링크는 이미 사용되었습니다. 이미 가입하셨다면 로그인해주세요.
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            로그인하기
          </a>
        </div>
      </div>
    );
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-6xl">⏰</div>
          <h1 className="text-2xl font-bold">만료된 초대</h1>
          <p className="text-muted-foreground">
            이 초대 링크는 만료되었습니다. 관리자에게 새로운 링크를 요청해주세요.
          </p>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[invitation.role] || invitation.role;
  const metadata = invitation.metadata as Record<string, unknown> | null;
  const inviteName = (metadata?.name as string) || null;

  return (
    <InviteClient
      token={token}
      shopName={invitation.shop.name}
      roleLabel={roleLabel}
      email={invitation.email}
      name={inviteName}
    />
  );
}
