import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, teamsTable, playersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/admin/fix-data", async (_req, res): Promise<void> => {
  const allTeams = await db.select().from(teamsTable).orderBy(teamsTable.id);

  // Group by normalised club+category
  const groups = new Map<string, typeof allTeams>();
  for (const team of allTeams) {
    const key = `${(team.club ?? "").toLowerCase().trim()}|${(team.category ?? "").toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(team);
  }

  let reassignedPlayers = 0;
  const deletedTeamIds: number[] = [];

  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    // Keep oldest (lowest id), reassign players from duplicates then delete them
    const [keeper, ...dupes] = group.sort((a, b) => a.id - b.id);

    for (const dupe of dupes) {
      const moved = await db
        .update(playersTable)
        .set({ teamId: keeper.id })
        .where(eq(playersTable.teamId, dupe.id))
        .returning();
      reassignedPlayers += moved.length;

      await db.delete(teamsTable).where(eq(teamsTable.id, dupe.id));
      deletedTeamIds.push(dupe.id);
    }
  }

  res.json({
    message: `Limpieza completada: ${deletedTeamIds.length} equipos duplicados eliminados, ${reassignedPlayers} jugadores reasignados`,
    deduplicatedTeams: deletedTeamIds.length,
    reassignedPlayers,
    deletedTeamIds,
  });
});

export default router;
