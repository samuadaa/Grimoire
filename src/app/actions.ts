"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chapters, courses, domains, topics } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { cleanText, cleanUrl, isUuid } from "@/lib/validation";

// En cas de saisie invalide, on revient au formulaire avec un message.
function fail(back: string, message: string): never {
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}erreur=${encodeURIComponent(message)}`);
}

function source(back: string, formData: FormData) {
  const sourceLabel = cleanText(formData.get("sourceLabel"), 120);
  const url = cleanUrl(formData.get("sourceUrl"));
  if (url === "invalid") fail(back, "Le lien doit commencer par http:// ou https://");
  return { sourceLabel, sourceUrl: url };
}

export async function createDomain(formData: FormData) {
  const user = await requireUser();
  const name = cleanText(formData.get("name"), 120);
  if (!name) fail("/domaines/nouveau", "Le nom est obligatoire.");
  const [row] = await db.insert(domains).values({ userId: user.id, name }).returning({ id: domains.id });
  redirect(`/domaines/${row.id}`);
}

// Crée un cours, ou un sous-cours si parentId est fourni (un seul niveau).
export async function createCourse(formData: FormData) {
  const user = await requireUser();
  const domainId = formData.get("domainId");
  const parentId = formData.get("parentId");
  const back = isUuid(parentId)
    ? `/cours/nouveau?parent=${parentId}`
    : `/cours/nouveau?domaine=${String(domainId)}`;
  const name = cleanText(formData.get("name"), 120);
  if (!name) fail(back, "Le nom est obligatoire.");
  const src = source(back, formData);

  let targetDomain: string;
  let parent: string | null = null;
  if (isUuid(parentId)) {
    const [p] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, parentId), eq(courses.userId, user.id), isNull(courses.deletedAt)));
    if (!p) fail("/", "Cours introuvable.");
    if (p.parentId !== null) fail(back, "Un sous-cours ne peut pas contenir d’autre sous-cours.");
    targetDomain = p.domainId;
    parent = p.id;
  } else {
    if (!isUuid(domainId)) fail("/", "Domaine introuvable.");
    const [d] = await db
      .select()
      .from(domains)
      .where(and(eq(domains.id, domainId), eq(domains.userId, user.id), isNull(domains.deletedAt)));
    if (!d) fail("/", "Domaine introuvable.");
    targetDomain = d.id;
  }

  // Le cours et sa notion « Non classé » sont créés ensemble, ou pas du tout.
  const id = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(courses)
      .values({ userId: user.id, domainId: targetDomain, parentId: parent, name, ...src })
      .returning({ id: courses.id });
    await tx.insert(topics).values({ userId: user.id, courseId: c.id, name: "Non classé", isDefault: true });
    return c.id;
  });
  redirect(`/cours/${id}`);
}

export async function createChapter(formData: FormData) {
  const user = await requireUser();
  const courseId = formData.get("courseId");
  if (!isUuid(courseId)) fail("/", "Cours introuvable.");
  const back = `/chapitres/nouveau?cours=${courseId}`;
  const name = cleanText(formData.get("name"), 160);
  if (!name) fail(back, "Le nom est obligatoire.");
  const src = source(back, formData);
  const [c] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id), isNull(courses.deletedAt)));
  if (!c) fail("/", "Cours introuvable.");
  await db.insert(chapters).values({ userId: user.id, courseId: c.id, name, ...src });
  redirect(`/cours/${c.id}`);
}

export async function createTopic(formData: FormData) {
  const user = await requireUser();
  const courseId = formData.get("courseId");
  const chapterId = formData.get("chapterId");
  if (!isUuid(courseId)) fail("/", "Cours introuvable.");
  const back = `/notions/nouveau?cours=${courseId}${isUuid(chapterId) ? `&chapitre=${chapterId}` : ""}`;
  const name = cleanText(formData.get("name"), 160);
  if (!name) fail(back, "Le nom est obligatoire.");
  const [c] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id), isNull(courses.deletedAt)));
  if (!c) fail("/", "Cours introuvable.");
  let chapter: string | null = null;
  if (isUuid(chapterId)) {
    const [ch] = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.userId, user.id),
          eq(chapters.courseId, c.id),
          isNull(chapters.deletedAt),
        ),
      );
    if (!ch) fail(back, "Chapitre introuvable dans ce cours.");
    chapter = ch.id;
  }
  const [t] = await db
    .insert(topics)
    .values({ userId: user.id, courseId: c.id, chapterId: chapter, name })
    .returning({ id: topics.id });
  redirect(`/notions/${t.id}`);
}
