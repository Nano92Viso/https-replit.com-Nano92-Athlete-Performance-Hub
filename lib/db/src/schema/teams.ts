import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clubName: text("club_name"),
  category: text("category"),
  season: text("season"),
  parentTeamId: integer("parent_team_id").references((): AnyPgColumn => teamsTable.id, { onDelete: "set null" }),
  club: text("club"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;
