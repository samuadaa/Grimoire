import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { getTree } from "@/db/queries";
import { ensureDefaults } from "@/lib/defaults";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  await ensureDefaults(user.id);
  const tree = await getTree(user.id);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <Sidebar tree={tree} email={user.email} isAdmin={user.role === "admin"} />
      <main className="min-w-0 flex-1 px-12 py-7">
        <form action="/recherche" method="get" role="search" className="mb-7 flex items-center gap-4">
          <label htmlFor="recherche" className="sr-only">
            Rechercher dans toutes vos notes
          </label>
          <input
            id="recherche"
            name="q"
            type="search"
            required
            maxLength={200}
            placeholder="Rechercher dans tous vos cours…"
            className="h-11 flex-1 rounded-lg border border-[#c9cfda] bg-white px-4 text-[15px]"
          />
        </form>
        {children}
      </main>
    </div>
  );
}
