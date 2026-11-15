import { db } from "@/db";
import { noteTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_NOTE_TYPES } from "./note-types";

export async function ensureDefaults(userId: string) {
  const existing = await db
    .select({ id: noteTypes.id })
    .from(noteTypes)
    .where(eq(noteTypes.userId, userId))
    .limit(1);
  if (existing.length > 0) return;
  await db
    .insert(noteTypes)
    .values(DEFAULT_NOTE_TYPES.map((t, i) => ({ ...t, userId, position: i })))
    .onConflictDoNothing();
}
