"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { submitRequest } from "@/lib/access";
import { notifyAdminOfRequest } from "@/lib/notifications";

// Action publique (sans compte) : limitée, et qui ne crée aucun accès.
export async function requestAccessAction(formData: FormData) {
  // Champ caché que seuls les robots remplissent.
  if (typeof formData.get("website") === "string" && formData.get("website") !== "") redirect("/connexion?demande=ok");
  const r = await submitRequest(db, formData.get("email"), formData.get("message"));
  // Un e-mail pour l'administrateur seulement quand une nouvelle demande vient d'être créée.
  if (r.created && r.email) await notifyAdminOfRequest(r.email, r.message ?? null);
  redirect(`/connexion?demande=${r.status === "ok" ? "ok" : r.status === "invalid" ? "invalide" : "trop"}`);
}
