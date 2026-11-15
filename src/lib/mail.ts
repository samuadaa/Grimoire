import nodemailer, { type Transporter } from "nodemailer";

export type MailResult = { ok: true } | { ok: false; reason: string };
export type Mail = { to: string; subject: string; text: string };

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

// Envoi par le compte Gmail de l'application (mot de passe d'application).
// Si rien n'est configuré, l'app fonctionne quand même : l'envoi est simplement ignoré.
function defaultTransport(): Transporter | null {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
}

export function makeSender(transport?: Transporter | null) {
  return async function sendMail(mail: Mail): Promise<MailResult> {
    // Une adresse avec retour à la ligne ou plusieurs destinataires est refusée avant tout envoi.
    if (!EMAIL.test(mail.to) || mail.to.length > 254) return { ok: false, reason: "adresse invalide" };
    const t = transport === undefined ? defaultTransport() : transport;
    if (!t) return { ok: false, reason: "envoi d’e-mails non configuré" };
    const from = process.env.MAIL_USER ?? "monGrimoire";
    try {
      await t.sendMail({
        from: { name: "monGrimoire", address: from },
        replyTo: process.env.ADMIN_EMAIL || undefined,
        to: mail.to,
        subject: mail.subject,
        text: mail.text, // texte brut uniquement : rien de ce qu'une personne saisit n'est interprété comme du code
      });
      return { ok: true };
    } catch (e) {
      console.error("Envoi d'e-mail échoué :", e instanceof Error ? (e as { code?: string }).code ?? e.message : "erreur");
      return { ok: false, reason: "échec de l’envoi" };
    }
  };
}

export const sendMail = makeSender();
