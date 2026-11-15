import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ItemType } from "./items";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

const { domains, courses, chapters, topics, notes, images } = schema;

// inArray avec une liste vide : on renvoie « faux » au lieu de planter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inList = (col: any, list: string[]) => (list.length ? inArray(col, list) : sql`false`);

export type Scope = { domainIds: string[]; courseIds: string[]; chapterIds: string[]; topicIds: string[]; noteIds: string[] };

// Tout ce qui est contenu dans un élément : domaine > cours (+ sous-cours) > chapitre > notion > note.
export async function scopeOf(db: Db, userId: string, type: ItemType, id: string): Promise<Scope> {
  const s: Scope = { domainIds: [], courseIds: [], chapterIds: [], topicIds: [], noteIds: [] };
  if (type === "domaine") {
    s.domainIds = [id];
    const rows = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.userId, userId), eq(courses.domainId, id)));
    s.courseIds = rows.map((r) => r.id);
  } else if (type === "cours") {
    const subs = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.userId, userId), eq(courses.parentId, id)));
    s.courseIds = [id, ...subs.map((r) => r.id)];
  }
  if (type === "domaine" || type === "cours") {
    const ch = await db.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.userId, userId), inList(chapters.courseId, s.courseIds)));
    s.chapterIds = ch.map((r) => r.id);
    const tp = await db.select({ id: topics.id }).from(topics).where(and(eq(topics.userId, userId), inList(topics.courseId, s.courseIds)));
    s.topicIds = tp.map((r) => r.id);
  } else if (type === "chapitre") {
    s.chapterIds = [id];
    const tp = await db.select({ id: topics.id }).from(topics).where(and(eq(topics.userId, userId), eq(topics.chapterId, id)));
    s.topicIds = tp.map((r) => r.id);
  } else if (type === "notion") {
    s.topicIds = [id];
  }
  if (type === "note") s.noteIds = [id];
  else {
    const nt = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.userId, userId), inList(notes.topicId, s.topicIds)));
    s.noteIds = nt.map((r) => r.id);
  }
  return s;
}

type Row = { name: string; deletedAt: Date | null; isDefault?: boolean; parentId?: string | null; courseId?: string; chapterId?: string | null; domainId?: string; topicId?: string };

async function rootRow(db: Db, userId: string, type: ItemType, id: string): Promise<Row | null> {
  if (type === "domaine") {
    const [r] = await db.select().from(domains).where(and(eq(domains.id, id), eq(domains.userId, userId)));
    return r ? { name: r.name, deletedAt: r.deletedAt } : null;
  }
  if (type === "cours") {
    const [r] = await db.select().from(courses).where(and(eq(courses.id, id), eq(courses.userId, userId)));
    return r ? { name: r.name, deletedAt: r.deletedAt, parentId: r.parentId, domainId: r.domainId } : null;
  }
  if (type === "chapitre") {
    const [r] = await db.select().from(chapters).where(and(eq(chapters.id, id), eq(chapters.userId, userId)));
    return r ? { name: r.name, deletedAt: r.deletedAt, courseId: r.courseId } : null;
  }
  if (type === "notion") {
    const [r] = await db.select().from(topics).where(and(eq(topics.id, id), eq(topics.userId, userId)));
    return r ? { name: r.name, deletedAt: r.deletedAt, isDefault: r.isDefault, courseId: r.courseId, chapterId: r.chapterId } : null;
  }
  const [r] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  return r ? { name: r.title || "Note sans titre", deletedAt: r.deletedAt, topicId: r.topicId } : null;
}

export type Counts = { cours: number; chapitres: number; notions: number; notes: number };
export type Result = { ok: true; counts: Counts } | { ok: false; message: string };

// Mise à la corbeille : tout ce qui est contenu reçoit la même date, ce qui permet de tout restaurer ensemble.
export async function trashItem(db: Db, userId: string, type: ItemType, id: string, now = new Date()): Promise<Result> {
  const root = await rootRow(db, userId, type, id);
  if (!root || root.deletedAt) return { ok: false, message: "Élément introuvable." };
  if (type === "notion" && root.isDefault) {
    return { ok: false, message: "La notion « Non classé » ne peut pas être supprimée seule." };
  }
  const s = await scopeOf(db, userId, type, id);
  const mark = async (table: typeof domains | typeof courses | typeof chapters | typeof topics | typeof notes, ids: string[]) => {
    if (!ids.length) return 0;
    const res = await db
      .update(table)
      .set({ deletedAt: now })
      .where(and(eq(table.userId, userId), inArray(table.id, ids), isNull(table.deletedAt)))
      .returning({ id: table.id });
    return res.length;
  };
  await mark(domains, s.domainIds);
  const c = await mark(courses, s.courseIds);
  const ch = await mark(chapters, s.chapterIds);
  const t = await mark(topics, s.topicIds);
  const n = await mark(notes, s.noteIds);
  return { ok: true, counts: { cours: c, chapitres: ch, notions: t, notes: n } };
}

