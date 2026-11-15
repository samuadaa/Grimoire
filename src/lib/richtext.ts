type Json = { type?: string; text?: string; content?: Json[]; attrs?: Record<string, unknown>; marks?: { type?: string }[] };

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const NODES = new Set([
  "doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem",
  "blockquote", "codeBlock", "callout", "hardBreak", "horizontalRule", "image",
]);
const MARKS = new Set(["bold", "italic", "code", "strike"]);
const IMAGE_SRC = /^\/api\/images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEPTH = 20;

// Ne garde que les éléments connus : une image doit venir de notre stockage, rien d'autre.
function clean(n: Json, depth: number): Json | null {
  if (!n || typeof n.type !== "string" || !NODES.has(n.type) || depth > MAX_DEPTH) return null;
  if (n.type === "image") {
    const src = n.attrs?.src;
    return typeof src === "string" && IMAGE_SRC.test(src) ? { type: "image", attrs: { src, alt: "" } } : null;
  }
  const out: Json = { type: n.type };
  if (n.type === "text") {
    if (typeof n.text !== "string") return null;
    out.text = n.text;
  }
  if (n.type === "heading") out.attrs = { level: n.attrs?.level === 3 ? 3 : 2 };
  if (n.type === "codeBlock" && typeof n.attrs?.language === "string") out.attrs = { language: n.attrs.language.slice(0, 30) };
  if (n.type === "orderedList") out.attrs = { start: typeof n.attrs?.start === "number" ? n.attrs.start : 1 };
  if (Array.isArray(n.marks)) {
    const marks = n.marks.filter((m) => m && typeof m.type === "string" && MARKS.has(m.type)).map((m) => ({ type: m.type }));
    if (marks.length) out.marks = marks;
  }
  if (Array.isArray(n.content)) {
    out.content = n.content.map((c) => clean(c, depth + 1)).filter((c): c is Json => c !== null);
  }
  return out;
}

export function sanitizeDoc(doc: unknown): object | null {
  const cleaned = clean(doc as Json, 0);
  return cleaned && cleaned.type === "doc" && Array.isArray(cleaned.content) ? cleaned : null;
}

// Vérifie le contenu envoyé par l'éditeur avant de l'enregistrer.
export function parseBody(raw: unknown): { ok: true; doc: object } | { ok: false } {
  if (typeof raw !== "string" || raw.length === 0) return { ok: true, doc: EMPTY_DOC };
  if (raw.length > 300_000) return { ok: false };
  try {
    const doc = sanitizeDoc(JSON.parse(raw));
    if (doc) return { ok: true, doc };
  } catch {
    /* contenu invalide */
  }
  return { ok: false };
}

// Identifiants des images utilisées dans un contenu.
export function imageIds(doc: unknown): string[] {
  const ids = new Set<string>();
  const walk = (n: Json) => {
    if (n.type === "image" && typeof n.attrs?.src === "string") {
      const m = IMAGE_SRC.test(n.attrs.src) ? n.attrs.src.split("/").pop() : null;
      if (m) ids.add(m);
    }
    n.content?.forEach(walk);
  };
  if (doc && typeof doc === "object") walk(doc as Json);
  return [...ids];
}

// Texte brut d'un contenu, pour les extraits (liste des notes, recherche).
export function plainText(doc: unknown, max = 160): string {
  const parts: string[] = [];
  const walk = (n: Json) => {
    if (parts.join(" ").length > max) return;
    if (typeof n.text === "string") parts.push(n.text);
    n.content?.forEach(walk);
  };
  if (doc && typeof doc === "object") walk(doc as Json);
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
