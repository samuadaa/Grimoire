import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createCourse } from "@/app/actions";
import {
  Breadcrumb, Field, FormError, PageTitle, SourceFields, btnOutline, btnPrimary, cardCls, inputCls,
} from "@/components/ui";
import { getCourse, getDomain } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

type Props = { searchParams: Promise<{ domaine?: string; parent?: string; erreur?: string }> };

export default async function NouveauCours({ searchParams }: Props) {
  const user = await requireUser();
  const { domaine, parent, erreur } = await searchParams;

  const parentCourse = isUuid(parent) ? await getCourse(user.id, parent) : null;
  if (isUuid(parent) && (!parentCourse || parentCourse.parentId !== null)) notFound();
  const domainId = parentCourse ? parentCourse.domainId : isUuid(domaine) ? domaine : null;
  if (!domainId) redirect("/");
  const domain = await getDomain(user.id, domainId);
  if (!domain) notFound();

  const isSub = parentCourse !== null;
  const cancel = parentCourse ? `/cours/${parentCourse.id}` : `/domaines/${domain.id}`;

  return (
    <div className="max-w-[640px]">
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          ...(parentCourse ? [{ label: parentCourse.name, href: `/cours/${parentCourse.id}` }] : []),
        ]}
      />
      <PageTitle>{isSub ? "Nouveau sous-cours" : "Nouveau cours"}</PageTitle>
      <form action={createCourse}>
        <input type="hidden" name="domainId" value={domain.id} />
        {parentCourse && <input type="hidden" name="parentId" value={parentCourse.id} />}
        <div className={`${cardCls} flex flex-col gap-[18px] p-7`}>
          <FormError message={erreur} />
          <Field label={isSub ? "Nom du sous-cours" : "Nom du cours"} htmlFor="name">
            <input id="name" name="name" required maxLength={120} className={inputCls} />
          </Field>
          <Field label={isSub ? "Cours parent" : "Domaine"} htmlFor="ctx">
            <input id="ctx" readOnly value={parentCourse ? parentCourse.name : domain.name} className={`${inputCls} bg-[#f3f4f6]`} />
          </Field>
          <SourceFields />
          <p className="text-sm text-[#4d576b]">
            {isSub
              ? "Un sous-cours ne peut pas en contenir d’autres. Vous arrivez dans le sous-cours, vide."
              : "Le cours démarre vide. Vous pourrez y ajouter des sous-cours, des chapitres et des notions."}
          </p>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className={btnPrimary}>{isSub ? "Créer le sous-cours" : "Créer le cours"}</button>
          <Link href={cancel} className={btnOutline}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
