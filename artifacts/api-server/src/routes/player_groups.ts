import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playerGroupsTable } from "@workspace/db";
import {
  ListPlayerGroupsQueryParams,
  CreatePlayerGroupBody,
  DeletePlayerGroupParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeGroup(g: typeof playerGroupsTable.$inferSelect) {
  return { ...g, createdAt: g.createdAt.toISOString() };
}

router.get("/player-groups", async (req, res): Promise<void> => {
  const query = ListPlayerGroupsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const groups = await db
    .select()
    .from(playerGroupsTable)
    .where(query.data.teamId ? eq(playerGroupsTable.teamId, query.data.teamId) : undefined)
    .orderBy(playerGroupsTable.name);
  res.json(groups.map(serializeGroup));
});

router.post("/player-groups", async (req, res): Promise<void> => {
  const parsed = CreatePlayerGroupBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [group] = await db.insert(playerGroupsTable).values(parsed.data).returning();
  res.status(201).json(serializeGroup(group));
});

router.delete("/player-groups/:id", async (req, res): Promise<void> => {
  const params = DeletePlayerGroupParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(playerGroupsTable).where(eq(playerGroupsTable.id, params.data.id));
  res.status(204).end();
});

export default router;
