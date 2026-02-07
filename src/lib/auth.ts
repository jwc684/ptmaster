import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import KakaoProvider from "next-auth/providers/kakao";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { logLogin } from "@/lib/access-log";
import { cookies } from "next/headers";
// Import to enable @auth/core module augmentation
import "@auth/core/jwt";

declare module "next-auth" {
  interface User {
    role: UserRole;
    phone?: string | null;
    shopId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
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
    role: UserRole;
    phone?: string | null;
    shopId?: string | null;
  }
}

// AUTH_SECRET 확인 (프로덕션에서 필수)
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  console.error("AUTH_SECRET is not set in production environment!");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
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
          console.log("[Auth] Login attempt for:", credentials?.email);

          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing credentials");
            throw new Error("이메일과 비밀번호를 입력해주세요.");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          console.log("[Auth] User found:", !!user);

          if (!user || !user.password) {
            console.log("[Auth] User not found or no password");
            throw new Error("등록되지 않은 이메일입니다.");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          console.log("[Auth] Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            throw new Error("비밀번호가 일치하지 않습니다.");
          }

          console.log("[Auth] Login successful for:", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
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
    async signIn({ user, account }) {
      // Credentials provider: 기존 로직 유지
      if (account?.provider === "credentials") {
        return true;
      }

      // Kakao OAuth
      if (account?.provider === "kakao") {
        const email = user.email;
        if (!email) {
          console.error("[Auth] Kakao login: no email provided");
          return false;
        }

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
          // 기존 사용자 → 로그인 허용
          console.log("[Auth] Existing Kakao user:", existingAccount.user.email);
          return true;
        }

        // 2. 신규 사용자 → 쿠키에서 invite-token 확인
        try {
          const cookieStore = await cookies();
          const inviteToken = cookieStore.get("invite-token")?.value;

          if (!inviteToken) {
            console.log("[Auth] No invite token found for new Kakao user");
            return "/login?error=NoInvitation";
          }

          // 3. 초대 유효성 확인
          const invitation = await prisma.invitation.findUnique({
            where: { token: inviteToken },
            include: { shop: true },
          });

          if (!invitation) {
            console.log("[Auth] Invalid invite token");
            return "/login?error=InvalidInvitation";
          }

          if (invitation.usedAt) {
            console.log("[Auth] Invite token already used");
            return "/login?error=InvitationUsed";
          }

          if (invitation.expiresAt < new Date()) {
            console.log("[Auth] Invite token expired");
            return "/login?error=InvitationExpired";
          }

          // 4. 이메일로 기존 User 확인 (동일 이메일 사용자가 이미 있을 수 있음)
          let dbUser = await prisma.user.findUnique({
            where: { email },
          });

          const metadata = invitation.metadata as Record<string, unknown> | null;

          if (!dbUser) {
            // 5. User 생성
            dbUser = await prisma.user.create({
              data: {
                email,
                name: user.name || metadata?.name as string || email.split("@")[0],
                phone: metadata?.phone as string || null,
                role: invitation.role,
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

          // 7. Invitation 사용 처리
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: {
              usedAt: new Date(),
              usedBy: dbUser.id,
            },
          });

          // 8. invite-token 쿠키 삭제
          cookieStore.delete("invite-token");

          console.log("[Auth] New user created via invitation:", dbUser.email, dbUser.role);
          return true;
        } catch (error) {
          console.error("[Auth] Error processing Kakao signup:", error);
          return "/login?error=SignupError";
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        // Credentials 로그인: user 객체에서 직접 설정
        if (account?.provider === "credentials") {
          token.id = user.id!;
          token.role = user.role;
          token.phone = user.phone;
          token.shopId = user.shopId;
        }
      }

      // OAuth 첫 로그인 시 또는 token에 role이 없을 때 DB에서 조회
      if (account?.provider === "kakao" || (!token.role && token.email)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.phone = dbUser.phone;
          token.shopId = dbUser.shopId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.phone = token.phone as string | null | undefined;
        session.user.shopId = token.shopId as string | null | undefined;
      }

      // Check for impersonation cookie (only if current user is SUPER_ADMIN)
      if (token.role === "SUPER_ADMIN") {
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
              session.user.role = payload.role as UserRole;
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
            select: { role: true, shopId: true, name: true },
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
            dbUser.role,
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
