import { pgTable, serial, text, integer, jsonb, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { subteamsTable } from "./subteams";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  number: integer("number").notNull(),
  age: integer("age").notNull(),
  team: text("team"),
  height: integer("height"),
  weight: integer("weight"),
  dominantFoot: text("dominant_foot"),
  nationality: text("nationality"),
  injuryStatus: text("injury_status").notNull().default("fit"),
  riskLevel: text("risk_level").notNull().default("low"),
  injuryHistory: jsonb("injury_history").notNull().default([]),
  lastTestDate: text("last_test_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Extended classification fields
  playerType: text("player_type").notNull().default("team"),  // "team" | "individual"
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  subteamId: integer("subteam_id").references(() => subteamsTable.id, { onDelete: "set null" }),
  groupId: integer("group_id"),
  category: text("category"),
  photoUrl: text("photo_url"),
  observations: text("observations"),
  // Physical status: "available" | "injured" | "doubt" | "sanctioned" | "recovery"
  physicalStatus: text("physical_status").default("available"),
  // Personal data
  birthDate: date("birth_date"),
  birthPlace: text("birth_place"),
  // preferredFoot: "left" | "right" | "both"
  preferredFoot: text("preferred_foot"),
  contractEnd: date("contract_end"),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
