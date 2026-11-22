import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { foldText } from "./fold";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;
const { courses, chapters, topics } = schema;

export const DEFAULT_TOPIC = "Non classé";

export type Resolved = { ok: true; topicId: string; created: boolean } | { ok: false; message: string };

// Trouve (ou crée) la notion où ranger une note, à partir du cours, du chapitre facultatif et du nom saisi :
//   - nom vide, ou « Non classé » sans chapitre : la notion « Non classé » du cours ;
//   - nom d'une notion existante (accents et majuscules ignorés) dans le même chapitre : cette notion ;
//   - sinon : une nouvelle notion, créée dans le chapitre choisi (ou sans chapitre).
export async function resolveTopic(
  db: Db,
  userId: string,
  courseId: string,
  chapterId: string | null,
  name: string | null,
): Promise<Resolved> {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId), isNull(courses.deletedAt)));
  if (!course) return { ok: false, message: "Cours introuvable." };

  if (chapterId) {
    const [ch] = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.id, chapterId), eq(chapters.userId, userId), eq(chapters.courseId, courseId), isNull(chapters.deletedAt)));
    if (!ch) return { ok: false, message: "Chapitre introuvable dans ce cours." };
  }

  const clean = (name ?? "").trim();
  const wanted = foldText(clean);

  if (!wanted || (!chapterId && wanted === foldText(DEFAULT_TOPIC))) {
    const [def] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.courseId, courseId), eq(topics.userId, userId), eq(topics.isDefault, true), isNull(topics.deletedAt)));
    if (def) return { ok: true, topicId: def.id, created: false };
    const [row] = await db
      .insert(topics)
      .values({ userId, courseId, name: DEFAULT_TOPIC, isDefault: true })
      .returning({ id: topics.id });
    return { ok: true, topicId: row.id, created: true };
  }

  const inScope = await db
    .select({ id: topics.id, name: topics.name })
    .from(topics)
    .where(
      and(
        eq(topics.courseId, courseId),
        eq(topics.userId, userId),
        isNull(topics.deletedAt),
        chapterId ? eq(topics.chapterId, chapterId) : isNull(topics.chapterId),
      ),
    );
  const found = inScope.find((t) => foldText(t.name) === wanted);
  if (found) return { ok: true, topicId: found.id, created: false };

  const [row] = await db
    .insert(topics)
    .values({ userId, courseId, chapterId, name: clean.slice(0, 160) })
    .returning({ id: topics.id });
  return { ok: true, topicId: row.id, created: true };
}
