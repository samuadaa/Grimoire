const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

// Texte saisi : coupé, limité en longueur, ou null s'il est vide.
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length === 0 ? null : v.slice(0, max);
}

// Un lien n'est accepté que s'il commence par http:// ou https://
// (jamais javascript: ni autre chose, car il sera affiché comme lien cliquable).
export function cleanUrl(value: unknown): string | null | "invalid" {
  const v = cleanText(value, 500);
  if (v === null) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "invalid";
  } catch {
    return "invalid";
  }
}
