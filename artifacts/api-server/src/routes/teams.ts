import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, teamsTable, subteamsTable } from "@workspace/db";
import {
  CreateTeamBody,
  UpdateTeamParams,
  UpdateTeamBody,
  DeleteTeamParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Validators ──────────────────────────────────────────────────────────────

const TeamIdParams = z.object({ id: z.coerce.number().int().positive() });
const SubteamIdParams = z.object({ id: z.coerce.number().int().positive() });
const CreateSubteamBody = z.object({ name: z.string().min(1) });

// ─── Serializers ─────────────────────────────────────────────────────────────

function serializeTeam(t: typeof teamsTable.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString() };
}

function serializeSubteam(s: typeof subteamsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString() };
}

// ─── Teams ───────────────────────────────────────────────────────────────────

router.get("/teams", async (_req, res): Promise<void> => {
  const teams = await db.select().from(teamsTable).orderBy(teamsTable.club, teamsTable.category);
  const subteams = await db.select().from(subteamsTable).orderBy(subteamsTable.name);

  const result = teams.map(t => ({
    ...serializeTeam(t),
    subteams: subteams.filter(s => s.teamId === t.id).map(serializeSubteam),
  }));

  res.json(result);
});

router.post("/teams", async (req, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { club, category } = parsed.data;

  // Dedup: return existing team if club+category already exists (case-insensitive)
  if (club && category) {
    const [existing] = await db.select().from(teamsTable).where(
      and(
        sql`lower(trim(${teamsTable.club})) = lower(trim(${club}))`,
        sql`lower(trim(${teamsTable.category})) = lower(trim(${category}))`
      )
    );
    if (existing) {
      res.status(200).json(serializeTeam(existing));
      return;
    }
  }

  // Auto-generate name from club+category if not explicitly provided
  const name = parsed.data.name || (club && category ? `${club.trim()} - ${category.trim()}` : club ?? category ?? "Sin nombre");
  const [team] = await db.insert(teamsTable).values({ ...parsed.data, name }).returning();
  res.status(201).json(serializeTeam(team));
});

router.patch("/teams/:id", async (req, res): Promise<void> => {
  const params = UpdateTeamParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [team] = await db.update(teamsTable).set(parsed.data).where(eq(teamsTable.id, params.data.id)).returning();
  if (!team) { res.status(404).json({ error: "Equipo no encontrado" }); return; }

  res.json(serializeTeam(team));
});

router.delete("/teams/:id", async (req, res): Promise<void> => {
  const params = DeleteTeamParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const [team] = await db.delete(teamsTable).where(eq(teamsTable.id, params.data.id)).returning();
  if (!team) { res.status(404).json({ error: "Equipo no encontrado" }); return; }

  res.status(204).end();
});

// ─── Subteams ─────────────────────────────────────────────────────────────────

router.get("/teams/:id/subteams", async (req, res): Promise<void> => {
  const params = TeamIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const subteams = await db
    .select()
    .from(subteamsTable)
    .where(eq(subteamsTable.teamId, params.data.id))
    .orderBy(subteamsTable.name);

  res.json(subteams.map(serializeSubteam));
});

router.post("/teams/:id/subteams", async (req, res): Promise<void> => {
  const params = TeamIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = CreateSubteamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team) { res.status(404).json({ error: "Equipo no encontrado" }); return; }

  const [subteam] = await db
    .insert(subteamsTable)
    .values({ teamId: params.data.id, name: parsed.data.name })
    .returning();

  res.status(201).json(serializeSubteam(subteam));
});

router.delete("/subteams/:id", async (req, res): Promise<void> => {
  const params = SubteamIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const [subteam] = await db.delete(subteamsTable).where(eq(subteamsTable.id, params.data.id)).returning();
  if (!subteam) { res.status(404).json({ error: "Subequipo no encontrado" }); return; }

  res.status(204).end();
});

export default router;
