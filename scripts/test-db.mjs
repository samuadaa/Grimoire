import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL est absente. Vérifiez le fichier .env.local.");
  process.exit(1);
}

try {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`select now() as heure, current_database() as base`;
  console.log("Connexion réussie.");
  console.log("Base :", rows[0].base);
  console.log("Heure du serveur :", rows[0].heure);
} catch (erreur) {
  console.error("Connexion échouée :", erreur.message);
  process.exit(1);
}