import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import RichContent from "@/components/RichContent";
import {
  Breadcrumb, SourceLine, TypeBadge, btnOutline, cardCls, titleFont,
} from "@/components/ui";
import { getChapter, getCourse, getDomain, getNote, getNoteTags, getTopic } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function PageNote({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const row = await getNote(user.id, id);
  if (!row) notFound();
  const { note, type } = row;
  const topic = await getTopic(user.id, note.topicId);
  if (!topic) notFound();
  const course = await getCourse(user.id, topic.courseId);
  if (!course) notFound();
  const [domain, parent, chapter, tagNames] = await Promise.all([
    getDomain(user.id, course.domainId),
    course.parentId ? getCourse(user.id, course.parentId) : Promise.resolve(null),
    topic.chapterId ? getChapter(user.id, topic.chapterId) : Promise.resolve(null),
    getNoteTags(user.id, id),
  ]);
  if (!domain) notFound();

  // La note a sa propre source, sinon elle hérite de celle du chapitre.
  const own = note.sourceLabel || note.sourceUrl;
  const src = own
    ? { label: note.sourceLabel, url: note.sourceUrl, inherited: false }
    : chapter && (chapter.sourceLabel || chapter.sourceUrl)
      ? { label: chapter.sourceLabel, url: chapter.sourceUrl, inherited: true }
      : null;

  const fields = (note.fields ?? {}) as Record<string, string | string[]>;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          ...(parent ? [{ label: parent.name, href: `/cours/${parent.id}` }] : []),
          { label: course.name, href: `/cours/${course.id}` },
          ...(chapter ? [{ label: chapter.name }] : []),
          { label: topic.name, href: `/notions/${topic.id}` },
        ]}
      />
      <div className="mb-1.5 mt-2 flex flex-wrap items-center gap-3.5">
        <h1 className="text-4xl font-semibold text-[#1a2340]" style={titleFont}>
          {note.title || "Note sans titre"}
        </h1>
        <TypeBadge name={type.name} color={type.color} />
      </div>
      <div className="mb-4 text-[13px] text-[#4d576b]">
        Modifiée le {note.updatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
      </div>
      <div className="mb-5 flex gap-2.5">
        <Link href={`/notes/${id}/modifier`} className={btnOutline}>
          Modifier
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-8">
        <article className={`${cardCls} px-9 py-8`}>
          {type.fields
            .filter((f) => f.key !== "term" && fields[f.key] !== undefined)
            .map((f) => {
              const v = fields[f.key];
              return (
                <div key={f.key} className="mb-5">
                  <div className="mb-1 flex items-center justify-between text-[13px] font-semibold text-[#4d576b]">
                    <span>{f.label}</span>
                    {f.kind === "code" && typeof v === "string" && <CopyButton text={v} />}
                  </div>
                  {Array.isArray(v) ? (
                    <ul className="list-disc pl-6 text-[16px] leading-7">
                      {v.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  ) : f.kind === "code" ? (
                    <pre className="overflow-x-auto rounded-lg bg-[#1a2340] p-4 font-mono text-sm leading-6 text-[#e8ecf5]">
                      {v}
                    </pre>
                  ) : (
                    <div className="text-[16px] leading-7 text-[#1a2340]">{v}</div>
                  )}
                </div>
              );
            })}
          <RichContent doc={note.body} />
        </article>

        <aside className="flex flex-col gap-3.5">
          <section className={`${cardCls} px-[18px] py-4`}>
            <h2 className="mb-2.5 text-[13px] font-semibold text-[#4d576b]">Tags</h2>
            {tagNames.length === 0 ? (
              <p className="text-sm text-[#4d576b]">Aucun tag.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tagNames.map((t) => (
                  <span key={t} className="rounded-full bg-[#eef0f4] px-2.5 py-1 text-[13px] text-[#3a4358]">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>
          {src && (
            <section className={`${cardCls} px-[18px] py-4`}>
              <h2 className="mb-2 text-[13px] font-semibold text-[#4d576b]">Source</h2>
              <SourceLine label={src.label} url={src.url} />
              {src.inherited && <div className="mt-1 text-[13px] text-[#4d576b]">Héritée du chapitre</div>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
