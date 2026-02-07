import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { logLogin } from "@/lib/access-log";

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
  // Credentials 프로바이더 + JWT 사용 시 adapter 제거 (adapter는 OAuth용)
  // adapter: PrismaAdapter(prisma) as any,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.phone = user.phone;
        token.shopId = user.shopId;
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
          const { cookies } = await import("next/headers");
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
          // Get shop name if user has shopId
          let shopName: string | null = null;
          if (user.shopId) {
            const shop = await prisma.pTShop.findUnique({
              where: { id: user.shopId },
              select: { name: true },
            });
            shopName = shop?.name || null;
          }

          await logLogin(
            user.id,
            user.name || "Unknown",
            user.role as UserRole,
            user.shopId,
            shopName
          );
        } catch (error) {
          console.error("Failed to log login:", error);
        }
      }
    },
  },
});
