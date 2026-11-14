import type { TreeDomain } from "@/db/queries";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import NavLink from "@/components/NavLink";
import { titleFont } from "@/components/ui";

export default function Sidebar({ tree, email }: { tree: TreeDomain[]; email: string }) {
  return (
    <aside className="sticky top-0 flex h-screen w-[300px] flex-none flex-col overflow-y-auto border-r border-[#dfe3ea] bg-white px-3.5 py-6">
      <NavLink href="/" className="mb-2 block rounded-lg px-2.5 py-1 text-[28px] font-semibold text-[#1a2340]">
        <span style={titleFont}>monGrimoire</span>
      </NavLink>
      <nav aria-label="Bibliothèque" className="flex-1">
        {tree.map((d) => (
          <div key={d.id}>
            <NavLink
              href={`/domaines/${d.id}`}
              className="mt-3.5 block rounded-lg px-2.5 py-2 text-[15px] font-semibold text-[#1a2340]"
            >
              {d.name}
            </NavLink>
            {d.courses.map((c) => (
              <div key={c.id}>
                <NavLink href={`/cours/${c.id}`} className="block rounded-lg py-1.5 pl-[22px] pr-2.5 text-[15px] text-[#3a4358]">
                  {c.name}
                </NavLink>
                {c.children.map((s) => (
                  <NavLink
                    key={s.id}
                    href={`/cours/${s.id}`}
                    className="block rounded-lg py-1.5 pl-10 pr-2.5 text-[15px] text-[#3a4358]"
                  >
                    {s.name}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        ))}
        <div className="mt-7 px-2.5 py-1.5 text-[15px] text-[#4d576b]">Corbeille (bientôt)</div>
      </nav>
      <div className="border-t border-[#dfe3ea] pt-4">
        <p className="mb-2 truncate px-1 text-[13px] text-[#4d576b]">{email}</p>
        <BoutonDeconnexion />
      </div>
    </aside>
  );
}
