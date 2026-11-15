import Link from "next/link";
import type { ReactNode } from "react";

export const titleFont = { fontFamily: "var(--font-fraunces), Georgia, serif" };

export const inputCls =
  "block h-[42px] w-full rounded-lg border border-[#c9cfda] bg-white px-3.5 text-[15px] text-[#1a2340]";
export const btnPrimary =
  "inline-block rounded-lg bg-[#1f7366] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[#195f54]";
export const btnOutline =
  "inline-block rounded-lg border border-[#1f7366] bg-white px-[18px] py-2.5 text-sm font-semibold text-[#14574a] hover:bg-[#f0f7f4]";
export const cardCls = "rounded-xl border border-[#dfe3ea] bg-white";

// "1 cours", "2 notions"...
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-4 mt-1.5 text-4xl font-semibold text-[#1a2340]" style={titleFont}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-7 text-[22px] font-semibold text-[#1a2340]" style={titleFont}>
      {children}
    </h2>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="text-[13px] text-[#4d576b]" aria-label="Fil d’Ariane">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`}>
          {i > 0 && " › "}
          {it.href ? (
            <Link href={it.href} className="hover:underline">
              {it.label}
            </Link>
          ) : (
            it.label
          )}
        </span>
      ))}
    </nav>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-[#1a2340]">
        {label} {hint && <span className="font-normal text-[#4d576b]">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-[#e8b4b4] bg-[#fcebeb] px-3.5 py-2.5 text-sm text-[#791f1f]">
      {message}
    </p>
  );
}

export function SourceFields() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Source" hint="(facultative)" htmlFor="sourceLabel">
        <input id="sourceLabel" name="sourceLabel" className={inputCls} placeholder="Plateforme, livre…" maxLength={120} />
      </Field>
      <Field label="Lien" hint="(facultatif)" htmlFor="sourceUrl">
        <input id="sourceUrl" name="sourceUrl" className={inputCls} placeholder="https://" maxLength={500} />
      </Field>
    </div>
  );
}

export function SourceLine({ label, url }: { label: string | null; url: string | null }) {
  if (!label && !url) return null;
  return (
    <span className="text-sm text-[#4d576b]">
      Source :{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#14574a] hover:underline">
          {label ?? url}
        </a>
      ) : (
        label
      )}
    </span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className={`${cardCls} p-7 text-center`}>
      <div className="text-xl font-semibold text-[#1a2340]" style={titleFont}>
        {title}
      </div>
      <p className="mb-4 mt-1.5 text-sm text-[#4d576b]">{text}</p>
      {action}
    </div>
  );
}

// Couleur des étiquettes de type de note.
const TYPE_COLORS: Record<string, string> = {
  blue: "bg-[#e6f1fb] text-[#0c447c]",
  amber: "bg-[#faeeda] text-[#633806]",
  gray: "bg-[#eef0f4] text-[#3a4358]",
  violet: "bg-[#eeedfe] text-[#3c3489]",
  green: "bg-[#e3f1ec] text-[#14574a]",
  pink: "bg-[#fbeaf0] text-[#72243e]",
  orange: "bg-[#fdebdc] text-[#7a3a0a]",
  stone: "bg-[#f1efe8] text-[#444441]",
};

export function TypeBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[color] ?? TYPE_COLORS.gray}`}>
      {name}
    </span>
  );
}
