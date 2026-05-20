import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, playersTable, neuromuscularTable, sessionTemplatesTable } from "@workspace/db";
import {
  GenerateSessionBody,
  GenerateSessionResponse,
  ListExercisesQueryParams,
  ListExercisesResponse,
  ListTemplatesResponse,
  CreateTemplateBody,
  DeleteTemplateParams,
} from "@workspace/api-zod";
import { generateSession } from "../engine/generator.js";
import { EXERCISES } from "../engine/exercises.js";
import type { MdType } from "../engine/rules.js";

const router: IRouter = Router();

// ── POST /sessions/generate ────────────────────────────────────────────────
router.post("/sessions/generate", async (req, res): Promise<void> => {
  const parsed = GenerateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { playerId, mdType } = parsed.data;

  // Fetch player
  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, playerId))
    .limit(1);

  if (!player) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }

  // Fetch neuromuscular profile
  const [neuro] = await db
    .select()
    .from(neuromuscularTable)
    .where(eq(neuromuscularTable.playerId, playerId))
    .orderBy(desc(neuromuscularTable.testDate))
    .limit(1);

  // Build profile (use defaults if no neuro data)
  const profile = {
    load: neuro ? Number(neuro.load) : 65,
    explode: neuro ? Number(neuro.explode) : 65,
    drive: neuro ? Number(neuro.drive) : 65,
    rsi: neuro?.rsi ? Number(neuro.rsi) : null,
    cmjHeight: neuro?.cmjHeight ? Number(neuro.cmjHeight) : null,
    asymmetryIndex: neuro?.asymmetryIndex ? Number(neuro.asymmetryIndex) : null,
    maxSpeed: neuro?.maxSpeed ? Number(neuro.maxSpeed) : null,
    injuryStatus: player.injuryStatus as "fit" | "minor_risk" | "injured" | "recovery",
    riskLevel: player.riskLevel as "low" | "medium" | "high",
  };

  const session = generateSession(profile, mdType as MdType, playerId);

  res.json(GenerateSessionResponse.parse(session));
});

// ── GET /exercises ─────────────────────────────────────────────────────────
router.get("/exercises", (req, res): void => {
  const query = ListExercisesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let exercises = [...EXERCISES];
  if (query.data.section) exercises = exercises.filter(e => e.section === query.data.section);
  if (query.data.phase) exercises = exercises.filter(e => e.phase === query.data.phase);

  res.json(ListExercisesResponse.parse(exercises));
});

// ── GET /templates ─────────────────────────────────────────────────────────
router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(sessionTemplatesTable)
    .orderBy(desc(sessionTemplatesTable.createdAt));

  res.json(ListTemplatesResponse.parse(templates.map(t => ({
    ...t,
    exercises: (t.exercises as unknown[]) ?? [],
    createdAt: t.createdAt.toISOString(),
  }))));
});

// ── POST /templates ────────────────────────────────────────────────────────
router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db
    .insert(sessionTemplatesTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description,
      mdType: parsed.data.mdType,
      sessionType: parsed.data.sessionType,
      duration: parsed.data.duration,
      intensity: parsed.data.intensity,
      exercises: parsed.data.exercises ?? [],
    })
    .returning();

  res.status(201).json({
    ...template,
    exercises: (template.exercises as unknown[]) ?? [],
    createdAt: template.createdAt.toISOString(),
  });
});

// ── DELETE /templates/:id ──────────────────────────────────────────────────
router.delete("/templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTemplateParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .delete(sessionTemplatesTable)
    .where(eq(sessionTemplatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Plantilla no encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
