import { notFound } from "next/navigation";
import { updateNote } from "@/app/actions";
import NoteForm from "@/components/NoteForm";
import { Breadcrumb, PageTitle } from "@/components/ui";
import { db } from "@/db";
import { getNote, getNoteTags, getTopic, getTopicOptions, getTypes } from "@/db/queries";
import { deleteDraft, getDraft } from "@/lib/drafts";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function ModifierNote({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { erreur } = await searchParams;
  if (!isUuid(id)) notFound();
  const row = await getNote(user.id, id);
  if (!row) notFound();
  const [topic, types, tagNames, topicOptions] = await Promise.all([
    getTopic(user.id, row.note.topicId),
    getTypes(user.id),
    getNoteTags(user.id, id),
    getTopicOptions(user.id),
  ]);
  if (!topic) notFound();
  // Un brouillon plus ancien que la note enregistrée n'a plus d'intérêt : on le supprime.
  const draftKey = `edit:${id}`;
  let draft = await getDraft(db, user.id, draftKey);
  if (draft && draft.updatedAt.getTime() <= row.note.updatedAt.getTime()) {
    await deleteDraft(db, user.id, draftKey);
    draft = null;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: topic.name, href: `/notions/${topic.id}` },
          { label: row.note.title || "Note", href: `/notes/${id}` },
        ]}
      />
      <PageTitle>Modifier la note</PageTitle>
      <NoteForm
        types={types.map((t) => ({ id: t.id, name: t.name, fields: t.fields }))}
        hidden={{ noteId: id }}
        topics={topicOptions}
        currentTopicId={row.note.topicId}
        initial={{
          typeId: row.note.typeId,
          title: row.note.title,
          body: row.note.body as object,
          fields: row.note.fields as Record<string, string | string[]>,
          tags: tagNames,
          sourceLabel: row.note.sourceLabel,
          sourceUrl: row.note.sourceUrl,
        }}
        action={updateNote}
        draftKey={draftKey}
        draft={draft ? { data: draft.data, savedAt: draft.updatedAt.toISOString() } : undefined}
        error={erreur}
        cancelHref={`/notes/${id}`}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}
