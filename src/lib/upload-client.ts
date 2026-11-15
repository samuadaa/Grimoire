import { MAX_IMAGE_BYTES } from "./images";

// Envoie une image au serveur et renvoie l'adresse à mettre dans la note.
export async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image trop lourde (4 Mo maximum).");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/images", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Échec de l’envoi de l’image.");
  return data.url;
}
