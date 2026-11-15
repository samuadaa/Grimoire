"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-[#c9cfda] bg-white px-2.5 py-1 text-[13px] text-[#3a4358] hover:bg-[#f0f2f5]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* copie impossible : rien à faire */
        }
      }}
    >
      {done ? "Copié" : "Copier"}
    </button>
  );
}
