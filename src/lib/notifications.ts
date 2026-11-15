import { type Mail, type MailResult, sendMail as defaultSend } from "./mail";

type Send = (mail: Mail) => Promise<MailResult>;
const base = () => (process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");

export const requestToAdmin = (email: string, message: string | null): Mail | null => {
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return null;
  return {
    to,
    subject: "monGrimoire : nouvelle demande d’accès",
    text: [
      "Une personne demande l’accès à monGrimoire.",
      "",
      `Adresse : ${email}`,
      `Message (texte saisi par la personne, non vérifié) : ${message ?? "aucun"}`,
      "",
      `Pour répondre : ${base()}/admin`,
    ].join("\n"),
  };
};

export const accessGranted = (email: string, invited = false): Mail => ({
  to: email,
  subject: "Votre accès à monGrimoire",
  text: [
    "Bonjour,",
    "",
    invited ? "Vous êtes invité(e) à utiliser monGrimoire." : "Votre demande d’accès à monGrimoire est acceptée.",
    `Connectez-vous avec le compte Google ${email} : ${base()}/connexion`,
    "",
    "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.",
  ].join("\n"),
});

export const accessRefused = (email: string): Mail => ({
  to: email,
  subject: "Votre demande d’accès à monGrimoire",
  text: [
    "Bonjour,",
    "",
    "Votre demande d’accès à monGrimoire n’a pas été retenue pour le moment.",
    "Vous pouvez répondre à ce message pour en parler directement.",
  ].join("\n"),
});

export const notifyAdminOfRequest = async (email: string, message: string | null, send: Send = defaultSend) => {
  const mail = requestToAdmin(email, message);
  return mail ? send(mail) : ({ ok: false, reason: "adresse de l’administrateur absente" } as MailResult);
};

// Phrase à ajouter au message affiché à l'administrateur.
export const mailNote = (r: MailResult) => (r.ok ? " E-mail envoyé." : ` E-mail non envoyé (${r.reason}).`);
