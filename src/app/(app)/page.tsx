import Link from "next/link";
import { EmptyState, PageTitle, btnOutline, btnPrimary, cardCls, plural } from "@/components/ui";
import { getTree } from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function Bibliotheque() {
  const user = await requireUser();
  const tree = await getTree(user.id);

  return (
    <div>
      <PageTitle>Votre bibliothèque</PageTitle>
      {tree.length === 0 ? (
        <EmptyState
          title="Créez votre premier domaine"
          text="Un domaine regroupe vos cours, par exemple Programmation ou Anglais."
          action={
            <Link href="/domaines/nouveau" className={btnPrimary}>
              Nouveau domaine
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid max-w-[900px] grid-cols-3 gap-3.5">
            {tree.map((d) => {
              const subs = d.courses.reduce((n, c) => n + c.children.length, 0);
              return (
                <Link key={d.id} href={`/domaines/${d.id}`} className={`${cardCls} block px-5 py-4 hover:border-[#1f7366]`}>
                  <div className="font-semibold text-[#1a2340]">{d.name}</div>
                  <div className="text-sm text-[#4d576b]">
                    {d.courses.length === 0
                      ? "Aucun cours"
                      : `${plural(d.courses.length, "cours", "cours")}${subs ? ` · ${plural(subs, "sous-cours", "sous-cours")}` : ""}`}
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href="/domaines/nouveau" className={`${btnOutline} mt-[18px]`}>
            Nouveau domaine
          </Link>
        </>
      )}
    </div>
  );
}
