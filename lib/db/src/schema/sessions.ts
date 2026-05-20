import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sessionType: text("session_type").notNull(),
  mdType: text("md_type"),
  date: text("date").notNull(),
  duration: integer("duration").notNull(),
  intensity: text("intensity").notNull(),
  playerIds: jsonb("player_ids").notNull().default([]),
  exercises: jsonb("exercises").notNull().default([]),
  rationale: text("rationale"),
  generatedFor: integer("generated_for"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessionTemplatesTable = pgTable("session_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mdType: text("md_type"),
  sessionType: text("session_type").notNull(),
  duration: integer("duration").notNull(),
  intensity: text("intensity").notNull(),
  exercises: jsonb("exercises").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export const insertSessionTemplateSchema = createInsertSchema(sessionTemplatesTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertSessionTemplate = z.infer<typeof insertSessionTemplateSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type SessionTemplate = typeof sessionTemplatesTable.$inferSelect;
