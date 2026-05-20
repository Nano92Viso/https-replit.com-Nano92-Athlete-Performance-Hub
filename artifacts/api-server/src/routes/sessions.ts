import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import {
  ListSessionsQueryParams,
  ListSessionsResponse,
  CreateSessionBody,
  GetSessionParams,
  GetSessionResponse,
  UpdateSessionBody,
  DeleteSessionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeSession(s: typeof sessionsTable.$inferSelect) {
  return {
    ...s,
    playerIds: (s.playerIds as number[]) ?? [],
    exercises: (s.exercises as unknown[]) ?? [],
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/sessions", async (req, res): Promise<void> => {
  const query = ListSessionsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  let rows = await db.select().from(sessionsTable).orderBy(sessionsTable.date);

  if (query.data.playerId) {
    const pid = query.data.playerId;
    rows = rows.filter(s => {
      const ids = s.playerIds as number[];
      return ids.includes(pid);
    });
  }

  res.json(ListSessionsResponse.parse(rows.map(serializeSession)));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [session] = await db.insert(sessionsTable).values({
    title: parsed.data.title,
    sessionType: parsed.data.sessionType,
    mdType: parsed.data.mdType,
    date: parsed.data.date,
    duration: parsed.data.duration,
    intensity: parsed.data.intensity,
    playerIds: parsed.data.playerIds ?? [],
    exercises: (parsed.data.exercises as unknown[]) ?? [],
    generatedFor: parsed.data.generatedFor,
    rationale: parsed.data.rationale,
    notes: parsed.data.notes,
  }).returning();

  res.status(201).json(GetSessionResponse.parse(serializeSession(session)));
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, params.data.id));
  if (!session) { res.status(404).json({ error: "Sesión no encontrada" }); return; }

  res.json(GetSessionResponse.parse(serializeSession(session)));
});

router.patch("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Partial<typeof sessionsTable.$inferInsert> = {};
  const d = parsed.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.sessionType !== undefined) updates.sessionType = d.sessionType;
  if (d.mdType !== undefined) updates.mdType = d.mdType;
  if (d.date !== undefined) updates.date = d.date;
  if (d.duration !== undefined) updates.duration = d.duration;
  if (d.intensity !== undefined) updates.intensity = d.intensity;
  if (d.playerIds !== undefined) updates.playerIds = d.playerIds;
  if (d.exercises !== undefined) updates.exercises = d.exercises as unknown[];
  if (d.rationale !== undefined) updates.rationale = d.rationale;
  if (d.notes !== undefined) updates.notes = d.notes;

  const [updated] = await db.update(sessionsTable).set(updates).where(eq(sessionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Sesión no encontrada" }); return; }

  res.json(GetSessionResponse.parse(serializeSession(updated)));
});

router.delete("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(sessionsTable).where(eq(sessionsTable.id, params.data.id));
  res.status(204).end();
});

export default router;
