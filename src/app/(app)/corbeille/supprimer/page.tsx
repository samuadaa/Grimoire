import Link from "next/link";
import { notFound } from "next/navigation";
import { purgeAction } from "@/app/actions";
import { Breadcrumb, PageTitle, btnDanger, btnOutline, cardCls } from "@/components/ui";
import { db } from "@/db";
import { ITEM_LABEL, isItemType } from "@/lib/items";
import { requireUser } from "@/lib/session";
import { describeItem } from "@/lib/trash";
import { isUuid } from "@/lib/validation";

export default async function SupprimerDefinitivement({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const user = await requireUser();
  const { type, id } = await searchParams;
  if (!isItemType(type) || !isUuid(id)) notFound();
  const row = await describeItem(db, user.id, type, id);
  if (!row || !row.deletedAt) notFound();

  return (
    <div className="max-w-[640px]">
      <Breadcrumb items={[{ label: "Corbeille", href: "/corbeille" }]} />
      <PageTitle>Supprimer définitivement ?</PageTitle>
      <div className={`${cardCls} flex flex-col gap-3 p-7`}>
        <p className="text-[16px] text-[#1a2340]">
          {ITEM_LABEL[type]} : <strong className="font-semibold">« {row.name} »</strong>
        </p>
        <p className="text-sm text-[#791f1f]">
          Cette action est irréversible : l’élément, tout ce qu’il contient et ses images seront effacés.
        </p>
      </div>
      <div className="mt-5 flex gap-2.5">
        <form action={purgeAction}>
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <button className={btnDanger}>Supprimer définitivement</button>
        </form>
        <Link href="/corbeille" className={btnOutline}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
