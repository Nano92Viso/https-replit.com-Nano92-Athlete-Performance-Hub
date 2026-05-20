import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { db, injuriesTable, playersTable } from "@workspace/db";

const router: IRouter = Router();

// ─── Validators ──────────────────────────────────────────────────────────────

const PlayerIdParams = z.object({ id: z.coerce.number().int().positive() });
const InjuryIdParams = z.object({ id: z.coerce.number().int().positive() });

const CreateInjuryBody = z.object({
  season: z.string().min(1),
  bodyZone: z.string().min(1),
  injuryType: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateInjuryBody = z.object({
  season: z.string().min(1).optional(),
  bodyZone: z.string().min(1).optional(),
  injuryType: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const ListInjuriesQuery = z.object({
  season: z.string().optional(),
});

// ─── Serializer ──────────────────────────────────────────────────────────────

function serializeInjury(i: typeof injuriesTable.$inferSelect) {
  return { ...i, createdAt: i.createdAt.toISOString() };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/players/:id/injuries", async (req, res): Promise<void> => {
  const params = PlayerIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const query = ListInjuriesQuery.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions = [eq(injuriesTable.playerId, params.data.id)];
  if (query.data.season) conditions.push(eq(injuriesTable.season, query.data.season));

  const injuries = await db
    .select()
    .from(injuriesTable)
    .where(and(...conditions))
    .orderBy(injuriesTable.startDate);

  res.json(injuries.map(serializeInjury));
});

router.post("/players/:id/injuries", async (req, res): Promise<void> => {
  const params = PlayerIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = CreateInjuryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!player) { res.status(404).json({ error: "Jugador no encontrado" }); return; }

  const [injury] = await db
    .insert(injuriesTable)
    .values({ playerId: params.data.id, ...parsed.data })
    .returning();

  res.status(201).json(serializeInjury(injury));
});

router.patch("/injuries/:id", async (req, res): Promise<void> => {
  const params = InjuryIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = UpdateInjuryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Partial<typeof injuriesTable.$inferInsert> = {};
  const d = parsed.data;
  if (d.season !== undefined) updates.season = d.season;
  if (d.bodyZone !== undefined) updates.bodyZone = d.bodyZone;
  if (d.injuryType !== undefined) updates.injuryType = d.injuryType;
  if (d.startDate !== undefined) updates.startDate = d.startDate;
  if (d.endDate !== undefined) updates.endDate = d.endDate ?? null;
  if (d.notes !== undefined) updates.notes = d.notes ?? null;

  const [injury] = await db
    .update(injuriesTable)
    .set(updates)
    .where(eq(injuriesTable.id, params.data.id))
    .returning();
  if (!injury) { res.status(404).json({ error: "Lesión no encontrada" }); return; }

  res.json(serializeInjury(injury));
});

router.delete("/injuries/:id", async (req, res): Promise<void> => {
  const params = InjuryIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const [injury] = await db.delete(injuriesTable).where(eq(injuriesTable.id, params.data.id)).returning();
  if (!injury) { res.status(404).json({ error: "Lesión no encontrada" }); return; }

  res.status(204).end();
});

export default router;
