import Link from "next/link";
import { restoreAction } from "@/app/actions";
import { EmptyState, FormError, PageTitle, btnDangerOutline, btnOutline, cardCls } from "@/components/ui";
import { db } from "@/db";
import { ITEM_LABEL } from "@/lib/items";
import { requireUser } from "@/lib/session";
import { listTrash } from "@/lib/trash";

export default async function Corbeille({
  searchParams,
}: {
  searchParams: Promise<{ info?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { info, erreur } = await searchParams;
  const entries = await listTrash(db, user.id);

  return (
    <div>
      <PageTitle>Corbeille</PageTitle>
      <div className="mb-4 flex max-w-[900px] items-center justify-between gap-4">
        <p className="text-sm text-[#4d576b]">Rien n’est supprimé définitivement sans votre confirmation.</p>
        {entries.length > 0 && (
          <Link href="/corbeille/vider" className={btnDangerOutline}>
            Vider la corbeille
          </Link>
        )}
      </div>
      <div className="mb-4 max-w-[900px] space-y-2.5" aria-live="polite">
        <FormError message={erreur} />
        {info && (
          <p role="status" className="rounded-lg border border-[#b5d9c9] bg-[#e3f1ec] px-3.5 py-2.5 text-sm text-[#14574a]">
            {info}
          </p>
        )}
      </div>
      {entries.length === 0 ? (
        <div className="max-w-[900px]">
          <EmptyState title="La corbeille est vide" text="Les éléments que vous retirez arrivent ici." />
        </div>
      ) : (
        <div className={`${cardCls} max-w-[900px] overflow-hidden`}>
          {entries.map((e) => (
            <div key={`${e.type}-${e.id}`} className="flex items-center justify-between gap-4 border-t border-[#dfe3ea] px-[18px] py-3.5 first:border-t-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <strong className="truncate font-semibold text-[#1a2340]">{e.name}</strong>
                  <span className="rounded-md bg-[#eef0f4] px-2.5 py-0.5 text-xs font-semibold text-[#3a4358]">{ITEM_LABEL[e.type]}</span>
                </div>
                <div className="mt-0.5 text-sm text-[#4d576b]">
                  {e.path && `${e.path} · `}supprimé le {e.deletedAt.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <div className="flex flex-none gap-2">
                <form action={restoreAction}>
                  <input type="hidden" name="type" value={e.type} />
                  <input type="hidden" name="id" value={e.id} />
                  <button className={`${btnOutline} !px-3.5 !py-[7px]`}>Restaurer</button>
                </form>
                <Link href={`/corbeille/supprimer?type=${e.type}&id=${e.id}`} className={`${btnDangerOutline} !px-3.5 !py-[7px]`}>
                  Supprimer définitivement
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
