import { and, asc, count, eq, lt } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { imageIds, parseBody, plainText } from "./richtext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;
const { noteDrafts } = schema;

const KEY = /^(new|edit):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELD = /^(typeId|title|tags|sourceLabel|sourceUrl|chapterId|notion|topicId|body|f_[A-Za-z0-9_]{1,30})$/;
const MAX_DRAFTS = 50;
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

export const isDraftKey = (k: unknown): k is string => typeof k === "string" && KEY.test(k);

// Ne garde que les champs connus, en texte, et un contenu de note nettoyé.
export function cleanDraftData(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!FIELD.test(k) || typeof v !== "string") continue;
    if (k === "body") {
      const parsed = parseBody(v);
      if (parsed.ok) out.body = JSON.stringify(parsed.doc);
    } else {
      out[k] = v.slice(0, 20_000);
    }
  }
  return out;
}

// Un brouillon vide ne vaut pas la peine d'être gardé.
export function hasContent(d: Record<string, string>): boolean {
  if ((d.title ?? "").trim() || (d.notion ?? "").trim() || (d.tags ?? "").trim()) return true;
  if (Object.keys(d).some((k) => k.startsWith("f_") && d[k].trim())) return true;
  if (d.body) {
    try {
      const doc = JSON.parse(d.body);
      if (plainText(doc, 50).length > 0 || imageIds(doc).length > 0) return true;
    } catch {
      /* ignoré */
    }
  }
  return false;
}

export async function saveDraft(
  db: Db,
  userId: string,
  key: unknown,
  raw: unknown,
  now = new Date(),
): Promise<{ ok: boolean; saved: boolean }> {
  if (!isDraftKey(key)) return { ok: false, saved: false };
  const data = cleanDraftData(raw);
  if (!data) return { ok: false, saved: false };
  if (!hasContent(data)) return { ok: true, saved: false };

  await db
    .insert(noteDrafts)
    .values({ userId, draftKey: key, data, updatedAt: now })
    .onConflictDoUpdate({ target: [noteDrafts.userId, noteDrafts.draftKey], set: { data, updatedAt: now } });

  // Ménage : brouillons de plus de 30 jours, puis les plus anciens au-delà de 50.
  await db.delete(noteDrafts).where(and(eq(noteDrafts.userId, userId), lt(noteDrafts.updatedAt, new Date(now.getTime() - MAX_AGE_MS))));
  const [n] = await db.select({ n: count() }).from(noteDrafts).where(eq(noteDrafts.userId, userId));
  if (n.n > MAX_DRAFTS) {
    const old = await db
      .select({ id: noteDrafts.id })
      .from(noteDrafts)
      .where(eq(noteDrafts.userId, userId))
      .orderBy(asc(noteDrafts.updatedAt))
      .limit(n.n - MAX_DRAFTS);
    for (const o of old) await db.delete(noteDrafts).where(eq(noteDrafts.id, o.id));
  }
  return { ok: true, saved: true };
}

export async function getDraft(db: Db, userId: string, key: string) {
  if (!isDraftKey(key)) return null;
  const [row] = await db
    .select()
    .from(noteDrafts)
    .where(and(eq(noteDrafts.userId, userId), eq(noteDrafts.draftKey, key)));
  return row ? { data: row.data as Record<string, string>, updatedAt: row.updatedAt } : null;
}

export async function deleteDraft(db: Db, userId: string, key: unknown) {
  if (!isDraftKey(key)) return;
  await db.delete(noteDrafts).where(and(eq(noteDrafts.userId, userId), eq(noteDrafts.draftKey, key)));
}
