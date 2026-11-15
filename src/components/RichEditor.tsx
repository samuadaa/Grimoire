"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useRef, useState } from "react";
import { extensions } from "@/lib/editor-extensions";
import { IMAGE_TYPES } from "@/lib/images";
import { uploadImage } from "@/lib/upload-client";
import "./editor.css";

type Props = { initial: object; onChange: (json: string) => void; label: string };

const isImage = (f: File) => IMAGE_TYPES.includes(f.type);

export default function RichEditor({ initial, onChange, label }: Props) {
  const [status, setStatus] = useState("");
  const current = useRef<Editor | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function insertImages(files: File[]) {
    for (const file of files) {
      setStatus("Envoi de l’image…");
      try {
        const src = await uploadImage(file);
        current.current?.chain().focus().setImage({ src }).run();
        setStatus("");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Échec de l’envoi de l’image.");
      }
    }
  }

  const editor = useEditor({
    extensions,
    content: initial,
    immediatelyRender: false, // nécessaire avec Next.js (rendu sur le serveur)
    editorProps: {
      attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true" },
      // Ctrl+V d'une capture d'écran, ou glisser-déposer d'un fichier image.
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isImage);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter(isImage);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      current.current = editor;
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });

  const on = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      h3: editor?.isActive("heading", { level: 3 }) ?? false,
      bullet: editor?.isActive("bulletList") ?? false,
      ordered: editor?.isActive("orderedList") ?? false,
      code: editor?.isActive("code") ?? false,
      codeBlock: editor?.isActive("codeBlock") ?? false,
      quote: editor?.isActive("blockquote") ?? false,
      callout: editor?.isActive("callout") ?? false,
    }),
  });

  if (!editor || !on) return <div className="h-40 rounded-lg border border-[#c9cfda] bg-white" />;
  const chain = () => editor.chain().focus();

  const Btn = ({ label, active, run, style }: { label: string; active: boolean; run: () => void; style?: string }) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={run}
      className={`rounded-md border px-2.5 py-1 text-[13px] ${style ?? ""} ${
        active ? "border-[#1f7366] bg-[#e3f1ec] text-[#14574a]" : "border-[#c9cfda] bg-white text-[#3a4358]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rich-editor overflow-hidden rounded-lg border border-[#c9cfda] bg-white">
      <div className="flex flex-wrap gap-1.5 border-b border-[#dfe3ea] bg-[#f7f8fa] p-2" role="toolbar" aria-label="Mise en forme">
        <Btn label="Gras" style="font-semibold" active={on.bold} run={() => chain().toggleBold().run()} />
        <Btn label="Italique" style="italic" active={on.italic} run={() => chain().toggleItalic().run()} />
        <Btn label="Titre" active={on.h2} run={() => chain().toggleHeading({ level: 2 }).run()} />
        <Btn label="Sous-titre" active={on.h3} run={() => chain().toggleHeading({ level: 3 }).run()} />
        <Btn label="Liste" active={on.bullet} run={() => chain().toggleBulletList().run()} />
        <Btn label="Liste numérotée" active={on.ordered} run={() => chain().toggleOrderedList().run()} />
        <Btn label="Code" active={on.code} run={() => chain().toggleCode().run()} />
        <Btn label="Bloc de code" active={on.codeBlock} run={() => chain().toggleCodeBlock().run()} />
        <Btn label="Citation" active={on.quote} run={() => chain().toggleBlockquote().run()} />
        <Btn label="Encadré" active={on.callout} run={() => chain().toggleCallout().run()} />
        <Btn label="Image" active={false} run={() => picker.current?.click()} />
        <input
          ref={picker}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choisir une image"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).filter(isImage);
            e.target.value = "";
            if (files.length) void insertImages(files);
          }}
        />
      </div>
      <p role="status" aria-live="polite" className={`px-3 text-[13px] ${status ? "py-1.5 text-[#791f1f]" : ""}`}>
        {status}
      </p>
      <div className="rich text-[16px] text-[#1a2340]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
