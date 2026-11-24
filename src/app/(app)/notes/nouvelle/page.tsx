import { notFound } from "next/navigation";
import { createNote } from "@/app/actions";
import NoteForm from "@/components/NoteForm";
import { Breadcrumb, PageTitle } from "@/components/ui";
import { db } from "@/db";
import { getChapter, getCourse, getCourseContent, getDomain, getTopic, getTypes } from "@/db/queries";
import { getDraft } from "@/lib/drafts";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

// /notes/nouvelle?cours=…            depuis un cours ou un sous-cours
// /notes/nouvelle?cours=…&chapitre=… depuis un chapitre
// /notes/nouvelle?notion=…           depuis une notion (chapitre et notion déjà remplis)
export default async function NouvelleNote({
  searchParams,
}: {
  searchParams: Promise<{ cours?: string; chapitre?: string; notion?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { cours, chapitre, notion, erreur } = await searchParams;

  let courseId: string | null = isUuid(cours) ? cours : null;
  let chapterId: string | null = null;
  let notionName = "";
  let cancelHref = "/";

  if (isUuid(notion)) {
    const topic = await getTopic(user.id, notion);
    if (!topic) notFound();
    courseId = topic.courseId;
    chapterId = topic.chapterId;
    notionName = topic.isDefault ? "" : topic.name;
    cancelHref = `/notions/${topic.id}`;
  }
  if (!courseId) notFound();
  const course = await getCourse(user.id, courseId);
  if (!course) notFound();
  if (!isUuid(notion)) {
    if (isUuid(chapitre)) {
      const ch = await getChapter(user.id, chapitre);
      if (ch && ch.courseId === course.id) chapterId = ch.id;
    }
    cancelHref = `/cours/${course.id}`;
  }

  const [domain, parent, content, types] = await Promise.all([
    getDomain(user.id, course.domainId),
    course.parentId ? getCourse(user.id, course.parentId) : Promise.resolve(null),
    getCourseContent(user.id, course.id),
    getTypes(user.id),
  ]);
  if (!domain) notFound();
  const draftKey = `new:${course.id}`;
  const draft = await getDraft(db, user.id, draftKey);

  const topics = [
    ...content.loose.map((t) => ({ id: t.id, name: t.name, chapterId: null as string | null })),
    ...content.chapters.flatMap((c) => c.topics.map((t) => ({ id: t.id, name: t.name, chapterId: c.id as string | null }))),
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          ...(parent ? [{ label: parent.name, href: `/cours/${parent.id}` }] : []),
          { label: course.name, href: `/cours/${course.id}` },
        ]}
      />
      <PageTitle>Nouvelle note</PageTitle>
      <NoteForm
        types={types.map((t) => ({ id: t.id, name: t.name, fields: t.fields }))}
        hidden={{}}
        placement={{
          courseId: course.id,
          courseName: course.name,
          chapters: content.chapters.map((c) => ({ id: c.id, name: c.name })),
          topics,
          chapterId,
          notionName,
        }}
        action={createNote}
        draftKey={draftKey}
        draft={draft ? { data: draft.data, savedAt: draft.updatedAt.toISOString() } : undefined}
        error={erreur}
        cancelHref={cancelHref}
        submitLabel="Enregistrer la note"
      />
    </div>
  );
}
