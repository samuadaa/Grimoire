"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { allowedEmails } from "@/db/schema";
import { allow, decideRequest, removeAllowed, setStatus } from "@/lib/access";
import { accessGranted, accessRefused, mailNote } from "@/lib/notifications";
import { sendMail } from "@/lib/mail";
import { requireAdmin } from "@/lib/session";
import { isUuid } from "@/lib/validation";

function done(info: string): never {
  redirect(`/admin?info=${encodeURIComponent(info)}`);
}
function fail(message: string): never {
  redirect(`/admin?erreur=${encodeURIComponent(message)}`);
}

export async function addAllowedAction(formData: FormData) {
  await requireAdmin();
  const r = await allow(db, formData.get("email"));
  if (!r.ok) fail(r.message);
  const email = String(formData.get("email")).trim().toLowerCase();
  done("Adresse autorisée." + mailNote(await sendMail(accessGranted(email, true))));
}

export async function decideAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const decision = formData.get("decision");
  if (!isUuid(id) || (decision !== "approved" && decision !== "rejected")) fail("Demande introuvable.");
  const r = await decideRequest(db, id as string, decision as "approved" | "rejected");
  if (!r.ok) fail(r.message);
  const mail = decision === "approved" ? accessGranted(r.email) : accessRefused(r.email);
  done((decision === "approved" ? "Accès accordé." : "Demande refusée.") + mailNote(await sendMail(mail)));
}

// On ne peut pas se suspendre ou se retirer soi-même.
async function checkNotSelf(id: string, adminEmail: string) {
  const [row] = await db.select({ email: allowedEmails.email }).from(allowedEmails).where(eq(allowedEmails.id, id));
  if (row && row.email === adminEmail.toLowerCase()) fail("Vous ne pouvez pas modifier votre propre accès.");
}

export async function statusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id");
  const status = formData.get("status");
  if (!isUuid(id) || (status !== "allowed" && status !== "suspended")) fail("Adresse introuvable.");
  await checkNotSelf(id as string, admin.email);
  const r = await setStatus(db, id as string, status as "allowed" | "suspended");
  if (!r.ok) fail(r.message);
  done(status === "suspended" ? "Accès suspendu, sessions fermées." : "Accès rétabli.");
}

export async function removeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id");
  if (!isUuid(id)) fail("Adresse introuvable.");
  await checkNotSelf(id as string, admin.email);
  const r = await removeAllowed(db, id as string);
  if (!r.ok) fail(r.message);
  done("Adresse retirée.");
}
