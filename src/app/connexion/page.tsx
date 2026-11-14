import GoogleButton from "@/components/GoogleButton";

export default async function Connexion({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-6">
      <div className="w-full max-w-sm rounded-xl border border-[#dfe3ea] bg-white p-8">
        <h1 className="text-3xl font-semibold text-[#1a2340]">monGrimoire</h1>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg border border-[#e8b4b4] bg-[#fcebeb] px-3.5 py-2.5 text-sm text-[#791f1f]">
            Cette adresse n’a pas encore accès. Demandez l’accès à l’administrateur, puis réessayez.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#3a4358]">Accès sur invitation.</p>
        )}
        <GoogleButton />
      </div>
    </main>
  );
}
