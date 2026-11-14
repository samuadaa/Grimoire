import { createDomain } from "@/app/actions";
import { Breadcrumb, Field, FormError, PageTitle, btnOutline, btnPrimary, cardCls, inputCls } from "@/components/ui";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export default async function NouveauDomaine({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  await requireUser();
  const { erreur } = await searchParams;
  return (
    <div className="max-w-[640px]">
      <Breadcrumb items={[{ label: "Bibliothèque", href: "/" }]} />
      <PageTitle>Nouveau domaine</PageTitle>
      <form action={createDomain}>
        <div className={`${cardCls} flex flex-col gap-4 p-7`}>
          <FormError message={erreur} />
          <Field label="Nom du domaine" htmlFor="name">
            <input id="name" name="name" required maxLength={120} className={inputCls} />
          </Field>
          <p className="text-sm text-[#4d576b]">Un domaine regroupe vos cours, par exemple Programmation ou Anglais.</p>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className={btnPrimary}>Créer le domaine</button>
          <Link href="/" className={btnOutline}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
