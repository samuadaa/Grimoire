import { del, put } from "@vercel/blob";
import { eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { images } from "@/db/schema";
import { auth } from "@/lib/auth";
import { MAX_IMAGE_BYTES, USER_QUOTA_BYTES, detectImage } from "@/lib/images";

export const runtime = "nodejs";

const fail = (error: string, status: number) => Response.json({ error }, { status });

// Envoi d'une image depuis l'éditeur : réservé aux utilisateurs connectés.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return fail("Vous n’êtes pas connecté.", 401);
  const userId = session.user.id;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("Envoi invalide.", 400);
  }
  if (!(file instanceof File)) return fail("Aucune image reçue.", 400);
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return fail("Image trop lourde (4 Mo maximum).", 413);

  // On regarde le vrai contenu du fichier, pas le type annoncé par le navigateur.
  const kind = detectImage(new Uint8Array(await file.arrayBuffer()));
  if (!kind) return fail("Format non pris en charge (PNG, JPEG, WebP ou GIF).", 415);

  const [usage] = await db.select({ total: sum(images.size) }).from(images).where(eq(images.userId, userId));
  if (Number(usage?.total ?? 0) + file.size > USER_QUOTA_BYTES) {
    return fail("Votre espace d’images est plein.", 413);
  }

  const id = crypto.randomUUID();
  const pathname = `${userId}/${id}.${kind.ext}`;
  try {
    await put(pathname, file, { access: "private", contentType: kind.type, addRandomSuffix: false });
  } catch {
    return fail("Le stockage des images est indisponible. Réessayez plus tard.", 503);
  }
  try {
    await db.insert(images).values({ id, userId, pathname, contentType: kind.type, size: file.size });
  } catch {
    await del(pathname).catch(() => undefined); // pas de fichier orphelin
    return fail("Échec de l’enregistrement de l’image.", 500);
  }
  return Response.json({ id, url: `/api/images/${id}` });
}
