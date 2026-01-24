import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

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
      return session;
    },
  },
});
