import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { getDb } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8)
});

export function getAuthOptions(): NextAuthOptions {
  return {
    adapter: PrismaAdapter(getDb()),
    session: {
      strategy: "jwt"
    },
    pages: {
      signIn: "/login"
    },
    providers: [
      CredentialsProvider({
        name: "Email and password",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const user = await getDb().user.findUnique({
            where: { email: parsed.data.email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              passwordHash: true,
              role: true
            }
          });

          if (!user?.passwordHash) {
            return null;
          }

          const isValid = await compare(parsed.data.password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role
          };
        }
      })
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as "USER" | "ADMIN";
        }
        return session;
      }
    }
  };
}

export async function getCurrentSession() {
  return getServerSession(getAuthOptions());
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return null;
  }

  return getDb().user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true }
  });
}

export function isAdmin(session: Session | null) {
  return session?.user?.role === "ADMIN";
}
