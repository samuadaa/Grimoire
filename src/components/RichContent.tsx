import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { extensions } from "@/lib/editor-extensions";
import "./editor.css";

// Affichage d'un contenu en lecture, sur le serveur : pas d'éditeur chargé.
export default function RichContent({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object") return null;
  return (
    <div className="rich text-[16px] text-[#1a2340]">
      {renderToReactElement({ extensions, content: doc as never })}
    </div>
  );
}
