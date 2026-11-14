import { headers } from "next/headers";
import { redirect } from "next/navigation";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import { auth } from "@/lib/auth";

export default async function Accueil() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="text-3xl font-semibold text-slate-900">monGrimoire</h1>
        <p className="mt-3 text-slate-700">Connecté : {session.user.email}</p>
        <div className="mt-6">
          <BoutonDeconnexion />
        </div>
      </div>
    </main>
  );
}
