"use client";

import Link from "next/link";
import { useState } from "react";
import RichEditor from "@/components/RichEditor";
import { FormError, btnOutline, btnPrimary, cardCls, inputCls } from "@/components/ui";
import { foldText } from "@/lib/fold";
import { EMPTY_DOC } from "@/lib/richtext";

export type FormType = {
  id: string;
  name: string;
  fields: { key: string; label: string; kind: string }[];
};

export type NoteInitial = {
  typeId: string;
  title: string;
  body: object;
  fields: Record<string, string | string[]>;
  tags: string[];
  sourceLabel: string | null;
  sourceUrl: string | null;
};

// Où ranger la note : cours (fixe), chapitre facultatif, notion existante, nouvelle ou vide (« Non classé »).
export type Placement = {
  courseId: string;
  courseName: string;
  chapters: { id: string; name: string }[];
  topics: { id: string; name: string; chapterId: string | null }[];
  chapterId: string | null;
  notionName: string;
};

const EDITOR_LABEL: Record<string, string> = {
  "Code + explication": "Explication",
  Vocabulaire: "Illustrations",
  Nuance: "Nuance",
  Définition: "Définition",
  Règle: "Règle",
  Remarque: "Remarque",
};

export default function NoteForm({
  types,
  hidden,
  initial,
  action,
  error,
  cancelHref,
  submitLabel,
  topics,
  currentTopicId,
  placement,
}: {
  types: FormType[];
  hidden: Record<string, string>;
  initial?: NoteInitial;
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  cancelHref: string;
  submitLabel: string;
  topics?: { id: string; label: string }[];
  currentTopicId?: string;
  placement?: Placement;
}) {
  const [typeId, setTypeId] = useState(
    initial?.typeId ?? types.find((t) => t.name === "Libre")?.id ?? types[0]?.id ?? "",
  );
  const [body, setBody] = useState(JSON.stringify(initial?.body ?? EMPTY_DOC));
  const [chapterId, setChapterId] = useState(placement?.chapterId ?? "");
  const [notion, setNotion] = useState(placement?.notionName ?? "");
  const inScope = (placement?.topics ?? []).filter((t) => (t.chapterId ?? "") === chapterId);
  const wanted = foldText(notion.trim());
  const notionState = !wanted
    ? "Cette note sera rangée dans « Non classé »."
    : !chapterId && wanted === foldText("Non classé")
      ? "Cette note sera rangée dans « Non classé »."
      : inScope.some((t) => foldText(t.name) === wanted)
        ? "Notion existante."
        : "Nouvelle notion : elle sera créée avec la note.";
  const type = types.find((t) => t.id === typeId);
  const hasTerm = type?.fields.some((f) => f.key === "term") ?? false;
  const extra = type?.fields.filter((f) => f.key !== "term") ?? [];

  const value = (key: string) => {
    const v = initial?.fields[key];
    return Array.isArray(v) ? v.join("\n") : (v ?? "");
  };

  return (
    <form action={action} className="max-w-[860px]">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="body" value={body} />

      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-semibold text-[#1a2340]">Type de note</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <label
              key={t.id}
              className={`cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#1f7366] ${
                t.id === typeId
                  ? "border-[#1f7366] bg-[#1f7366] font-semibold text-white"
                  : "border-[#c9cfda] bg-white text-[#3a4358]"
              }`}
            >
              <input
                type="radio"
                name="typeId"
                value={t.id}
                checked={t.id === typeId}
                onChange={() => setTypeId(t.id)}
                className="sr-only"
              />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`${cardCls} flex flex-col gap-5 p-7`}>
        <FormError message={error} />

        {placement && (
          <div className="flex flex-col gap-3.5 rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-4">
            <input type="hidden" name="courseId" value={placement.courseId} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="coursNom" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
                  Cours
                </label>
                <input id="coursNom" readOnly value={placement.courseName} className={`${inputCls} bg-[#eef0f4]`} />
              </div>
              <div>
                <label htmlFor="chapterId" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
                  Chapitre <span className="font-normal text-[#4d576b]">(facultatif)</span>
                </label>
                <select
                  id="chapterId"
                  name="chapterId"
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sans chapitre</option>
                  {placement.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="notion" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
                  Notion <span className="font-normal text-[#4d576b]">(facultatif)</span>
                </label>
                <input
                  id="notion"
                  name="notion"
                  value={notion}
                  onChange={(e) => setNotion(e.target.value)}
                  list="notions-existantes"
                  maxLength={160}
                  autoComplete="off"
                  placeholder="Choisir ou taper un nom"
                  aria-describedby="notion-aide"
                  className={inputCls}
                />
                <datalist id="notions-existantes">
                  {inScope.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <p id="notion-aide" role="status" aria-live="polite" className="text-[13px] text-[#4d576b]">
              {notionState}
            </p>
          </div>
        )}

        {topics && (
          <div>
            <label htmlFor="topicId" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Notion <span className="font-normal text-[#4d576b]">(changez-la pour déplacer la note)</span>
            </label>
            <select id="topicId" name="topicId" defaultValue={currentTopicId} className={inputCls}>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
            {hasTerm ? "Terme" : "Titre"} {!hasTerm && <span className="font-normal text-[#4d576b]">(facultatif)</span>}
          </label>
          <input id="title" name="title" defaultValue={initial?.title ?? ""} maxLength={200} required={hasTerm} className={inputCls} />
        </div>

        {extra.map((f) => (
          <div key={`${typeId}-${f.key}`}>
            <label htmlFor={`f_${f.key}`} className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              {f.label} {f.kind === "list" && <span className="font-normal text-[#4d576b]">(une valeur par ligne)</span>}
            </label>
            {f.kind === "text" ? (
              <input id={`f_${f.key}`} name={`f_${f.key}`} defaultValue={value(f.key)} maxLength={300} className={inputCls} />
            ) : (
              <textarea
                id={`f_${f.key}`}
                name={`f_${f.key}`}
                defaultValue={value(f.key)}
                rows={f.kind === "code" ? 7 : 3}
                spellCheck={f.kind !== "code"}
                className={`block w-full rounded-lg border border-[#c9cfda] bg-white px-3.5 py-2.5 text-[15px] text-[#1a2340] ${
                  f.kind === "code" ? "font-mono text-sm" : ""
                }`}
              />
            )}
          </div>
        ))}

        <div>
          <div className="mb-1.5 text-sm font-semibold text-[#1a2340]">{EDITOR_LABEL[type?.name ?? ""] ?? "Texte"}</div>
          <RichEditor
            key={typeId === initial?.typeId ? "initial" : "free"}
            initial={initial?.body ?? EMPTY_DOC}
            onChange={setBody}
            label={EDITOR_LABEL[type?.name ?? ""] ?? "Texte"}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="tags" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Tags <span className="font-normal text-[#4d576b]">(séparés par des virgules)</span>
            </label>
            <input id="tags" name="tags" defaultValue={initial?.tags.join(", ") ?? ""} className={inputCls} />
          </div>
          <div>
            <label htmlFor="sourceLabel" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Source <span className="font-normal text-[#4d576b]">(facultative)</span>
            </label>
            <input id="sourceLabel" name="sourceLabel" defaultValue={initial?.sourceLabel ?? ""} maxLength={120} className={inputCls} />
          </div>
          <div>
            <label htmlFor="sourceUrl" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Lien <span className="font-normal text-[#4d576b]">(facultatif)</span>
            </label>
            <input id="sourceUrl" name="sourceUrl" defaultValue={initial?.sourceUrl ?? ""} maxLength={500} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5">
        <button className={btnPrimary}>{submitLabel}</button>
        <Link href={cancelHref} className={btnOutline}>
          Annuler
        </Link>
      </div>
    </form>
  );
}
