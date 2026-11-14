import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

async function isInvited(email: string) {
  const row = await db.query.allowedEmails.findFirst({
    where: eq(schema.allowedEmails.email, email.toLowerCase()),
  });
  return row?.status === "allowed";
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    additionalFields: {
      // input: false : personne ne peut se donner ce rôle depuis le site.
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Exécuté avant la création de tout compte, quelle que soit la méthode.
        before: async (newUser) => {
          if (adminEmail && newUser.email.toLowerCase() === adminEmail) {
            return { data: { ...newUser, role: "admin" } };
          }
          if (!(await isInvited(newUser.email))) {
            throw new APIError("FORBIDDEN", { message: "Accès sur invitation." });
          }
          return { data: newUser };
        },
      },
    },
    session: {
      create: {
        // Un compte suspendu ou retiré de la liste ne peut plus se connecter.
        before: async (newSession) => {
          const u = await db.query.user.findFirst({
            where: eq(schema.user.id, newSession.userId),
          });
          if (!u) throw new APIError("FORBIDDEN", { message: "Compte introuvable." });
          if (u.role === "admin") return { data: newSession };
          if (!(await isInvited(u.email))) {
            throw new APIError("FORBIDDEN", { message: "Accès sur invitation." });
          }
          return { data: newSession };
        },
      },
    },
  },
  plugins: [nextCookies()], // doit rester le dernier plugin
});
