import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Briques communes. Chaque ligne appartient à un utilisateur (user_id) :
// toutes les requêtes de l'app doivent filtrer dessus.
const id = () => uuid("id").primaryKey().defaultRandom();
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
// Corbeille : une ligne supprimée garde sa date ici au lieu de disparaître.
const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

// Types de notes (Définition, Règle, Vocabulaire...). Personnels et modifiables.
// "fields" décrit les champs propres au type, par exemple
// [{ "key": "term", "label": "Terme", "kind": "text" }].
export type TypeField = { key: string; label: string; kind: string };

export const noteTypes = pgTable(
  "note_types",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull(),
    color: text("color").notNull().default("gray"),
    fields: jsonb("fields").$type<TypeField[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("note_types_user_name").on(t.userId, t.name)],
);

export const domains = pgTable(
  "domains",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("domains_user").on(t.userId)],
);

// Un cours, ou un sous-cours quand parent_id est rempli.
// Un seul niveau de sous-cours : cette règle est vérifiée dans le code de l'app.
export const courses = pgTable(
  "courses",
  {
    id: id(),
    userId: owner(),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id),
    parentId: uuid("parent_id").references((): AnyPgColumn => courses.id),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    sourceLabel: text("source_label"),
    sourceUrl: text("source_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("courses_user").on(t.userId),
    index("courses_domain").on(t.domainId),
    index("courses_parent").on(t.parentId),
  ],
);

// Chapitre : facultatif, rattaché à un cours ou à un sous-cours.
export const chapters = pgTable(
  "chapters",
  {
    id: id(),
    userId: owner(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    sourceLabel: text("source_label"),
    sourceUrl: text("source_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("chapters_course").on(t.courseId)],
);

// Notion : chapter_id est vide pour les notions "sans chapitre".
// is_default marque la notion "Non classé" (une seule par cours ou sous-cours).
export const topics = pgTable(
  "topics",
  {
    id: id(),
    userId: owner(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    chapterId: uuid("chapter_id").references(() => chapters.id),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("topics_course").on(t.courseId),
    index("topics_chapter").on(t.chapterId),
    uniqueIndex("topics_one_default_per_course")
      .on(t.courseId)
      .where(sql`${t.isDefault} = true`),
  ],
);

// Note. "body" contient le texte riche (titres, listes, images, encadrés),
// "fields" les champs du type (terme et traductions d'un Vocabulaire, etc.).
export const notes = pgTable(
  "notes",
  {
    id: id(),
    userId: owner(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    typeId: uuid("type_id")
      .notNull()
      .references(() => noteTypes.id),
    title: text("title").notNull().default(""),
    body: jsonb("body").notNull().default({}),
    fields: jsonb("fields").notNull().default({}),
    position: integer("position").notNull().default(0),
    sourceLabel: text("source_label"),
    sourceUrl: text("source_url"),
    // Texte de la note sans accents ni majuscules (titre, champs, contenu), pour la recherche.
    searchText: text("search_text").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("notes_user").on(t.userId),
    index("notes_topic_position").on(t.topicId, t.position),
    index("notes_type").on(t.typeId),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("tags_user_name").on(t.userId, t.name)],
);

export const noteTags = pgTable(
  "note_tags",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tagId] })],
);

// Liens entre notes.
export const noteLinks = pgTable(
  "note_links",
  {
    id: id(),
    userId: owner(),
    fromNoteId: uuid("from_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    toNoteId: uuid("to_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("note_links_pair").on(t.fromNoteId, t.toNoteId)],
);

// Accès sur invitation. status : "allowed" ou "suspended".
export const allowedEmails = pgTable("allowed_emails", {
  id: id(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("allowed"),
  createdAt: createdAt(),
});

// Demandes d'accès. status : "pending", "approved" ou "rejected".
export const accessRequests = pgTable("access_requests", {
  id: id(),
  email: text("email").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: createdAt(),
});

// Images collées dans les notes. Le fichier est dans un stockage privé (pathname) ;
// note_id est rempli à l'enregistrement de la note (vide = image pas encore utilisée).
export const images = pgTable(
  "images",
  {
    id: id(),
    userId: owner(),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
    pathname: text("pathname").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("images_user").on(t.userId), index("images_note").on(t.noteId)],
);

// Brouillons des formulaires de note, enregistrés automatiquement (sans toucher à la note).
// draft_key : "new:<cours>" pour une nouvelle note, "edit:<note>" pour une modification.
export const noteDrafts = pgTable(
  "note_drafts",
  {
    id: id(),
    userId: owner(),
    draftKey: text("draft_key").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("note_drafts_user_key").on(t.userId, t.draftKey)],
);
