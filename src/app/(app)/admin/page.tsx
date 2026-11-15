import { addAllowedAction, decideAction, removeAction, statusAction } from "@/app/admin-actions";
import { FormError, PageTitle, SectionTitle, btnDangerOutline, btnOutline, btnPrimary, cardCls, inputCls } from "@/components/ui";
import { db } from "@/db";
import { adminView } from "@/lib/access";
import { USER_QUOTA_BYTES } from "@/lib/images";
import { requireAdmin } from "@/lib/session";

const fmt = (d: Date) => d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const mo = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;

export default async function Administration({
  searchParams,
}: {
  searchParams: Promise<{ info?: string; erreur?: string }>;
}) {
  await requireAdmin();
  const { info, erreur } = await searchParams;
  const view = await adminView(db);
  const mailOk = Boolean(process.env.MAIL_USER && process.env.MAIL_APP_PASSWORD);

  return (
    <div className="max-w-[900px]">
      <PageTitle>Administration</PageTitle>
      <p className="text-sm text-[#4d576b]">
        Seules les adresses de cette liste peuvent créer un compte et se connecter. Vous ne voyez jamais le contenu des notes des autres.
      </p>
      {!mailOk && (
        <p className="mt-4 rounded-lg border border-[#e8d3a6] bg-[#faeeda] px-3.5 py-2.5 text-sm text-[#633806]">
          L’envoi d’e-mails n’est pas configuré : ni vous ni les personnes ne reçoivent de message automatique.
        </p>
      )}
      <div className="mt-4 space-y-2.5" aria-live="polite">
        <FormError message={erreur} />
        {info && (
          <p role="status" className="rounded-lg border border-[#b5d9c9] bg-[#e3f1ec] px-3.5 py-2.5 text-sm text-[#14574a]">
            {info}
          </p>
        )}
      </div>

      <SectionTitle>Demandes d’accès{view.pending.length ? ` (${view.pending.length})` : ""}</SectionTitle>
      {view.pending.length === 0 ? (
        <p className="text-sm text-[#4d576b]">Aucune demande en attente.</p>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          {view.pending.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-4 border-t border-[#dfe3ea] px-[18px] py-3.5 first:border-t-0">
              <div className="min-w-0">
                <div className="font-semibold text-[#1a2340]">{p.email}</div>
                {p.message && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[#3a4358]">{p.message}</p>}
                <div className="mt-0.5 text-[13px] text-[#4d576b]">Demandé le {fmt(p.createdAt)}</div>
              </div>
              <div className="flex flex-none gap-2">
                {(["approved", "rejected"] as const).map((decision) => (
                  <form key={decision} action={decideAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decision" value={decision} />
                    <button className={`${decision === "approved" ? btnPrimary : btnDangerOutline} !px-3.5 !py-[7px]`}>
                      {decision === "approved" ? "Autoriser" : "Refuser"}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Personnes autorisées</SectionTitle>
      <form action={addAllowedAction} className="mb-4 flex items-end gap-2.5">
        <div className="flex-1">
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
            Ajouter une adresse Google
          </label>
          <input id="email" name="email" type="email" required maxLength={254} className={inputCls} placeholder="prenom@gmail.com" />
        </div>
        <button className={btnPrimary}>Autoriser</button>
      </form>
      {view.people.length === 0 ? (
        <p className="text-sm text-[#4d576b]">Personne n’est encore autorisé. Votre propre accès n’a pas besoin d’être dans cette liste.</p>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          {view.people.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 border-t border-[#dfe3ea] px-[18px] py-3.5 first:border-t-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <strong className="truncate font-semibold text-[#1a2340]">{p.email}</strong>
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                      p.status === "allowed" ? "bg-[#e3f1ec] text-[#14574a]" : "bg-[#faeeda] text-[#633806]"
                    }`}
                  >
                    {p.status === "allowed" ? "Autorisé" : "Suspendu"}
                  </span>
                </div>
                <div className="mt-0.5 text-[13px] text-[#4d576b]">
                  {p.signedIn ? `${p.notes} notes · images ${mo(p.imageBytes)} sur ${mo(USER_QUOTA_BYTES)}` : "Ne s’est pas encore connecté"} · ajouté le{" "}
                  {fmt(p.since)}
                </div>
              </div>
              <div className="flex flex-none gap-2">
                <form action={statusAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="status" value={p.status === "allowed" ? "suspended" : "allowed"} />
                  <button className={`${btnOutline} !px-3.5 !py-[7px]`}>{p.status === "allowed" ? "Suspendre" : "Rétablir"}</button>
                </form>
                <form action={removeAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className={`${btnDangerOutline} !px-3.5 !py-[7px]`}>Retirer</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3.5 text-sm text-[#4d576b]">
        Suspendre ou retirer une adresse ferme aussitôt ses sessions ouvertes. Les notes de la personne restent dans la base et reviennent si vous la rétablissez.
      </p>
    </div>
  );
}
