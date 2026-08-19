import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Валидный bcrypt-хеш случайной строки. Используется, когда пользователь с таким
// email не найден: bcrypt.compare всё равно выполняется, чтобы время ответа не
// выдавало существование аккаунта. Не является секретом.
const DUMMY_PASSWORD_HASH =
  "$2b$12$vqF/Jme/.hzPkYnGourjMePLLAcgo1OES9AUnXsg7Xp2tx8ftfcUi";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email и пароль обязательны");
        }

        // Базовый анти-брутфорс: лимит попыток на пару email+IP.
        const ip = clientIp(req?.headers ?? {});
        const rl = await rateLimit(
          `login:${credentials.email}:${ip}`,
          10,
          5 * 60 * 1000
        );
        if (!rl.allowed) {
          throw new Error("Слишком много попыток входа. Попробуйте позже.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // bcrypt.compare выполняется всегда, даже если пользователя нет —
        // одинаковое время ответа против перечисления аккаунтов.
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user?.password ?? DUMMY_PASSWORD_HASH
        );

        if (!user || !isPasswordValid) {
          // Единое сообщение — не раскрываем, существует ли такой email.
          throw new Error("Неверный email или пароль");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
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
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
