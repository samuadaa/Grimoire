"use client";

import { authClient } from "@/lib/auth-client";

export default function Connexion() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="text-3xl font-semibold text-slate-900">monGrimoire</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accès sur invitation. Si votre connexion est refusée, demandez l’accès à
          l’administrateur.
        </p>
        <button
          className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          onClick={() =>
            authClient.signIn.social({
              provider: "google",
              callbackURL: "/",
              errorCallbackURL: "/connexion",
            })
          }
        >
          Continuer avec Google
        </button>
      </div>
    </main>
  );
}
