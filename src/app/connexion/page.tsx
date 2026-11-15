import GoogleButton from "@/components/GoogleButton";
import { requestAccessAction } from "./actions";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  ok: { text: "Votre demande est envoyée. L’administrateur vous répondra directement.", ok: true },
  invalide: { text: "Cette adresse e-mail ne semble pas valide.", ok: false },
  trop: { text: "Trop de demandes en ce moment. Réessayez plus tard.", ok: false },
};

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; demande?: string }>;
}) {
  const { error, demande } = await searchParams;
  const feedback = demande ? MESSAGES[demande] : undefined;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-6">
      <div className="w-full max-w-sm rounded-xl border border-[#dfe3ea] bg-white p-8">
        <h1 className="text-3xl font-semibold text-[#1a2340]">monGrimoire</h1>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg border border-[#e8b4b4] bg-[#fcebeb] px-3.5 py-2.5 text-sm text-[#791f1f]">
            Cette adresse n’a pas encore accès. Demandez l’accès ci-dessous, puis réessayez une fois autorisé.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#3a4358]">Accès sur invitation.</p>
        )}
        <GoogleButton />

        <details className="mt-6 border-t border-[#dfe3ea] pt-4" open={!!error || !!demande}>
          <summary className="cursor-pointer text-sm font-semibold text-[#14574a]">Pas encore invité ? Demander l’accès</summary>
          {feedback && (
            <p
              role="status"
              className={`mt-3 rounded-lg border px-3.5 py-2.5 text-sm ${
                feedback.ok ? "border-[#b5d9c9] bg-[#e3f1ec] text-[#14574a]" : "border-[#e8b4b4] bg-[#fcebeb] text-[#791f1f]"
              }`}
            >
              {feedback.text}
            </p>
          )}
          <form action={requestAccessAction} className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-[#1a2340]">
                Votre adresse Google
              </label>
              <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className="block h-[42px] w-full rounded-lg border border-[#c9cfda] px-3.5 text-[15px]" />
            </div>
            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-semibold text-[#1a2340]">
                Un mot pour vous présenter <span className="font-normal text-[#4d576b]">(facultatif)</span>
              </label>
              <textarea id="message" name="message" rows={3} maxLength={300} className="block w-full rounded-lg border border-[#c9cfda] px-3.5 py-2.5 text-[15px]" />
            </div>
            {/* piège à robots : invisible pour les personnes */}
            <div aria-hidden="true" className="absolute -left-[9999px]">
              <label htmlFor="website">Ne pas remplir</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <button className="rounded-lg border border-[#1f7366] bg-white px-4 py-2.5 text-sm font-semibold text-[#14574a] hover:bg-[#f0f7f4]">
              Envoyer la demande
            </button>
          </form>
        </details>
      </div>
    </main>
  );
}
