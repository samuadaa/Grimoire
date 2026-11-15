import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, domains, noteTags, noteTypes, notes, tags, topics } from "@/db/schema";

// Règle d'or : chaque requête filtre sur userId, et ignore ce qui est à la corbeille.

export type TreeCourse = { id: string; name: string; children: { id: string; name: string }[] };
export type TreeDomain = { id: string; name: string; courses: TreeCourse[] };

export async function getTree(userId: string): Promise<TreeDomain[]> {
  const [doms, crs] = await Promise.all([
    db
      .select()
      .from(domains)
      .where(and(eq(domains.userId, userId), isNull(domains.deletedAt)))
      .orderBy(asc(domains.position), asc(domains.name)),
    db
      .select()
      .from(courses)
      .where(and(eq(courses.userId, userId), isNull(courses.deletedAt)))
      .orderBy(asc(courses.position), asc(courses.name)),
  ]);
  return doms.map((d) => ({
    id: d.id,
    name: d.name,
    courses: crs
      .filter((c) => c.domainId === d.id && c.parentId === null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        children: crs
          .filter((s) => s.parentId === c.id)
          .map((s) => ({ id: s.id, name: s.name })),
      })),
  }));
}

export async function getDomain(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, id), eq(domains.userId, userId), isNull(domains.deletedAt)));
  return row ?? null;
}

export async function getCourse(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, userId), isNull(courses.deletedAt)));
  return row ?? null;
}

export async function getChapter(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.id, id), eq(chapters.userId, userId), isNull(chapters.deletedAt)));
  return row ?? null;
}

export async function getTopic(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId), isNull(topics.deletedAt)));
  return row ?? null;
}

async function noteCounts(userId: string) {
  const rows = await db
    .select({ topicId: notes.topicId, n: count() })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)))
    .groupBy(notes.topicId);
  return new Map(rows.map((r) => [r.topicId, r.n]));
}

// Contenu d'une page de cours ou de sous-cours : chapitres, notions, sous-cours.
export async function getCourseContent(userId: string, courseId: string) {
  const [subcourses, chapterRows, topicRows, counts] = await Promise.all([
    db
      .select()
      .from(courses)
      .where(and(eq(courses.userId, userId), eq(courses.parentId, courseId), isNull(courses.deletedAt)))
      .orderBy(asc(courses.position), asc(courses.name)),
    db
      .select()
      .from(chapters)
      .where(and(eq(chapters.userId, userId), eq(chapters.courseId, courseId), isNull(chapters.deletedAt)))
      .orderBy(asc(chapters.position), asc(chapters.name)),
    db
      .select()
      .from(topics)
      .where(and(eq(topics.userId, userId), eq(topics.courseId, courseId), isNull(topics.deletedAt)))
      .orderBy(asc(topics.isDefault), asc(topics.position), asc(topics.name)),
    noteCounts(userId),
  ]);
  const withCount = (t: (typeof topicRows)[number]) => ({ ...t, noteCount: counts.get(t.id) ?? 0 });
  return {
    subcourses,
    chapters: chapterRows.map((c) => ({
      ...c,
      topics: topicRows.filter((t) => t.chapterId === c.id).map(withCount),
    })),
    loose: topicRows.filter((t) => t.chapterId === null).map(withCount),
  };
}

export async function getTypes(userId: string) {
  return db
    .select()
    .from(noteTypes)
    .where(eq(noteTypes.userId, userId))
    .orderBy(asc(noteTypes.position), asc(noteTypes.name));
}

export async function getNote(userId: string, id: string) {
  const [row] = await db
    .select({ note: notes, type: noteTypes })
    .from(notes)
    .innerJoin(noteTypes, eq(notes.typeId, noteTypes.id))
    .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)));
  return row ?? null;
}

export async function listNotes(userId: string, topicId: string) {
  return db
    .select({ note: notes, type: noteTypes })
    .from(notes)
    .innerJoin(noteTypes, eq(notes.typeId, noteTypes.id))
    .where(and(eq(notes.userId, userId), eq(notes.topicId, topicId), isNull(notes.deletedAt)))
    .orderBy(asc(notes.position), desc(notes.createdAt));
}

export async function getNoteTags(userId: string, noteId: string) {
  const rows = await db
    .select({ name: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(and(eq(noteTags.noteId, noteId), eq(tags.userId, userId)))
    .orderBy(asc(tags.name));
  return rows.map((r) => r.name);
}
