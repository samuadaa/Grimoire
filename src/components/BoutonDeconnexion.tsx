"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function BoutonDeconnexion() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800"
      onClick={async () => {
        await authClient.signOut();
        router.push("/connexion");
      }}
    >
      Se déconnecter
    </button>
  );
}
