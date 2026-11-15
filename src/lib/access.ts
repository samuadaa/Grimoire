import { and, count, desc, eq, gt, inArray, isNull, sum } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { cleanText } from "./validation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;
const { allowedEmails, accessRequests, user, session, notes, images } = schema;

export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export const isEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const MAX_REQUESTS_PER_HOUR = 30; // pour tout le site : empêche de remplir votre liste de faux messages
const MAX_PENDING = 200;

// Demande d'accès faite depuis la page de connexion (sans compte, sans rien d'autre créé).
export async function submitRequest(
  db: Db,
  emailRaw: unknown,
  messageRaw: unknown,
  now = new Date(),
): Promise<{ status: "ok" | "invalid" | "too_many"; created: boolean; email?: string; message?: string | null }> {
  const email = normalizeEmail(emailRaw);
  if (!isEmail(email)) return { status: "invalid", created: false };
  const message = cleanText(messageRaw, 300);

  // Déjà invité : on ne le révèle pas, on répond comme si c'était pris en compte.
  const [known] = await db.select({ id: allowedEmails.id }).from(allowedEmails).where(eq(allowedEmails.email, email));
  if (known) return { status: "ok", created: false };

  const [pending] = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(and(eq(accessRequests.email, email), eq(accessRequests.status, "pending")));
  if (pending) {
    await db.update(accessRequests).set({ message }).where(eq(accessRequests.id, pending.id));
    return { status: "ok", created: false };
  }

  const since = new Date(now.getTime() - 3600 * 1000);
  const [recent] = await db.select({ n: count() }).from(accessRequests).where(gt(accessRequests.createdAt, since));
  const [open] = await db.select({ n: count() }).from(accessRequests).where(eq(accessRequests.status, "pending"));
  if (recent.n >= MAX_REQUESTS_PER_HOUR || open.n >= MAX_PENDING) return { status: "too_many", created: false };

  await db.insert(accessRequests).values({ email, message });
  return { status: "ok", created: true, email, message };
}

async function dropSessions(db: Db, email: string) {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (u) await db.delete(session).where(eq(session.userId, u.id));
}

export async function allow(db: Db, emailRaw: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeEmail(emailRaw);
  if (!isEmail(email)) return { ok: false, message: "Adresse e-mail invalide." };
  await db
    .insert(allowedEmails)
    .values({ email, status: "allowed" })
    .onConflictDoUpdate({ target: allowedEmails.email, set: { status: "allowed" } });
  // les demandes en attente de cette adresse sont considérées comme traitées
  await db
    .update(accessRequests)
    .set({ status: "approved" })
    .where(and(eq(accessRequests.email, email), eq(accessRequests.status, "pending")));
  return { ok: true };
}

export async function decideRequest(db: Db, requestId: string, decision: "approved" | "rejected") {
  const [r] = await db.select().from(accessRequests).where(eq(accessRequests.id, requestId));
  if (!r || r.status !== "pending") return { ok: false as const, message: "Demande introuvable ou déjà traitée." };
  if (decision === "approved") {
    await allow(db, r.email);
    return { ok: true as const, email: r.email };
  }
  await db.update(accessRequests).set({ status: "rejected" }).where(eq(accessRequests.id, requestId));
  return { ok: true as const, email: r.email };
}

// Suspendre coupe aussi les sessions déjà ouvertes : l'effet est immédiat.
export async function setStatus(db: Db, id: string, status: "allowed" | "suspended") {
  const [row] = await db.update(allowedEmails).set({ status }).where(eq(allowedEmails.id, id)).returning({ email: allowedEmails.email });
  if (!row) return { ok: false as const, message: "Adresse introuvable." };
  if (status === "suspended") await dropSessions(db, row.email);
  return { ok: true as const };
}

export async function removeAllowed(db: Db, id: string) {
  const [row] = await db.delete(allowedEmails).where(eq(allowedEmails.id, id)).returning({ email: allowedEmails.email });
  if (!row) return { ok: false as const, message: "Adresse introuvable." };
  await dropSessions(db, row.email);
  return { ok: true as const };
}

export type AdminView = {
  pending: { id: string; email: string; message: string | null; createdAt: Date }[];
  people: { id: string; email: string; status: string; since: Date; signedIn: boolean; notes: number; imageBytes: number }[];
};

export async function adminView(db: Db): Promise<AdminView> {
  const [pending, allowed, users] = await Promise.all([
    db.select().from(accessRequests).where(eq(accessRequests.status, "pending")).orderBy(desc(accessRequests.createdAt)),
    db.select().from(allowedEmails).orderBy(allowedEmails.createdAt),
    db.select({ id: user.id, email: user.email }).from(user),
  ]);
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
  const ids = [...byEmail.values()];
  const noteCounts = ids.length
    ? await db.select({ userId: notes.userId, n: count() }).from(notes).where(and(inArray(notes.userId, ids), isNull(notes.deletedAt))).groupBy(notes.userId)
    : [];
  const imageSums = ids.length
    ? await db.select({ userId: images.userId, s: sum(images.size) }).from(images).where(inArray(images.userId, ids)).groupBy(images.userId)
    : [];
  const N = new Map(noteCounts.map((r) => [r.userId, r.n]));
  const S = new Map(imageSums.map((r) => [r.userId, Number(r.s ?? 0)]));
  return {
    pending: pending.map((p) => ({ id: p.id, email: p.email, message: p.message, createdAt: p.createdAt })),
    people: allowed.map((a) => {
      const uid = byEmail.get(a.email);
      return {
        id: a.id,
        email: a.email,
        status: a.status,
        since: a.createdAt,
        signedIn: !!uid,
        notes: uid ? (N.get(uid) ?? 0) : 0,
        imageBytes: uid ? (S.get(uid) ?? 0) : 0,
      };
    }),
  };
}
