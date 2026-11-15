import Link from "next/link";
import { notFound } from "next/navigation";
import { renameItem } from "@/app/actions";
import {
  Breadcrumb, Field, FormError, PageTitle, SourceFields, btnOutline, btnPrimary, cardCls, inputCls,
} from "@/components/ui";
import { getChapter, getCourse, getCourseContent, getDomain, getTopic } from "@/db/queries";
import { ITEM_LABEL, isItemType } from "@/lib/items";
import { requireUser } from "@/lib/session";
import { isUuid } from "@/lib/validation";

export default async function Renommer({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { type, id, erreur } = await searchParams;
  if (!isItemType(type) || type === "note" || !isUuid(id)) notFound();

  let name = "";
  let back = "/";
  let src: { label: string | null; url: string | null } | null = null;
  let chapterChoices: { id: string; name: string }[] | null = null;
  let chapterId: string | null = null;

  if (type === "domaine") {
    const d = await getDomain(user.id, id);
    if (!d) notFound();
    name = d.name;
    back = `/domaines/${id}`;
  } else if (type === "cours") {
    const c = await getCourse(user.id, id);
    if (!c) notFound();
    name = c.name;
    back = `/cours/${id}`;
    src = { label: c.sourceLabel, url: c.sourceUrl };
  } else if (type === "chapitre") {
    const c = await getChapter(user.id, id);
    if (!c) notFound();
    name = c.name;
    back = `/cours/${c.courseId}`;
    src = { label: c.sourceLabel, url: c.sourceUrl };
  } else {
    const t = await getTopic(user.id, id);
    if (!t) notFound();
    name = t.name;
    back = `/notions/${id}`;
    chapterId = t.chapterId;
    chapterChoices = (await getCourseContent(user.id, t.courseId)).chapters.map((c) => ({ id: c.id, name: c.name }));
  }

  return (
    <div className="max-w-[640px]">
      <Breadcrumb items={[{ label: "Bibliothèque", href: "/" }, { label: name, href: back }]} />
      <PageTitle>{type === "notion" ? "Renommer ou déplacer" : "Renommer"}</PageTitle>
      <form action={renameItem}>
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={id} />
        <div className={`${cardCls} flex flex-col gap-[18px] p-7`}>
          <FormError message={erreur} />
          <Field label={`Nom (${ITEM_LABEL[type].toLowerCase()})`} htmlFor="name">
            <input id="name" name="name" required maxLength={160} defaultValue={name} className={inputCls} />
          </Field>
          {chapterChoices && (
            <Field label="Chapitre" hint="(facultatif)" htmlFor="chapterId">
              <select id="chapterId" name="chapterId" defaultValue={chapterId ?? ""} className={inputCls}>
                <option value="">Sans chapitre</option>
                {chapterChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {src && <SourceFields label={src.label} url={src.url} />}
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className={btnPrimary}>Enregistrer</button>
          <Link href={back} className={btnOutline}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
