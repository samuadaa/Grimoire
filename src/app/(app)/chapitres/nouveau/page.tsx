import Link from "next/link";
import { notFound } from "next/navigation";
import { createChapter } from "@/app/actions";
import {
  Breadcrumb, Field, FormError, PageTitle, SourceFields, btnOutline, btnPrimary, cardCls, inputCls,
} from "@/components/ui";
import { getCourse, getDomain } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function NouveauChapitre({
  searchParams,
}: {
  searchParams: Promise<{ cours?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { cours, erreur } = await searchParams;
  if (!isUuid(cours)) notFound();
  const course = await getCourse(user.id, cours);
  if (!course) notFound();
  const domain = await getDomain(user.id, course.domainId);
  if (!domain) notFound();

  return (
    <div className="max-w-[640px]">
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          { label: course.name, href: `/cours/${course.id}` },
        ]}
      />
      <PageTitle>Nouveau chapitre</PageTitle>
      <form action={createChapter}>
        <input type="hidden" name="courseId" value={course.id} />
        <div className={`${cardCls} flex flex-col gap-[18px] p-7`}>
          <FormError message={erreur} />
          <Field label="Nom du chapitre" htmlFor="name">
            <input id="name" name="name" required maxLength={160} className={inputCls} />
          </Field>
          <Field label="Dans" htmlFor="ctx">
            <input id="ctx" readOnly value={course.name} className={`${inputCls} bg-[#f3f4f6]`} />
          </Field>
          <SourceFields />
          <p className="text-sm text-[#4d576b]">
            La source du chapitre s’applique à ses notes, sauf si une note a la sienne.
          </p>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className={btnPrimary}>Créer le chapitre</button>
          <Link href={`/cours/${course.id}`} className={btnOutline}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
