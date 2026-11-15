import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";
import { DEFAULT_NOTE_TYPES } from "../src/lib/note-types";
import { NOTES } from "./seed-notes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

type ChapterSeed = { name: string; sourceLabel?: string; sourceUrl?: string; topics: string[] };
type CourseSeed = {
  name: string;
  sourceLabel?: string;
  chapters?: ChapterSeed[];
  topics?: string[]; // notions sans chapitre (en plus de « Non classé »)
  children?: CourseSeed[]; // sous-cours, un seul niveau
};
type DomainSeed = { name: string; courses: CourseSeed[] };

// Votre contenu de test : l'arborescence ci-dessous, puis les notes de seed-notes.ts.
export const TREE: DomainSeed[] = [
  {
    name: "Programmation",
    courses: [
      {
        name: "Python",
        children: [
          {
            name: "Matplotlib",
            chapters: [
              {
                name: "Bonnes pratiques de la data visualisation",
                sourceLabel: "OpenClassrooms, partie 3",
                topics: ["Datavisualisation", "Choisir le graphique adapté"],
              },
            ],
          },
        ],
      },
      { name: "JavaScript", children: [{ name: "React", topics: ["Appréhendez la logique de React"] }] },
    ],
  },
  { name: "Anglais", courses: [{ name: "Anglais technique" }] },
];

export type Report = { created: string[]; existing: string[] };

// Chaque "ensure" retrouve l'élément par son nom (pour cet utilisateur) ou le crée.
// On peut donc relancer le script sans rien dupliquer.
export async function seed(db: Db, userId: string): Promise<Report> {
  const report: Report = { created: [], existing: [] };
  const note = (created: boolean, label: string) => (created ? report.created : report.existing).push(label);
  const { domains, courses, chapters, topics } = schema;

  async function ensureDomain(name: string) {
    const [found] = await db
      .select({ id: domains.id })
      .from(domains)
      .where(and(eq(domains.userId, userId), eq(domains.name, name), isNull(domains.deletedAt)));
    if (found) return note(false, `domaine ${name}`), found.id;
    const [row] = await db.insert(domains).values({ userId, name }).returning({ id: domains.id });
    return note(true, `domaine ${name}`), row.id;
  }

  async function ensureTopic(courseId: string, chapterId: string | null, name: string, isDefault = false) {
    const [found] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.userId, userId), eq(topics.courseId, courseId), eq(topics.name, name), isNull(topics.deletedAt)));
    if (found) return note(false, `notion ${name}`), found.id;
    const [row] = await db
      .insert(topics)
      .values({ userId, courseId, chapterId, name, isDefault })
      .returning({ id: topics.id });
    return note(true, `notion ${name}`), row.id;
  }

  async function ensureChapter(courseId: string, c: ChapterSeed) {
    const [found] = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.userId, userId), eq(chapters.courseId, courseId), eq(chapters.name, c.name), isNull(chapters.deletedAt)));
    if (found) return note(false, `chapitre ${c.name}`), found.id;
    const [row] = await db
      .insert(chapters)
      .values({ userId, courseId, name: c.name, sourceLabel: c.sourceLabel ?? null, sourceUrl: c.sourceUrl ?? null })
      .returning({ id: chapters.id });
    return note(true, `chapitre ${c.name}`), row.id;
  }

  async function ensureCourse(domainId: string, parentId: string | null, c: CourseSeed) {
    const [found] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          eq(courses.userId, userId),
          eq(courses.domainId, domainId),
          eq(courses.name, c.name),
          parentId ? eq(courses.parentId, parentId) : isNull(courses.parentId),
          isNull(courses.deletedAt),
        ),
      );
    if (found) {
      note(false, `cours ${c.name}`);
      // « Non classé » doit exister même si le cours a été créé autrement.
      const [def] = await db
        .select({ id: topics.id })
        .from(topics)
        .where(and(eq(topics.courseId, found.id), eq(topics.isDefault, true), isNull(topics.deletedAt)));
      if (!def) await ensureTopic(found.id, null, "Non classé", true);
      return found.id;
    }
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(courses)
        .values({ userId, domainId, parentId, name: c.name, sourceLabel: c.sourceLabel ?? null })
        .returning({ id: courses.id });
      await tx.insert(topics).values({ userId, courseId: row.id, name: "Non classé", isDefault: true });
      return row.id;
    });
    note(true, `cours ${c.name}`);
    return id;
  }

  async function ensureCourseTree(domainId: string, parentId: string | null, c: CourseSeed) {
    const courseId = await ensureCourse(domainId, parentId, c);
    for (const ch of c.chapters ?? []) {
      const chapterId = await ensureChapter(courseId, ch);
      for (const t of ch.topics) await ensureTopic(courseId, chapterId, t);
    }
    for (const t of c.topics ?? []) await ensureTopic(courseId, null, t);
    for (const child of c.children ?? []) await ensureCourseTree(domainId, courseId, child);
  }

  for (const d of TREE) {
    const domainId = await ensureDomain(d.name);
    for (const c of d.courses) await ensureCourseTree(domainId, null, c);
  }

  // ---- types de notes (au cas où le compte n'a pas encore ouvert l'app) puis notes
  const { noteTypes, notes } = schema;
  await db
    .insert(noteTypes)
    .values(DEFAULT_NOTE_TYPES.map((x, i) => ({ ...x, userId, position: i })))
    .onConflictDoNothing();
  const typeRows = await db.select().from(noteTypes).where(eq(noteTypes.userId, userId));
  const typeByName = new Map(typeRows.map((r) => [r.name, r.id]));

  const positions = new Map<string, number>();
  for (const n of NOTES) {
    const [topic] = await db
      .select({ id: topics.id })
      .from(topics)
      .innerJoin(courses, eq(topics.courseId, courses.id))
      .where(
        and(
          eq(topics.userId, userId),
          eq(topics.name, n.topic),
          eq(courses.name, n.course),
          isNull(topics.deletedAt),
          isNull(courses.deletedAt),
        ),
      );
    const typeId = typeByName.get(n.type);
    if (!topic || !typeId) {
      report.existing.push(`IGNORÉE (introuvable) : ${n.title}`);
      continue;
    }
    const [found] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.topicId, topic.id), eq(notes.title, n.title), isNull(notes.deletedAt)));
    if (found) {
      note(false, `note ${n.title}`);
      continue;
    }
    const position = positions.get(topic.id) ?? 0;
    positions.set(topic.id, position + 1);
    await db.insert(notes).values({
      userId,
      topicId: topic.id,
      typeId,
      title: n.title,
      body: n.body,
      fields: n.fields ?? {},
      position,
      sourceLabel: n.sourceLabel ?? null,
    });
    note(true, `note ${n.title}`);
  }
  return report;
}
