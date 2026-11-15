"use server";

import { del } from "@vercel/blob";
import { and, eq, inArray, isNull, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chapters, courses, domains, images, noteTags, noteTypes, notes, tags, topics } from "@/db/schema";
import { isItemType } from "@/lib/items";
import { requireUser } from "@/lib/session";
import { emptyTrash, parentHref, purgeItem, restoreItem, trashItem } from "@/lib/trash";
import { imageIds, parseBody } from "@/lib/richtext";
import { buildSearchText } from "@/lib/search";
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

// ---------------------------------------------------------------- notes

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Lit et vérifie le formulaire d'une note (création ou modification).
async function readNoteForm(formData: FormData, userId: string, back: string) {
  const typeId = formData.get("typeId");
  if (!isUuid(typeId)) fail(back, "Choisissez un type de note.");
  const [type] = await db
    .select()
    .from(noteTypes)
    .where(and(eq(noteTypes.id, typeId), eq(noteTypes.userId, userId)));
  if (!type) fail(back, "Type de note introuvable.");

  const hasTerm = type.fields.some((f) => f.key === "term");
  const title = cleanText(formData.get("title"), 200) ?? "";
  if (hasTerm && !title) fail(back, "Le terme est obligatoire.");

  const parsed = parseBody(formData.get("body"));
  if (!parsed.ok) fail(back, "Le contenu de la note est invalide ou trop long.");

  const fields: Record<string, string | string[]> = {};
  for (const f of type.fields) {
    if (f.key === "term") continue;
    const raw = formData.get(`f_${f.key}`);
    if (typeof raw !== "string") continue;
    if (f.kind === "list") {
      const items = raw
        .split("\n")
        .map((l) => l.trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 20);
      if (items.length) fields[f.key] = items;
    } else if (f.kind === "code") {
      const code = raw.slice(0, 20000);
      if (code.trim()) fields[f.key] = code;
    } else {
      const v = cleanText(raw, 300);
      if (v) fields[f.key] = v;
    }
  }

  const src = source(back, formData);
  const tagNames = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 20);

  return {
    typeId: type.id,
    title,
    body: parsed.doc,
    fields,
    searchText: buildSearchText(title, fields, parsed.doc),
    tagNames,
    ...src,
  };
}

async function saveTags(tx: Tx, userId: string, noteId: string, names: string[]) {
  await tx.delete(noteTags).where(eq(noteTags.noteId, noteId));
  if (names.length === 0) return;
  await tx.insert(tags).values(names.map((name) => ({ userId, name }))).onConflictDoNothing();
  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, names)));
  await tx.insert(noteTags).values(rows.map((r) => ({ noteId, tagId: r.id })));
}

// Associe à la note les images qu'elle contient, et libère celles qu'elle n'utilise plus.
async function linkImages(tx: Tx, userId: string, noteId: string, body: object) {
  const ids = imageIds(body);
  await tx
    .update(images)
    .set({ noteId: null })
    .where(and(eq(images.userId, userId), eq(images.noteId, noteId)));
  if (ids.length === 0) return;
  await tx
    .update(images)
    .set({ noteId })
    .where(and(eq(images.userId, userId), inArray(images.id, ids)));
}

export async function createNote(formData: FormData) {
  const user = await requireUser();
  const topicId = formData.get("topicId");
  if (!isUuid(topicId)) fail("/", "Notion introuvable.");
  const back = `/notes/nouvelle?notion=${topicId}`;
  const [topic] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, user.id), isNull(topics.deletedAt)));
  if (!topic) fail("/", "Notion introuvable.");

  const f = await readNoteForm(formData, user.id, back);
  const id = await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ p: max(notes.position) })
      .from(notes)
      .where(eq(notes.topicId, topic.id));
    const [row] = await tx
      .insert(notes)
      .values({
        userId: user.id,
        topicId: topic.id,
        typeId: f.typeId,
        title: f.title,
        body: f.body,
        fields: f.fields,
        searchText: f.searchText,
        position: (last?.p ?? -1) + 1,
        sourceLabel: f.sourceLabel,
        sourceUrl: f.sourceUrl,
      })
      .returning({ id: notes.id });
    await saveTags(tx, user.id, row.id, f.tagNames);
    await linkImages(tx, user.id, row.id, f.body);
    return row.id;
  });
  redirect(`/notes/${id}`);
}

export async function updateNote(formData: FormData) {
  const user = await requireUser();
  const noteId = formData.get("noteId");
  if (!isUuid(noteId)) fail("/", "Note introuvable.");
  const back = `/notes/${noteId}/modifier`;
  const [note] = await db
    .select({ id: notes.id, topicId: notes.topicId })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!note) fail("/", "Note introuvable.");

  // Déplacement vers une autre notion (facultatif).
  const target = formData.get("topicId");
  let moveTo: string | null = null;
  if (isUuid(target) && target !== note.topicId) {
    const [t] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, target), eq(topics.userId, user.id), isNull(topics.deletedAt)));
    if (!t) fail(back, "Notion de destination introuvable.");
    moveTo = t.id;
  }

  const f = await readNoteForm(formData, user.id, back);
  await db.transaction(async (tx) => {
    let move: { topicId: string; position: number } | object = {};
    if (moveTo) {
      const [last] = await tx.select({ p: max(notes.position) }).from(notes).where(eq(notes.topicId, moveTo));
      move = { topicId: moveTo, position: (last?.p ?? -1) + 1 };
    }
    await tx
      .update(notes)
      .set({
        ...move,
        typeId: f.typeId,
        title: f.title,
        body: f.body,
        fields: f.fields,
        searchText: f.searchText,
        sourceLabel: f.sourceLabel,
        sourceUrl: f.sourceUrl,
      })
      .where(and(eq(notes.id, note.id), eq(notes.userId, user.id)));
    await saveTags(tx, user.id, note.id, f.tagNames);
    await linkImages(tx, user.id, note.id, f.body);
  });
  redirect(`/notes/${note.id}`);
}

