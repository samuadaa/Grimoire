import { notFound } from "next/navigation";
import { Breadcrumb, EmptyState, PageTitle } from "@/components/ui";
import { getChapter, getCourse, getDomain, getTopic } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function PageNotion({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const topic = await getTopic(user.id, id);
  if (!topic) notFound();
  const course = await getCourse(user.id, topic.courseId);
  if (!course) notFound();
  const [domain, parent, chapter] = await Promise.all([
    getDomain(user.id, course.domainId),
    course.parentId ? getCourse(user.id, course.parentId) : Promise.resolve(null),
    topic.chapterId ? getChapter(user.id, topic.chapterId) : Promise.resolve(null),
  ]);
  if (!domain) notFound();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          ...(parent ? [{ label: parent.name, href: `/cours/${parent.id}` }] : []),
          { label: course.name, href: `/cours/${course.id}` },
          ...(chapter ? [{ label: chapter.name }] : []),
        ]}
      />
      <PageTitle>{topic.name}</PageTitle>
      <EmptyState
        title="Aucune note pour l’instant"
        text="La création des notes arrive à l’étape suivante."
      />
    </div>
  );
}
