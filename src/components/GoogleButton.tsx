"use client";

import { authClient } from "@/lib/auth-client";

export default function GoogleButton() {
  return (
    <button
      className="mt-6 w-full rounded-lg bg-[#1f7366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#195f54]"
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
  );
}