// ---------------------------------------------------- renommer, corbeille

// Renomme un élément (et change la source d'un cours ou d'un chapitre, ou le chapitre d'une notion).
export async function renameItem(formData: FormData) {
  const user = await requireUser();
  const type = formData.get("type");
  const id = formData.get("id");
  if (!isItemType(type) || type === "note" || !isUuid(id)) fail("/", "Élément introuvable.");
  const back = `/renommer?type=${type}&id=${id}`;
  const name = cleanText(formData.get("name"), 160);
  if (!name) fail(back, "Le nom est obligatoire.");

  if (type === "domaine") {
    const r = await db.update(domains).set({ name }).where(and(eq(domains.id, id), eq(domains.userId, user.id), isNull(domains.deletedAt))).returning({ id: domains.id });
    if (!r.length) fail("/", "Élément introuvable.");
    redirect(`/domaines/${id}`);
  }
  if (type === "cours") {
    const src = source(back, formData);
    const r = await db.update(courses).set({ name, ...src }).where(and(eq(courses.id, id), eq(courses.userId, user.id), isNull(courses.deletedAt))).returning({ id: courses.id });
    if (!r.length) fail("/", "Élément introuvable.");
    redirect(`/cours/${id}`);
  }
  if (type === "chapitre") {
    const src = source(back, formData);
    const r = await db.update(chapters).set({ name, ...src }).where(and(eq(chapters.id, id), eq(chapters.userId, user.id), isNull(chapters.deletedAt))).returning({ courseId: chapters.courseId });
    if (!r.length) fail("/", "Élément introuvable.");
    redirect(`/cours/${r[0].courseId}`);
  }
  // notion : nom, et chapitre (du même cours) ou « sans chapitre »
  const [topic] = await db.select({ courseId: topics.courseId }).from(topics).where(and(eq(topics.id, id), eq(topics.userId, user.id), isNull(topics.deletedAt)));
  if (!topic) fail("/", "Élément introuvable.");
  const chapterRaw = formData.get("chapterId");
  let chapterId: string | null = null;
  if (isUuid(chapterRaw)) {
    const [ch] = await db.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.id, chapterRaw), eq(chapters.userId, user.id), eq(chapters.courseId, topic.courseId), isNull(chapters.deletedAt)));
    if (!ch) fail(back, "Chapitre introuvable dans ce cours.");
    chapterId = ch.id;
  }
  await db.update(topics).set({ name, chapterId }).where(and(eq(topics.id, id), eq(topics.userId, user.id)));
  redirect(`/notions/${id}`);
}

export async function trashAction(formData: FormData) {
  const user = await requireUser();
  const type = formData.get("type");
  const id = formData.get("id");
  if (!isItemType(type) || !isUuid(id)) fail("/", "Élément introuvable.");
  const back = await parentHref(db, user.id, type, id);
  const r = await trashItem(db, user.id, type, id);
  if (!r.ok) fail(`/corbeille/mettre?type=${type}&id=${id}`, r.message);
  redirect(back);
}

export async function restoreAction(formData: FormData) {
  const user = await requireUser();
  const type = formData.get("type");
  const id = formData.get("id");
  if (!isItemType(type) || !isUuid(id)) fail("/corbeille", "Élément introuvable.");
  const r = await restoreItem(db, user.id, type, id);
  if (!r.ok) fail("/corbeille", r.message);
  redirect("/corbeille?info=" + encodeURIComponent("Élément restauré."));
}

async function deleteFiles(pathnames: string[]) {
  if (pathnames.length === 0) return;
  try {
    await del(pathnames);
  } catch {
    /* le fichier restera dans le stockage ; il ne compte plus dans la base */
  }
}

export async function purgeAction(formData: FormData) {
  const user = await requireUser();
  const type = formData.get("type");
  const id = formData.get("id");
  if (!isItemType(type) || !isUuid(id)) fail("/corbeille", "Élément introuvable.");
  const r = await purgeItem(db, user.id, type, id);
  if (!r.ok) fail("/corbeille", r.message);
  await deleteFiles(r.pathnames);
  redirect("/corbeille?info=" + encodeURIComponent("Élément supprimé définitivement."));
}

export async function emptyTrashAction() {
  const user = await requireUser();
  await deleteFiles(await emptyTrash(db, user.id));
  redirect("/corbeille?info=" + encodeURIComponent("Corbeille vidée."));
}
