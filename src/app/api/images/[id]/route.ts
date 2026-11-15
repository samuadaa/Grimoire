import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { images } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

// Lecture d'une image : seulement pour son propriétaire.
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Non connecté", { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Introuvable", { status: 404 });

  const [img] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, session.user.id)));
  if (!img) return new Response("Introuvable", { status: 404 });

  const result = await get(img.pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return new Response("Introuvable", { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": img.contentType,
      "X-Content-Type-Options": "nosniff",
      // « private » : seul le navigateur de l'utilisateur garde l'image, jamais un cache partagé.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
