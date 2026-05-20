import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const injuriesTable = pgTable("injuries", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  season: text("season").notNull(),
  bodyZone: text("body_zone").notNull(),
  injuryType: text("injury_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInjurySchema = createInsertSchema(injuriesTable).omit({ id: true, createdAt: true });
export type InsertInjury = z.infer<typeof insertInjurySchema>;
export type Injury = typeof injuriesTable.$inferSelect;
