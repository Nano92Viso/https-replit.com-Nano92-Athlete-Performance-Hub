import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const subteamsTable = pgTable("subteams", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubteamSchema = createInsertSchema(subteamsTable).omit({ id: true, createdAt: true });
export type InsertSubteam = z.infer<typeof insertSubteamSchema>;
export type Subteam = typeof subteamsTable.$inferSelect;