// Ce qui sera touché, pour la page de confirmation.
export async function previewCounts(db: Db, userId: string, type: ItemType, id: string): Promise<Counts> {
  const s = await scopeOf(db, userId, type, id);
  const active = async (table: typeof courses | typeof chapters | typeof topics | typeof notes, ids: string[]) =>
    ids.length
      ? (await db.select({ id: table.id }).from(table).where(and(eq(table.userId, userId), inArray(table.id, ids), isNull(table.deletedAt)))).length
      : 0;
  return {
    cours: await active(courses, s.courseIds),
    chapitres: await active(chapters, s.chapterIds),
    notions: await active(topics, s.topicIds),
    notes: await active(notes, s.noteIds),
  };
}

async function isActive(db: Db, userId: string, table: typeof domains | typeof courses | typeof chapters | typeof topics, id: string | null | undefined) {
  if (!id) return { ok: true as const };
  const [r] = await db.select({ name: table.name, deletedAt: table.deletedAt }).from(table).where(and(eq(table.id, id), eq(table.userId, userId)));
  return r && !r.deletedAt ? { ok: true as const } : { ok: false as const, name: r?.name ?? "l’élément parent" };
}

// Restauration : seulement ce qui a été mis à la corbeille en même temps, et si le parent est en place.
export async function restoreItem(db: Db, userId: string, type: ItemType, id: string): Promise<Result> {
  const root = await rootRow(db, userId, type, id);
  if (!root || !root.deletedAt) return { ok: false, message: "Élément introuvable dans la corbeille." };
  const stamp = root.deletedAt;

  const parents: { table: typeof domains | typeof courses | typeof chapters | typeof topics; id: string | null | undefined }[] = [];
  if (type === "cours") parents.push({ table: root.parentId ? courses : domains, id: root.parentId ?? root.domainId });
  if (type === "cours" && root.parentId) parents.push({ table: domains, id: root.domainId });
  if (type === "chapitre") parents.push({ table: courses, id: root.courseId });
  if (type === "notion") {
    parents.push({ table: courses, id: root.courseId });
    parents.push({ table: chapters, id: root.chapterId });
  }
  if (type === "note") parents.push({ table: topics, id: root.topicId });
  for (const p of parents) {
    const r = await isActive(db, userId, p.table, p.id);
    if (!r.ok) return { ok: false, message: `Restaurez d’abord « ${r.name} ».` };
  }

  const s = await scopeOf(db, userId, type, id);
  const back = async (table: typeof domains | typeof courses | typeof chapters | typeof topics | typeof notes, ids: string[]) => {
    if (!ids.length) return 0;
    const res = await db
      .update(table)
      .set({ deletedAt: null })
      .where(and(eq(table.userId, userId), inArray(table.id, ids), eq(table.deletedAt, stamp)))
      .returning({ id: table.id });
    return res.length;
  };
  await back(domains, s.domainIds);
  const c = await back(courses, s.courseIds);
  const ch = await back(chapters, s.chapterIds);
  const t = await back(topics, s.topicIds);
  const n = await back(notes, s.noteIds);
  return { ok: true, counts: { cours: c, chapitres: ch, notions: t, notes: n } };
}

export type TrashEntry = { type: ItemType; id: string; name: string; path: string; deletedAt: Date };

