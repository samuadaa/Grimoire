import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Contrôle rapide : sans cookie de session, retour à la page de connexion.
// La vraie vérification (rôle, invitation) se fait côté serveur dans chaque page.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|connexion|_next/static|_next/image|favicon.ico).*)"],
};
