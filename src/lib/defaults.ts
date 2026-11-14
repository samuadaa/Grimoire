import { db } from "@/db";
import { noteTypes } from "@/db/schema";
import { eq } from "drizzle-orm";

// Types de notes de départ, créés une fois pour chaque nouveau compte.
// "fields" décrit les champs propres au type (le texte riche est toujours là).
export const DEFAULT_NOTE_TYPES = [
  { name: "Définition", color: "blue", fields: [{ key: "term", label: "Terme", kind: "text" }] },
  { name: "Règle", color: "amber", fields: [] },
  { name: "Remarque", color: "gray", fields: [] },
  {
    name: "Code + explication",
    color: "violet",
    fields: [
      { key: "language", label: "Langage", kind: "text" },
      { key: "code", label: "Code", kind: "code" },
    ],
  },
  {
    name: "Cas d’usage",
    color: "green",
    fields: [
      { key: "situation", label: "Situation", kind: "text" },
      { key: "tool", label: "Outil à utiliser", kind: "text" },
    ],
  },
  {
    name: "Vocabulaire",
    color: "pink",
    fields: [
      { key: "term", label: "Terme", kind: "text" },
      { key: "translations", label: "Traductions", kind: "list" },
    ],
  },
  { name: "Nuance", color: "orange", fields: [{ key: "initialIdea", label: "Idée de départ", kind: "text" }] },
  { name: "Libre", color: "stone", fields: [] },
];

export async function ensureDefaults(userId: string) {
  const existing = await db
    .select({ id: noteTypes.id })
    .from(noteTypes)
    .where(eq(noteTypes.userId, userId))
    .limit(1);
  if (existing.length > 0) return;
  await db
    .insert(noteTypes)
    .values(DEFAULT_NOTE_TYPES.map((t, i) => ({ ...t, userId, position: i })))
    .onConflictDoNothing();
}
