import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { seed } from "./seed-lib";

// Insère le contenu de test dans le compte administrateur (ADMIN_EMAIL).
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error("ADMIN_EMAIL est absente de .env.local.");
    process.exit(1);
  }
  const [admin] = await db.select().from(user).where(eq(user.email, email));
  if (!admin) {
    console.error("Aucun compte pour cette adresse. Connectez-vous une fois à l'app, puis relancez.");
    process.exit(1);
  }
  const report = await seed(db, admin.id);
  console.log(`Créés (${report.created.length}) :`, report.created.join(" | ") || "rien");
  console.log(`Déjà présents (${report.existing.length}) :`, report.existing.join(" | ") || "rien");
  process.exit(0);
}

main().catch((e) => {
  console.error("Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});
