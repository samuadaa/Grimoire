import Link from "next/link";
import { Breadcrumb, EmptyState, PageTitle, TypeBadge, cardCls } from "@/components/ui";
import { db } from "@/db";
import { getTopicOptions } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { type Segment, highlight, parseQuery, rawText, searchNotes, searchStructure } from "@/lib/search";

function Marked({ parts }: { parts: Segment[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded-sm bg-[#fdf1c4] px-0.5 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export default async function Recherche({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const user = await requireUser();
  const { q, type } = await searchParams;
  const terms = parseQuery(q);
  const query = typeof q === "string" ? q.slice(0, 200) : "";

  const [rows, structure, topicOptions] = await Promise.all([
    searchNotes(db, user.id, terms),
    searchStructure(db, user.id, terms),
    getTopicOptions(user.id),
  ]);
  const path = new Map(topicOptions.map((t) => [t.id, t.label]));

  // Titres d'abord, puis les plus récentes.
  const titled = (r: (typeof rows)[number]) => (terms.every((t) => r.note.searchText.split("\n")[0]?.includes(t)) ? 0 : 1);
  const sorted = [...rows].sort((a, b) => titled(a) - titled(b));
  const counts = new Map<string, number>();
  for (const r of sorted) counts.set(r.type.name, (counts.get(r.type.name) ?? 0) + 1);
  const shown = type ? sorted.filter((r) => r.type.name === type) : sorted;
  const href = (t?: string) => `/recherche?q=${encodeURIComponent(query)}${t ? `&type=${encodeURIComponent(t)}` : ""}`;

  return (
    <div className="max-w-[900px]">
      <Breadcrumb items={[{ label: "Bibliothèque", href: "/" }]} />
      <PageTitle>Recherche</PageTitle>

      {terms.length === 0 ? (
        <EmptyState title="Que cherchez-vous ?" text="Tapez un ou plusieurs mots dans la barre du haut. Les accents et les majuscules sont ignorés." />
      ) : (
        <>
          <p className="mb-3.5 text-sm text-[#4d576b]" aria-live="polite">
            {sorted.length + structure.length === 0
              ? `Aucun résultat pour « ${query} »`
              : `${sorted.length} ${sorted.length === 1 ? "note" : "notes"}${structure.length ? ` et ${structure.length} ${structure.length === 1 ? "élément" : "éléments"} de la bibliothèque` : ""} pour « ${query} »`}
          </p>

          {counts.size > 1 && (
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
              <Link href={href()} aria-current={!type ? "true" : undefined} className={`rounded-full border px-3 py-1 text-[13px] ${!type ? "border-[#1f7366] bg-[#1f7366] font-semibold text-white" : "border-[#c9cfda] bg-white text-[#3a4358]"}`}>
                Tous les types
              </Link>
              {[...counts].map(([name, n]) => (
                <Link key={name} href={href(name)} aria-current={type === name ? "true" : undefined} className={`rounded-full border px-3 py-1 text-[13px] ${type === name ? "border-[#1f7366] bg-[#1f7366] font-semibold text-white" : "border-[#c9cfda] bg-white text-[#3a4358]"}`}>
                  {name} ({n})
                </Link>
              ))}
            </div>
          )}

          {structure.length > 0 && !type && (
            <section className="mb-5" aria-label="Cours, chapitres et notions">
              <h2 className="mb-2 text-sm font-semibold text-[#4d576b]">Dans la bibliothèque</h2>
              <div className={`${cardCls} overflow-hidden`}>
                {structure.map((s) => (
                  <Link key={`${s.kind}-${s.id}`} href={s.href} className="flex items-center justify-between gap-3 border-t border-[#dfe3ea] px-[18px] py-3 first:border-t-0 hover:bg-[#f7f8fa]">
                    <span className="min-w-0">
                      <strong className="font-semibold text-[#1a2340]">
                        <Marked parts={highlight(s.name, terms, 200)} />
                      </strong>
                      {s.path && <span className="ml-2 text-sm text-[#4d576b]">{s.path}</span>}
                    </span>
                    <span className="flex-none rounded-md bg-[#eef0f4] px-2.5 py-0.5 text-xs font-semibold text-[#3a4358]">{s.kind}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {shown.length > 0 && (
            <section aria-label="Notes">
              <h2 className="mb-2 text-sm font-semibold text-[#4d576b]">Notes</h2>
              <div className={`${cardCls} overflow-hidden`}>
                {shown.map(({ note, type: t }) => {
                  const text = rawText(note.title, (note.fields ?? {}) as Record<string, unknown>, note.body);
                  const body = text.slice(note.title.length).trimStart();
                  return (
                    <Link key={note.id} href={`/notes/${note.id}`} className="block border-t border-[#dfe3ea] px-[18px] py-3.5 first:border-t-0 hover:bg-[#f7f8fa]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <strong className="font-semibold text-[#1a2340]">
                          {note.title ? <Marked parts={highlight(note.title, terms, 200)} /> : "Note sans titre"}
                        </strong>
                        <TypeBadge name={t.name} color={t.color} />
                      </div>
                      <div className="mt-0.5 text-[13px] text-[#4d576b]">{path.get(note.topicId)}</div>
                      <p className="mt-1 text-[15px] leading-6 text-[#1a2340]">
                        <Marked parts={highlight(body, terms)} />
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
