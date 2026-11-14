import Link from "next/link";
import { notFound } from "next/navigation";
import { createTopic } from "@/app/actions";
import { Breadcrumb, Field, FormError, PageTitle, btnOutline, btnPrimary, cardCls, inputCls } from "@/components/ui";
import { getChapter, getCourse, getDomain } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function NouvelleNotion({
  searchParams,
}: {
  searchParams: Promise<{ cours?: string; chapitre?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { cours, chapitre, erreur } = await searchParams;
  if (!isUuid(cours)) notFound();
  const course = await getCourse(user.id, cours);
  if (!course) notFound();
  const domain = await getDomain(user.id, course.domainId);
  if (!domain) notFound();
  const chapter = isUuid(chapitre) ? await getChapter(user.id, chapitre) : null;
  if (chapter && chapter.courseId !== course.id) notFound();

  return (
    <div className="max-w-[640px]">
      <Breadcrumb
        items={[
          { label: domain.name, href: `/domaines/${domain.id}` },
          { label: course.name, href: `/cours/${course.id}` },
        ]}
      />
      <PageTitle>Nouvelle notion</PageTitle>
      <form action={createTopic}>
        <input type="hidden" name="courseId" value={course.id} />
        {chapter && <input type="hidden" name="chapterId" value={chapter.id} />}
        <div className={`${cardCls} flex flex-col gap-[18px] p-7`}>
          <FormError message={erreur} />
          <Field label="Nom de la notion" htmlFor="name">
            <input id="name" name="name" required maxLength={160} className={inputCls} />
          </Field>
          <Field label="Cours" htmlFor="c">
            <input id="c" readOnly value={course.name} className={`${inputCls} bg-[#f3f4f6]`} />
          </Field>
          <Field label="Chapitre" hint="(facultatif)" htmlFor="ch">
            <input id="ch" readOnly value={chapter ? chapter.name : "Sans chapitre"} className={`${inputCls} bg-[#f3f4f6]`} />
          </Field>
          <p className="text-sm text-[#4d576b]">
            Une notion créée depuis le formulaire d’une note arrivera ici automatiquement.
          </p>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className={btnPrimary}>Créer la notion</button>
          <Link href={`/cours/${course.id}`} className={btnOutline}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