// Éléments à la racine de la corbeille : ceux dont le parent n'est pas parti avec eux.
export async function listTrash(db: Db, userId: string): Promise<TrashEntry[]> {
  const [dm, cr, cp, tp, nt] = await Promise.all([
    db.select().from(domains).where(eq(domains.userId, userId)),
    db.select().from(courses).where(eq(courses.userId, userId)),
    db.select().from(chapters).where(eq(chapters.userId, userId)),
    db.select().from(topics).where(eq(topics.userId, userId)),
    db.select().from(notes).where(and(eq(notes.userId, userId), isNotNull(notes.deletedAt))),
  ]);
  const D = new Map(dm.map((r) => [r.id, r]));
  const C = new Map(cr.map((r) => [r.id, r]));
  const P = new Map(cp.map((r) => [r.id, r]));
  const T = new Map(tp.map((r) => [r.id, r]));
  const same = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();
  const out: TrashEntry[] = [];

  for (const r of dm) if (r.deletedAt) out.push({ type: "domaine", id: r.id, name: r.name, path: "Bibliothèque", deletedAt: r.deletedAt });
  for (const r of cr) {
    if (!r.deletedAt) continue;
    const parent = r.parentId ? C.get(r.parentId) : null;
    const dom = D.get(r.domainId);
    if (same(parent ? parent.deletedAt : dom?.deletedAt ?? null, r.deletedAt)) continue;
    out.push({ type: "cours", id: r.id, name: r.name, path: [dom?.name, parent?.name].filter(Boolean).join(" › "), deletedAt: r.deletedAt });
  }
  for (const r of cp) {
    if (!r.deletedAt) continue;
    const course = C.get(r.courseId);
    if (same(course?.deletedAt ?? null, r.deletedAt)) continue;
    out.push({ type: "chapitre", id: r.id, name: r.name, path: course?.name ?? "", deletedAt: r.deletedAt });
  }
  for (const r of tp) {
    if (!r.deletedAt) continue;
    const course = C.get(r.courseId);
    const chap = r.chapterId ? P.get(r.chapterId) : null;
    if (same(course?.deletedAt ?? null, r.deletedAt) || same(chap?.deletedAt ?? null, r.deletedAt)) continue;
    out.push({ type: "notion", id: r.id, name: r.name, path: [course?.name, chap?.name].filter(Boolean).join(" › "), deletedAt: r.deletedAt });
  }
  for (const r of nt) {
    if (!r.deletedAt) continue;
    const topic = T.get(r.topicId);
    if (same(topic?.deletedAt ?? null, r.deletedAt)) continue;
    out.push({ type: "note", id: r.id, name: r.title || "Note sans titre", path: topic?.name ?? "", deletedAt: r.deletedAt });
  }
  return out.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

// Suppression définitive d'un élément qui est dans la corbeille. Renvoie les fichiers d'images à effacer du stockage.
export async function purgeItem(db: Db, userId: string, type: ItemType, id: string): Promise<{ ok: true; pathnames: string[] } | { ok: false; message: string }> {
  const root = await rootRow(db, userId, type, id);
  if (!root || !root.deletedAt) return { ok: false, message: "Seuls les éléments de la corbeille peuvent être supprimés définitivement." };
  const s = await scopeOf(db, userId, type, id);

  const imgs = s.noteIds.length
    ? await db.select({ id: images.id, pathname: images.pathname }).from(images).where(and(eq(images.userId, userId), inList(images.noteId, s.noteIds)))
    : [];
  if (s.noteIds.length) await db.delete(notes).where(and(eq(notes.userId, userId), inArray(notes.id, s.noteIds)));
  if (imgs.length) await db.delete(images).where(and(eq(images.userId, userId), inArray(images.id, imgs.map((i) => i.id))));
  if (s.topicIds.length) await db.delete(topics).where(and(eq(topics.userId, userId), inArray(topics.id, s.topicIds)));
  if (s.chapterIds.length) await db.delete(chapters).where(and(eq(chapters.userId, userId), inArray(chapters.id, s.chapterIds)));
  if (s.courseIds.length) {
    // les sous-cours d'abord, puis le cours qui les contient
    await db.delete(courses).where(and(eq(courses.userId, userId), inArray(courses.id, s.courseIds), isNotNull(courses.parentId)));
    await db.delete(courses).where(and(eq(courses.userId, userId), inArray(courses.id, s.courseIds)));
  }
  if (s.domainIds.length) await db.delete(domains).where(and(eq(domains.userId, userId), inArray(domains.id, s.domainIds)));
  return { ok: true, pathnames: imgs.map((i) => i.pathname) };
}

// Vide la corbeille, et nettoie les images envoyées mais jamais utilisées (plus de 24 h).
export async function emptyTrash(db: Db, userId: string, now = new Date()): Promise<string[]> {
  const pathnames: string[] = [];
  for (const e of await listTrash(db, userId)) {
    const r = await purgeItem(db, userId, e.type, e.id);
    if (r.ok) pathnames.push(...r.pathnames);
  }
  const cutoff = new Date(now.getTime() - 24 * 3600 * 1000);
  const orphans = await db
    .select({ id: images.id, pathname: images.pathname })
    .from(images)
    .where(and(eq(images.userId, userId), isNull(images.noteId), lt(images.createdAt, cutoff)));
  if (orphans.length) {
    await db.delete(images).where(and(eq(images.userId, userId), inArray(images.id, orphans.map((o) => o.id))));
    pathnames.push(...orphans.map((o) => o.pathname));
  }
  return pathnames;
}

// Où revenir après avoir mis un élément à la corbeille.
export async function parentHref(db: Db, userId: string, type: ItemType, id: string): Promise<string> {
  const r = await rootRow(db, userId, type, id);
  if (!r || type === "domaine") return "/";
  if (type === "cours") return r.parentId ? `/cours/${r.parentId}` : `/domaines/${r.domainId}`;
  if (type === "chapitre" || type === "notion") return `/cours/${r.courseId}`;
  return `/notions/${r.topicId}`;
}

export { rootRow as describeItem };
