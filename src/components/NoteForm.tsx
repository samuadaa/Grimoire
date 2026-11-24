"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { discardDraftAction, saveDraftAction } from "@/app/actions";
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
  draftKey,
  draft,
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
  draftKey: string;
  draft?: { data: Record<string, string>; savedAt: string };
}) {
  const [typeId, setTypeId] = useState(
    initial?.typeId ?? types.find((t) => t.name === "Libre")?.id ?? types[0]?.id ?? "",
  );
  const [body, setBody] = useState(JSON.stringify(initial?.body ?? EMPTY_DOC));
  const [chapterId, setChapterId] = useState(placement?.chapterId ?? "");
  const [notion, setNotion] = useState(placement?.notionName ?? "");
  const [cur, setCur] = useState<NoteInitial | undefined>(initial); // contenu affiché (change si on restaure un brouillon)
  const [rev, setRev] = useState(0);
  const [topicSel, setTopicSel] = useState(currentTopicId ?? "");
  const [showDraft, setShowDraft] = useState(Boolean(draft));
  const [draftLabel, setDraftLabel] = useState("");
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const lastSaved = useRef("");
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
    const v = cur?.fields[key];
    return Array.isArray(v) ? v.join("\n") : (v ?? "");
  };

  const snapshot = () => {
    const data: Record<string, string> = {};
    if (formRef.current) {
      for (const [k, v] of new FormData(formRef.current).entries()) {
        if (typeof v === "string" && !k.startsWith("$") && k !== "draftKey" && k !== "noteId" && k !== "courseId") data[k] = v;
      }
    }
    return data;
  };

  // Toutes les 5 secondes, et quand l'onglet passe en arrière-plan : le texte en cours est mis dans un brouillon à part.
  useEffect(() => {
    lastSaved.current = JSON.stringify(snapshot());
    async function flush() {
      const data = snapshot();
      const json = JSON.stringify(data);
      if (json === lastSaved.current) return;
      setStatus("Enregistrement du brouillon…");
      try {
        const r = await saveDraftAction(draftKey, data);
        if (r.ok) {
          lastSaved.current = json;
          setStatus(r.saved ? `Brouillon enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "");
        } else {
          setStatus("Brouillon non enregistré.");
        }
      } catch {
        setStatus("Brouillon non enregistré : connexion indisponible.");
      }
    }
    const timer = setInterval(flush, 5000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [draftKey, rev]);

  useEffect(() => {
    if (draft) setDraftLabel(new Date(draft.savedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }));
  }, [draft]);

  function restoreDraft() {
    if (!draft) return;
    const d = draft.data;
    let doc: object = EMPTY_DOC;
    try {
      doc = d.body ? JSON.parse(d.body) : EMPTY_DOC;
    } catch {
      /* contenu illisible : on garde un texte vide */
    }
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(d)) if (k.startsWith("f_")) fields[k.slice(2)] = v;
    const t = types.some((x) => x.id === d.typeId) ? d.typeId : typeId;
    setCur({
      typeId: t,
      title: d.title ?? "",
      body: doc,
      fields,
      tags: (d.tags ?? "").split(",").map((x) => x.trim()).filter(Boolean),
      sourceLabel: d.sourceLabel || null,
      sourceUrl: d.sourceUrl || null,
    });
    setTypeId(t);
    setBody(JSON.stringify(doc));
    if (placement) {
      setChapterId(placement.chapters.some((c) => c.id === d.chapterId) ? d.chapterId : "");
      setNotion(d.notion ?? "");
    }
    if (topics && topics.some((x) => x.id === d.topicId)) setTopicSel(d.topicId);
    setRev((r) => r + 1);
    setShowDraft(false);
  }

  async function dropDraft() {
    setShowDraft(false);
    try {
      await discardDraftAction(draftKey);
    } catch {
      /* sans conséquence : le brouillon sera remplacé au prochain enregistrement */
    }
  }

  return (
    <form ref={formRef} action={action} className="max-w-[860px]">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="draftKey" value={draftKey} />
      {draft && showDraft && (
        <div role="region" aria-label="Brouillon retrouvé" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e8d3a6] bg-[#faeeda] px-4 py-3 text-sm text-[#633806]">
          <p>Un brouillon enregistré{draftLabel ? ` le ${draftLabel}` : ""} a été retrouvé.</p>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="rounded-lg bg-[#1f7366] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#195f54]">
              Restaurer
            </button>
            <button type="button" onClick={dropDraft} className="rounded-lg border border-[#633806] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#633806]">
              Ignorer
            </button>
          </div>
        </div>
      )}

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

      <div key={rev} className={`${cardCls} flex flex-col gap-5 p-7`}>
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
            <select id="topicId" name="topicId" value={topicSel} onChange={(e) => setTopicSel(e.target.value)} className={inputCls}>
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
          <input id="title" name="title" defaultValue={cur?.title ?? ""} maxLength={200} required={hasTerm} className={inputCls} />
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
            key={rev}
            initial={cur?.body ?? EMPTY_DOC}
            onChange={setBody}
            label={EDITOR_LABEL[type?.name ?? ""] ?? "Texte"}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="tags" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Tags <span className="font-normal text-[#4d576b]">(séparés par des virgules)</span>
            </label>
            <input id="tags" name="tags" defaultValue={cur?.tags.join(", ") ?? ""} className={inputCls} />
          </div>
          <div>
            <label htmlFor="sourceLabel" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Source <span className="font-normal text-[#4d576b]">(facultative)</span>
            </label>
            <input id="sourceLabel" name="sourceLabel" defaultValue={cur?.sourceLabel ?? ""} maxLength={120} className={inputCls} />
          </div>
          <div>
            <label htmlFor="sourceUrl" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
              Lien <span className="font-normal text-[#4d576b]">(facultatif)</span>
            </label>
            <input id="sourceUrl" name="sourceUrl" defaultValue={cur?.sourceUrl ?? ""} maxLength={500} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5">
        <button className={btnPrimary}>{submitLabel}</button>
        <Link href={cancelHref} className={btnOutline}>
          Annuler
        </Link>
        <p role="status" aria-live="polite" className="self-center text-sm text-[#4d576b]">
          {status}
        </p>
      </div>
    </form>
  );
}
