"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? "bg-[#e3f1ec] font-semibold text-[#14574a]" : "hover:bg-[#f0f2f5]"}`}
    >
      {children}
    </Link>
  );
}
