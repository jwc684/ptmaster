import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import KakaoProvider from "next-auth/providers/kakao";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { logLogin } from "@/lib/access-log";
import { primaryRole } from "@/lib/role-utils";
import { cookies } from "next/headers";
// Import to enable @auth/core module augmentation
import "@auth/core/jwt";

declare module "next-auth" {
  interface User {
    roles: UserRole[];
    phone?: string | null;
    shopId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: UserRole[];
      phone?: string | null;
      shopId?: string | null;
      image?: string | null;
      isImpersonating?: boolean;
      impersonateShopName?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    roles?: UserRole[];
    phone?: string | null;
    shopId?: string | null;
    userVerifiedAt?: number;
    userDeleted?: boolean;
  }
}

// AUTH_SECRET 확인 (프로덕션에서 필수)
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  console.error("AUTH_SECRET is not set in production environment!");
}

const isDev = process.env.NODE_ENV === "development";
function debugLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60, // 365일 (1년)
    updateAge: 24 * 60 * 60, // 24시간마다 JWT 갱신 (활동 시 세션 연장)
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          debugLog("[Auth] Login attempt for:", credentials?.email);

          if (!credentials?.email || !credentials?.password) {
            debugLog("[Auth] Missing credentials");
            throw new Error("이메일과 비밀번호를 입력해주세요.");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          debugLog("[Auth] User found:", !!user);

          if (!user || !user.password) {
            debugLog("[Auth] User not found or no password");
            throw new Error("등록되지 않은 이메일입니다.");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          debugLog("[Auth] Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            throw new Error("비밀번호가 일치하지 않습니다.");
          }

          debugLog("[Auth] Login successful for:", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            phone: user.phone,
            shopId: user.shopId,
          };
        } catch (error) {
          console.error("[Auth] Login error:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Credentials provider: 기존 로직 유지
      if (account?.provider === "credentials") {
        return true;
      }

      // Kakao OAuth
      if (account?.provider === "kakao") {
        const kakaoProfile = profile as Record<string, unknown> | undefined;
        const kakaoAccount = kakaoProfile?.kakao_account as Record<string, unknown> | undefined;
        const email = user.email || kakaoAccount?.email as string | undefined;

        debugLog("[Auth] Kakao signIn - email:", email, "providerAccountId:", account.providerAccountId);

        // 1. 기존 Account가 있는지 확인 (이미 가입한 사용자)
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "kakao",
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });

        if (existingAccount) {
          // 기존 사용자 → user 객체에 DB 데이터 설정 (jwt 콜백에서 사용)
          const dbUser = existingAccount.user;
          user.id = dbUser.id;
          user.roles = dbUser.roles;
          user.phone = dbUser.phone;
          user.shopId = dbUser.shopId;
          user.email = dbUser.email;
          debugLog("[Auth] Existing Kakao user:", dbUser.email);
          return true;
        }

        // 2. 신규 사용자 → 쿠키에서 invite-token 확인
        try {
          const cookieStore = await cookies();
          const inviteToken = cookieStore.get("invite-token")?.value;
          const inviteName = cookieStore.get("invite-name")?.value;

          if (!inviteToken) {
            // Direct signup: 초대 없이 카카오 가입 → MEMBER로 자동 생성
            const userEmail = email || `kakao_${account.providerAccountId}@kakao.local`;
            const userName = user.name || userEmail.split("@")[0];

            // 이메일 중복 시 기존 유저에 계정 연결
            let dbUser = await prisma.user.findUnique({
              where: { email: userEmail },
            });

            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  email: userEmail,
                  name: userName,
                  roles: ["MEMBER"],
                },
              });
            }

            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });

            // user 객체에 DB 데이터 설정 (jwt 콜백에서 사용)
            user.id = dbUser.id;
            user.roles = dbUser.roles;
            user.phone = dbUser.phone;
            user.shopId = dbUser.shopId;
            user.email = dbUser.email;

            debugLog("[Auth] New member created via direct signup:", dbUser.email);
            return true;
          }

          // 3. 초대 유효성 확인
          const invitation = await prisma.invitation.findUnique({
            where: { token: inviteToken },
            include: { shop: true },
          });

          if (!invitation) {
            debugLog("[Auth] Invalid invite token");
            return "/login?error=InvalidInvitation";
          }

          if (invitation.usedAt && !invitation.reusable) {
            debugLog("[Auth] Invite token already used");
            return "/login?error=InvitationUsed";
          }

          if (invitation.expiresAt < new Date()) {
            debugLog("[Auth] Invite token expired");
            return "/login?error=InvitationExpired";
          }

          const metadata = invitation.metadata as Record<string, unknown> | null;

          // 4. 이메일로 기존 User 확인, 없으면 providerAccountId 기반 폴백 이메일 사용
          const userEmail = email || metadata?.email as string || `kakao_${account.providerAccountId}@kakao.local`;
          let dbUser = await prisma.user.findUnique({
            where: { email: userEmail },
          });

          if (!dbUser) {
            // 5. User 생성
            const decodedInviteName = inviteName ? decodeURIComponent(inviteName) : null;
            const userName = decodedInviteName || user.name || metadata?.name as string || userEmail.split("@")[0];
            dbUser = await prisma.user.create({
              data: {
                email: userEmail,
                name: userName,
                phone: metadata?.phone as string || null,
                roles: [invitation.role],
                shopId: invitation.shopId,
              },
            });

            // 역할별 프로필 생성
            if (invitation.role === "TRAINER") {
              await prisma.trainerProfile.create({
                data: {
                  userId: dbUser.id,
                  shopId: invitation.shopId,
                  bio: metadata?.bio as string || null,
                },
              });
            } else if (invitation.role === "MEMBER") {
              const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
              let qrCode = "";
              for (let i = 0; i < 12; i++) {
                qrCode += chars.charAt(Math.floor(Math.random() * chars.length));
              }

              await prisma.memberProfile.create({
                data: {
                  userId: dbUser.id,
                  shopId: invitation.shopId,
                  qrCode,
                  trainerId: metadata?.trainerId as string || null,
                  remainingPT: (metadata?.remainingPT as number) || 0,
                  notes: metadata?.notes as string || null,
                  birthDate: metadata?.birthDate ? new Date(metadata.birthDate as string) : null,
                  gender: (metadata?.gender as "MALE" | "FEMALE") || null,
                },
              });
            }
          }

          // 6. Account 생성 (OAuth 연결)
          await prisma.account.create({
            data: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
          });

          // 7. Invitation 사용 처리 (reusable 초대는 사용 처리하지 않음)
          if (!invitation.reusable) {
            await prisma.invitation.update({
              where: { id: invitation.id },
              data: {
                usedAt: new Date(),
                usedBy: dbUser.id,
              },
            });
          }

          // 8. invite-token, invite-name 쿠키 삭제
          cookieStore.delete("invite-token");
          cookieStore.delete("invite-name");

          // user 객체에 DB 데이터 설정 (jwt 콜백에서 사용)
          user.id = dbUser.id;
          user.roles = dbUser.roles;
          user.phone = dbUser.phone;
          user.shopId = dbUser.shopId;
          user.email = dbUser.email;

          debugLog("[Auth] New user created via invitation:", dbUser.email, dbUser.roles);
          return true;
        } catch (error) {
          console.error("[Auth] Error processing Kakao signup:", error);
          return "/login?error=SignupError";
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // 첫 로그인: user 객체에서 토큰 데이터 설정 (Credentials, Kakao 모두)
      // signIn 콜백에서 user 객체에 DB 데이터를 미리 설정해두었으므로 Prisma 불필요
      if (user && account) {
        token.id = user.id!;
        token.roles = user.roles;
        token.phone = user.phone;
        token.shopId = user.shopId;
        if (user.email) token.email = user.email;
        token.userVerifiedAt = Date.now();
      }

      // Legacy compatibility: migrate single role to roles array
      const legacyRole = (token as Record<string, unknown>).role as UserRole | undefined;
      const tokenRoles = token.roles as UserRole[] | undefined;
      if (legacyRole && (!tokenRoles || tokenRoles.length === 0)) {
        token.roles = [legacyRole];
        delete (token as Record<string, unknown>).role;
      }

      // 후속 요청: DB에서 주기적 검증 (Edge Runtime에서는 skip)
      // 미들웨어(Edge)에서는 Prisma 사용 불가 → try/catch로 graceful 처리
      // Server Component/API Route(Node.js)에서만 실제 검증 실행
      if (!user && !account && token.id && !token.userDeleted) {
        const VERIFY_INTERVAL = 5 * 60 * 1000;
        const now = Date.now();
        const needsRefresh = (token.roles as UserRole[] | undefined)?.includes("MEMBER") && !token.shopId;
        if (needsRefresh || !token.userVerifiedAt || now - (token.userVerifiedAt as number) > VERIFY_INTERVAL) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { id: true, roles: true, shopId: true, phone: true },
            });
            if (!dbUser) {
              token.userDeleted = true;
            } else {
              token.userVerifiedAt = now;
              token.roles = dbUser.roles;
              token.shopId = dbUser.shopId;
              token.phone = dbUser.phone;
            }
          } catch {
            // Edge Runtime: Prisma 사용 불가, 기존 토큰 데이터 유지
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      // User was deleted — return session without user data
      if (token?.userDeleted) {
        return session;
      }

      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as UserRole[];
        session.user.phone = token.phone as string | null | undefined;
        session.user.shopId = token.shopId as string | null | undefined;
      }

      // Check for impersonation cookie (only if current user is SUPER_ADMIN)
      if ((token.roles as UserRole[] | undefined)?.includes("SUPER_ADMIN")) {
        try {
          const cookieStore = await cookies();
          const impersonateCookie = cookieStore.get("impersonate-session");

          if (impersonateCookie?.value) {
            const { jwtVerify } = await import("jose");
            const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
            const { payload } = await jwtVerify(impersonateCookie.value, secret);

            if (payload.purpose === "impersonate" && payload.id) {
              session.user.id = payload.id as string;
              session.user.email = payload.email as string;
              session.user.name = payload.name as string;
              session.user.roles = (payload.roles as UserRole[]) ?? [payload.role as UserRole];
              session.user.shopId = payload.shopId as string | null;
              session.user.isImpersonating = true;
              session.user.impersonateShopName = payload.shopName as string | null;
            }
          }
        } catch {
          // Cookie invalid or expired - ignore and use normal session
        }
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        try {
          // DB에서 유저 정보 조회 (OAuth 로그인 시 role이 없을 수 있음)
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { roles: true, shopId: true, name: true },
          });

          if (!dbUser) return;

          let shopName: string | null = null;
          if (dbUser.shopId) {
            const shop = await prisma.pTShop.findUnique({
              where: { id: dbUser.shopId },
              select: { name: true },
            });
            shopName = shop?.name || null;
          }

          await logLogin(
            user.id,
            dbUser.name || user.name || "Unknown",
            primaryRole(dbUser.roles),
            dbUser.shopId,
            shopName
          );
        } catch (error) {
          console.error("Failed to log login:", error);
        }
      }
    },
  },
});
