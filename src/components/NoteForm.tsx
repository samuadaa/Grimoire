"use client";

import Link from "next/link";
import { useState } from "react";
import RichEditor from "@/components/RichEditor";
import { FormError, btnOutline, btnPrimary, cardCls, inputCls } from "@/components/ui";
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
}: {
  types: FormType[];
  hidden: Record<string, string>;
  initial?: NoteInitial;
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [typeId, setTypeId] = useState(
    initial?.typeId ?? types.find((t) => t.name === "Libre")?.id ?? types[0]?.id ?? "",
  );
  const [body, setBody] = useState(JSON.stringify(initial?.body ?? EMPTY_DOC));
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
