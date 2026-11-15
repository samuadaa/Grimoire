import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, EmptyState, PageTitle, SectionTitle, btnDangerOutline, btnOutline, btnPrimary, cardCls, plural } from "@/components/ui";
import { getDomain, getTree } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function PageDomaine({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const domain = await getDomain(user.id, id);
  if (!domain) notFound();
  const courses = (await getTree(user.id)).find((d) => d.id === id)?.courses ?? [];

  return (
    <div>
      <Breadcrumb items={[{ label: "Bibliothèque", href: "/" }]} />
      <PageTitle>{domain.name}</PageTitle>
      <div className="flex flex-wrap gap-2.5">
        <Link href={`/cours/nouveau?domaine=${id}`} className={btnPrimary}>
          Créer un cours
        </Link>
        <Link href={`/renommer?type=domaine&id=${id}`} className={btnOutline}>
          Renommer
        </Link>
        <Link href={`/corbeille/mettre?type=domaine&id=${id}`} className={btnDangerOutline}>
          Mettre à la corbeille
        </Link>
      </div>
      <SectionTitle>Cours</SectionTitle>
      {courses.length === 0 ? (
        <EmptyState title="Ajoutez votre premier cours" text="Ce domaine n’a pas encore de cours." />
      ) : (
        <div className="grid max-w-[900px] grid-cols-3 gap-3.5">
          {courses.map((c) => (
            <Link key={c.id} href={`/cours/${c.id}`} className={`${cardCls} block px-[18px] py-4 hover:border-[#1f7366]`}>
              <div className="font-semibold text-[#1a2340]">{c.name}</div>
              <div className="text-sm text-[#4d576b]">
                {c.children.length ? plural(c.children.length, "sous-cours", "sous-cours") : "Pas de sous-cours"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
