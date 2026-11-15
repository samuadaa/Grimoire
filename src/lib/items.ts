export const ITEM_TYPES = ["domaine", "cours", "chapitre", "notion", "note"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const isItemType = (v: unknown): v is ItemType =>
  typeof v === "string" && (ITEM_TYPES as readonly string[]).includes(v);

export const ITEM_LABEL: Record<ItemType, string> = {
  domaine: "Domaine",
  cours: "Cours",
  chapitre: "Chapitre",
  notion: "Notion",
  note: "Note",
};
