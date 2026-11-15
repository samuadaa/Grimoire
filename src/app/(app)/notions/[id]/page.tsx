import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, EmptyState, PageTitle, TypeBadge, btnDangerOutline, btnOutline, btnPrimary, cardCls } from "@/components/ui";
import { getChapter, getCourse, getDomain, getTopic, listNotes } from "@/db/queries";
import { plainText } from "@/lib/richtext";
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
  const [domain, parent, chapter, rows] = await Promise.all([
    getDomain(user.id, course.domainId),
    course.parentId ? getCourse(user.id, course.parentId) : Promise.resolve(null),
    topic.chapterId ? getChapter(user.id, topic.chapterId) : Promise.resolve(null),
    listNotes(user.id, id),
  ]);
  if (!domain) notFound();
  const create = `/notes/nouvelle?notion=${id}`;

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
      <div className="flex flex-wrap gap-2.5">
        <Link href={create} className={btnPrimary}>
          Créer une note
        </Link>
        <Link href={`/renommer?type=notion&id=${id}`} className={btnOutline}>
          Renommer ou déplacer
        </Link>
        {!topic.isDefault && (
          <Link href={`/corbeille/mettre?type=notion&id=${id}`} className={btnDangerOutline}>
            Mettre à la corbeille
          </Link>
        )}
      </div>

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            title="Écrivez votre première note"
            text="Les notes de cette notion apparaissent ici."
            action={
              <Link href={create} className={btnPrimary}>
                Créer une note
              </Link>
            }
          />
        ) : (
          <div className={`${cardCls} max-w-[900px] overflow-hidden`}>
            {rows.map(({ note, type }) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block border-t border-[#dfe3ea] px-[18px] py-3.5 first:border-t-0 hover:bg-[#f7f8fa]"
              >
                <div className="flex items-center gap-2.5">
                  <strong className="font-semibold text-[#1a2340]">{note.title || "Note sans titre"}</strong>
                  <TypeBadge name={type.name} color={type.color} />
                </div>
                <div className="mt-0.5 text-sm text-[#4d576b]">{plainText(note.body, 140)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
