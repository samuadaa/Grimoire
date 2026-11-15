import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

// Renvoie l'utilisateur connecté, sinon renvoie vers la page de connexion.
// Toute page et toute action de l'app commence par cet appel.
export const requireUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  return session.user;
});

// Réservé à l'administrateur : pour tout autre compte, la page n'existe pas.
// Le rôle est relu dans la base à chaque requête.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
