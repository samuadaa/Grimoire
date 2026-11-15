import Link from "next/link";
import { notFound } from "next/navigation";
import { trashAction } from "@/app/actions";
import { Breadcrumb, FormError, PageTitle, btnDanger, btnOutline, cardCls, plural } from "@/components/ui";
import { db } from "@/db";
import { ITEM_LABEL, isItemType } from "@/lib/items";
import { requireUser } from "@/lib/session";
import { describeItem, parentHref, previewCounts } from "@/lib/trash";
import { isUuid } from "@/lib/validation";

export default async function MettreALaCorbeille({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { type, id, erreur } = await searchParams;
  if (!isItemType(type) || !isUuid(id)) notFound();
  const row = await describeItem(db, user.id, type, id);
  if (!row || row.deletedAt) notFound();
  const [counts, back] = await Promise.all([previewCounts(db, user.id, type, id), parentHref(db, user.id, type, id)]);

  const parts = [
    counts.cours ? plural(counts.cours, "cours", "cours") : "",
    counts.chapitres ? plural(counts.chapitres, "chapitre") : "",
    counts.notions ? plural(counts.notions, "notion") : "",
    counts.notes ? plural(counts.notes, "note") : "",
  ].filter(Boolean);
  const blocked = type === "notion" && row.isDefault;

  return (
    <div className="max-w-[640px]">
      <Breadcrumb items={[{ label: "Bibliothèque", href: "/" }]} />
      <PageTitle>Mettre à la corbeille ?</PageTitle>
      <div className={`${cardCls} flex flex-col gap-3 p-7`}>
        <FormError message={erreur} />
        <p className="text-[16px] text-[#1a2340]">
          {ITEM_LABEL[type]} : <strong className="font-semibold">« {row.name} »</strong>
        </p>
        {blocked ? (
          <p className="text-sm text-[#4d576b]">La notion « Non classé » ne peut pas être supprimée seule : elle suit son cours.</p>
        ) : (
          <>
            <p className="text-sm text-[#3a4358]">
              Cela retire de la bibliothèque : {parts.join(", ")}. Vous pourrez tout restaurer depuis la corbeille.
            </p>
          </>
        )}
      </div>
      <div className="mt-5 flex gap-2.5">
        {!blocked && (
          <form action={trashAction}>
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="id" value={id} />
            <button className={btnDanger}>Mettre à la corbeille</button>
          </form>
        )}
        <Link href={back === "/" ? "/" : back} className={btnOutline}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
