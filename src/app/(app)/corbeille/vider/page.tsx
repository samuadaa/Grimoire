import Link from "next/link";
import { emptyTrashAction } from "@/app/actions";
import { Breadcrumb, PageTitle, btnDanger, btnOutline, cardCls, plural } from "@/components/ui";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { listTrash } from "@/lib/trash";

export default async function ViderLaCorbeille() {
  const user = await requireUser();
  const entries = await listTrash(db, user.id);

  return (
    <div className="max-w-[640px]">
      <Breadcrumb items={[{ label: "Corbeille", href: "/corbeille" }]} />
      <PageTitle>Vider la corbeille ?</PageTitle>
      <div className={`${cardCls} flex flex-col gap-3 p-7`}>
        <p className="text-[16px] text-[#1a2340]">{plural(entries.length, "élément")} seront supprimés définitivement.</p>
        <p className="text-sm text-[#791f1f]">
          Cette action est irréversible. Les images envoyées mais jamais enregistrées dans une note, depuis plus de 24 h, sont aussi effacées.
        </p>
      </div>
      <div className="mt-5 flex gap-2.5">
        <form action={emptyTrashAction}>
          <button className={btnDanger}>Vider la corbeille</button>
        </form>
        <Link href="/corbeille" className={btnOutline}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
