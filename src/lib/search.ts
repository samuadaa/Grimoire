import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { plainText } from "./richtext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

// Texte sans accents, en minuscules, apostrophes unifiées. map : position d'origine de chaque caractère.
export function fold(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = ch
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u02bc]/g, "'");
    for (let k = 0; k < f.length; k++) map.push(i);
    folded += f;
    i += ch.length;
  }
  return { folded, map };
}
export const foldText = (t: string) => fold(t).folded;

// Mots cherchés : au plus 8, chacun de 50 caractères au plus.
export function parseQuery(q: unknown): string[] {
  if (typeof q !== "string") return [];
  const words = foldText(q.slice(0, 200)).split(/\s+/).filter(Boolean);
  return [...new Set(words.map((w) => w.slice(0, 50)))].slice(0, 8);
}

type Fields = Record<string, unknown>;

// Texte lisible d'une note : titre, champs puis contenu.
export function rawText(title: string, fields: Fields, body: unknown): string {
  const values = Object.values(fields ?? {})
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === "string");
  return [title, ...values, plainText(body, 200_000)].filter(Boolean).join("\n");
}

export const buildSearchText = (title: string, fields: Fields, body: unknown) =>
  foldText(rawText(title, fields, body)).slice(0, 100_000);

export type Segment = { text: string; match: boolean };

// Extrait autour du premier mot trouvé, avec les mots cherchés repérés (affichés par React, jamais en HTML brut).
export function highlight(text: string, terms: string[], radius = 70): Segment[] {
  const { folded, map } = fold(text);
  const ranges: [number, number][] = [];
  for (const t of terms) {
    let from = 0;
    for (;;) {
      const i = folded.indexOf(t, from);
      if (i < 0 || !t) break;
      ranges.push([i, i + t.length]);
      from = i + t.length;
    }
  }
  if (ranges.length === 0 || map.length === 0) return [{ text: text.slice(0, radius * 2), match: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const at = (fi: number) => map[Math.min(Math.max(fi, 0), map.length - 1)];
  const winStart = Math.max(0, at(merged[0][0]) - radius);
  const winEnd = Math.min(text.length, at(merged[0][1] - 1) + 1 + radius);
  const out: Segment[] = [];
  if (winStart > 0) out.push({ text: "…", match: false });
  let pos = winStart;
  for (const [fs, fe] of merged) {
    const os = at(fs);
    const oe = at(fe - 1) + 1;
    if (os >= winEnd) break;
    if (oe <= winStart) continue;
    const s = Math.max(os, pos);
    if (s > pos) out.push({ text: text.slice(pos, s), match: false });
    const e = Math.min(oe, winEnd);
    out.push({ text: text.slice(s, e), match: true });
    pos = e;
  }
  if (pos < winEnd) out.push({ text: text.slice(pos, winEnd), match: false });
  if (winEnd < text.length) out.push({ text: "…", match: false });
  return out;
}

const like = (term: string) => `%${term.replace(/[\\%_]/g, "\\$&")}%`;

export async function searchNotes(db: Db, userId: string, terms: string[], limit = 200) {
  if (terms.length === 0) return [];
  const { notes, noteTypes } = schema;
  return db
    .select({ note: notes, type: noteTypes })
    .from(notes)
    .innerJoin(noteTypes, eq(notes.typeId, noteTypes.id))
    .where(
      and(
        eq(notes.userId, userId),
        isNull(notes.deletedAt),
        ...terms.map((t) => sql`${notes.searchText} like ${like(t)}`),
      ),
    )
    .orderBy(desc(notes.updatedAt))
    .limit(limit);
}

export type StructureHit = { kind: "Cours" | "Sous-cours" | "Chapitre" | "Notion"; id: string; name: string; path: string; href: string };

// Cours, chapitres et notions dont le nom contient tous les mots (le nombre est petit : on filtre ici).
export async function searchStructure(db: Db, userId: string, terms: string[]): Promise<StructureHit[]> {
  if (terms.length === 0) return [];
  const { domains, courses, chapters, topics } = schema;
  const [dm, cr, cp, tp] = await Promise.all([
    db.select().from(domains).where(and(eq(domains.userId, userId), isNull(domains.deletedAt))),
    db.select().from(courses).where(and(eq(courses.userId, userId), isNull(courses.deletedAt))),
    db.select().from(chapters).where(and(eq(chapters.userId, userId), isNull(chapters.deletedAt))),
    db.select().from(topics).where(and(eq(topics.userId, userId), isNull(topics.deletedAt))),
  ]);
  const D = new Map(dm.map((r) => [r.id, r.name]));
  const C = new Map(cr.map((r) => [r.id, r]));
  const P = new Map(cp.map((r) => [r.id, r.name]));
  const ok = (name: string) => {
    const f = foldText(name);
    return terms.every((t) => f.includes(t));
  };
  const out: StructureHit[] = [];
  for (const c of cr) {
    if (!ok(c.name)) continue;
    const parent = c.parentId ? C.get(c.parentId) : undefined;
    out.push({
      kind: parent ? "Sous-cours" : "Cours",
      id: c.id,
      name: c.name,
      path: [D.get(c.domainId), parent?.name].filter(Boolean).join(" › "),
      href: `/cours/${c.id}`,
    });
  }
  for (const c of cp) {
    if (!ok(c.name)) continue;
    const course = C.get(c.courseId);
    out.push({ kind: "Chapitre", id: c.id, name: c.name, path: course?.name ?? "", href: `/cours/${c.courseId}` });
  }
  for (const t of tp) {
    if (!ok(t.name)) continue;
    const course = C.get(t.courseId);
    out.push({
      kind: "Notion",
      id: t.id,
      name: t.name,
      path: [course?.name, t.chapterId ? P.get(t.chapterId) : undefined].filter(Boolean).join(" › "),
      href: `/notions/${t.id}`,
    });
  }
  return out.slice(0, 30);
}
