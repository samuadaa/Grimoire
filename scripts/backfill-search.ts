import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { notes } from "../src/db/schema";
import { buildSearchText } from "../src/lib/search";

// À lancer une fois : calcule le texte de recherche des notes déjà enregistrées.
async function main() {
  const rows = await db.select().from(notes);
  let updated = 0;
  for (const n of rows) {
    const text = buildSearchText(n.title, (n.fields ?? {}) as Record<string, unknown>, n.body);
    if (text !== n.searchText) {
      await db.update(notes).set({ searchText: text }).where(eq(notes.id, n.id));
      updated++;
    }
  }
  console.log(`${rows.length} notes examinées, ${updated} mises à jour.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});
