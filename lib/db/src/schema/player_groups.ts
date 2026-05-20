import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const playerGroupsTable = pgTable("player_groups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teamsTable.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerGroupSchema = createInsertSchema(playerGroupsTable).omit({ id: true, createdAt: true });
export type InsertPlayerGroup = z.infer<typeof insertPlayerGroupSchema>;
export type PlayerGroup = typeof playerGroupsTable.$inferSelect;
