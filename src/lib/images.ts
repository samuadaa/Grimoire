// Vercel limite le corps d'une requête à 4,5 Mo : on reste en dessous.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
// Espace maximal par utilisateur (le stockage gratuit est de 1 Go, partagé entre tous).
export const USER_QUOTA_BYTES = 150 * 1024 * 1024;

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Le type annoncé par le navigateur peut être faux : on lit les premiers octets du fichier.
export function detectImage(b: Uint8Array): { type: string; ext: string } | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (b.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { type: "image/png", ext: "png" };
  if (b.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return { type: "image/jpeg", ext: "jpg" };
  if (b.length >= 6 && at(0, 0x47, 0x49, 0x46, 0x38) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61)
    return { type: "image/gif", ext: "gif" };
  if (b.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return { type: "image/webp", ext: "webp" };
  return null;
}
