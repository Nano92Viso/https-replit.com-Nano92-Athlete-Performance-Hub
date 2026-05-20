import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const neuromuscularTable = pgTable("neuromuscular_profiles", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  // Core radar dimensions (0-100 normalized scores)
  load: numeric("load", { precision: 5, scale: 2 }).notNull(),
  explode: numeric("explode", { precision: 5, scale: 2 }).notNull(),
  drive: numeric("drive", { precision: 5, scale: 2 }).notNull(),
  // Jump tests
  cmjHeight: numeric("cmj_height", { precision: 5, scale: 2 }),
  squatJump: numeric("squat_jump", { precision: 5, scale: 2 }),
  // Force & Power
  isometricForce: numeric("isometric_force", { precision: 7, scale: 2 }),
  forcePerKg: numeric("force_per_kg", { precision: 5, scale: 2 }),
  power: numeric("power", { precision: 7, scale: 2 }),
  powerPerKg: numeric("power_per_kg", { precision: 5, scale: 2 }),
  // Speed
  maxSpeed: numeric("max_speed", { precision: 5, scale: 2 }),
  tToVmax: numeric("t_to_vmax", { precision: 5, scale: 2 }),
  // Quality indices
  asymmetryIndex: numeric("asymmetry_index", { precision: 5, scale: 2 }),
  rsi: numeric("rsi", { precision: 5, scale: 3 }),
  // Computed
  interpretation: text("interpretation").notNull().default(""),
  profileType: text("profile_type"),
  testDate: text("test_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNeuromuscularSchema = createInsertSchema(neuromuscularTable).omit({ id: true, createdAt: true });
export type InsertNeuromuscular = z.infer<typeof insertNeuromuscularSchema>;
export type NeuromuscularProfile = typeof neuromuscularTable.$inferSelect;
