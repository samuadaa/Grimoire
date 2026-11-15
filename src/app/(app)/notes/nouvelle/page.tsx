import { notFound } from "next/navigation";
import { createNote } from "@/app/actions";
import NoteForm from "@/components/NoteForm";
import { Breadcrumb, PageTitle } from "@/components/ui";
import { getCourse, getDomain, getTopic, getTypes } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function NouvelleNote({
  searchParams,
}: {
  searchParams: Promise<{ notion?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { notion, erreur } = await searchParams;
  if (!isUuid(notion)) notFound();
  const topic = await getTopic(user.id, notion);
  if (!topic) notFound();
  const course = await getCourse(user.id, topic.courseId);
  if (!course) notFound();
  const [domain, types] = await Promise.all([getDomain(user.id, course.domainId), getTypes(user.id)]);
  if (!domain) notFound();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          { label: course.name, href: `/cours/${course.id}` },
          { label: topic.name, href: `/notions/${topic.id}` },
        ]}
      />
      <PageTitle>Nouvelle note</PageTitle>
      <NoteForm
        types={types.map((t) => ({ id: t.id, name: t.name, fields: t.fields }))}
        hidden={{ topicId: topic.id }}
        action={createNote}
        error={erreur}
        cancelHref={`/notions/${topic.id}`}
        submitLabel="Enregistrer la note"
      />
    </div>
  );
}
