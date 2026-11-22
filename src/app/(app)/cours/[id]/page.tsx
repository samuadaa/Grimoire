import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb, EmptyState, PageTitle, SectionTitle, SourceLine, btnDangerOutline, btnOutline, btnPrimary, cardCls, plural,
} from "@/components/ui";
import { getCourse, getCourseContent, getDomain } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function PageCours({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const course = await getCourse(user.id, id);
  if (!course) notFound();
  const [domain, parent, content] = await Promise.all([
    getDomain(user.id, course.domainId),
    course.parentId ? getCourse(user.id, course.parentId) : Promise.resolve(null),
    getCourseContent(user.id, id),
  ]);
  if (!domain) notFound();
  const isSub = course.parentId !== null;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          ...(parent ? [{ label: parent.name, href: `/cours/${parent.id}` }] : []),
        ]}
      />
      <PageTitle>{course.name}</PageTitle>
      <div className="mb-2"><SourceLine label={course.sourceLabel} url={course.sourceUrl} /></div>
      <div className="flex flex-wrap gap-2.5">
        {!isSub && <Link href={`/cours/nouveau?parent=${id}`} className={btnOutline}>Créer un sous-cours</Link>}
        <Link href={`/chapitres/nouveau?cours=${id}`} className={btnOutline}>Créer un chapitre</Link>
        <Link href={`/notes/nouvelle?cours=${id}`} className={btnPrimary}>Créer une note</Link>
        <Link href={`/notions/nouveau?cours=${id}`} className={btnOutline}>Créer une notion</Link>
        <Link href={`/renommer?type=cours&id=${id}`} className={btnOutline}>Renommer</Link>
        <Link href={`/corbeille/mettre?type=cours&id=${id}`} className={btnDangerOutline}>Mettre à la corbeille</Link>
      </div>

      {!isSub && content.subcourses.length > 0 && (
        <>
          <SectionTitle>Sous-cours</SectionTitle>
          <div className="grid max-w-[900px] grid-cols-3 gap-3.5">
            {content.subcourses.map((s) => (
              <Link key={s.id} href={`/cours/${s.id}`} className={`${cardCls} block px-[18px] py-4 hover:border-[#1f7366]`}>
                <div className="font-semibold text-[#1a2340]">{s.name}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {content.chapters.length > 0 && (
        <>
          <SectionTitle>Chapitres</SectionTitle>
          <div className="flex max-w-[900px] flex-col gap-3.5">
            {content.chapters.map((ch) => (
              <section key={ch.id} className={`${cardCls} overflow-hidden`}>
                <div className="flex items-center justify-between gap-4 border-b border-[#dfe3ea] bg-[#f7f8fa] px-[18px] py-4">
                  <div>
                    <div className="text-base font-semibold text-[#1a2340]">{ch.name}</div>
                    <SourceLine label={ch.sourceLabel} url={ch.sourceUrl} />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/notes/nouvelle?cours=${id}&chapitre=${ch.id}`} className={`${btnOutline} !px-3.5 !py-[7px]`}>
                      Ajouter une note
                    </Link>
                    <Link href={`/notions/nouveau?cours=${id}&chapitre=${ch.id}`} className={`${btnOutline} !px-3.5 !py-[7px]`}>
                      Ajouter une notion
                    </Link>
                    <Link href={`/renommer?type=chapitre&id=${ch.id}`} className={`${btnOutline} !px-3.5 !py-[7px]`}>
                      Renommer
                    </Link>
                    <Link href={`/corbeille/mettre?type=chapitre&id=${ch.id}`} className={`${btnDangerOutline} !px-3.5 !py-[7px]`}>
                      Corbeille
                    </Link>
                  </div>
                </div>
                {ch.topics.length === 0 ? (
                  <p className="px-[18px] py-3.5 text-sm text-[#4d576b]">Aucune notion dans ce chapitre.</p>
                ) : (
                  ch.topics.map((t) => <TopicRow key={t.id} id={t.id} name={t.name} count={t.noteCount} />)
                )}
              </section>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Sans chapitre</SectionTitle>
      {content.loose.length === 0 ? (
        <EmptyState title="Aucune notion" text="Créez une notion pour commencer." />
      ) : (
        <div className={`${cardCls} max-w-[900px] overflow-hidden`}>
          {content.loose.map((t) => <TopicRow key={t.id} id={t.id} name={t.name} count={t.noteCount} />)}
        </div>
      )}
      {content.chapters.length === 0 && (
        <p className="mt-3.5 max-w-[900px] text-sm text-[#4d576b]">
          Ce cours n’a pas de chapitre : ses notions s’affichent ici. Créez un chapitre quand vous en avez besoin.
        </p>
      )}
    </div>
  );
}

function TopicRow({ id, name, count }: { id: string; name: string; count: number }) {
  return (
    <Link
      href={`/notions/${id}`}
      className="flex items-center justify-between gap-4 border-t border-[#dfe3ea] px-[18px] py-3.5 first:border-t-0 hover:bg-[#f7f8fa]"
    >
      <span className="font-semibold text-[#1a2340]">{name}</span>
      <span className="text-sm text-[#4d576b]">{plural(count, "note")}</span>
    </Link>
  );
}
