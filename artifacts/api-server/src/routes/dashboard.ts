import { Router, type IRouter } from "express";
import { eq, count, avg } from "drizzle-orm";
import { db, playersTable, sessionsTable, neuromuscularTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetDashboardAlertsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const allPlayers = await db.select().from(playersTable);
  const totalPlayers = allPlayers.length;
  const fitPlayers = allPlayers.filter(p => p.injuryStatus === "fit").length;
  const injuredPlayers = allPlayers.filter(p => p.injuryStatus === "injured").length;
  const highRiskPlayers = allPlayers.filter(p => p.riskLevel === "high").length;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const allSessions = await db.select().from(sessionsTable);
  const sessionsThisWeek = allSessions.filter(s => new Date(s.date) >= weekStart).length;

  const profiles = await db.select().from(neuromuscularTable);
  const avgLoadScore = profiles.length
    ? profiles.reduce((acc, p) => acc + Number(p.load), 0) / profiles.length
    : 0;
  const avgExplodeScore = profiles.length
    ? profiles.reduce((acc, p) => acc + Number(p.explode), 0) / profiles.length
    : 0;
  const avgDriveScore = profiles.length
    ? profiles.reduce((acc, p) => acc + Number(p.drive), 0) / profiles.length
    : 0;

  const recentActivity = [
    ...allSessions.slice(-3).map((s, i) => ({
      id: i + 1,
      type: "session",
      description: `Sesión "${s.title}" completada — ${s.sessionType}, ${s.duration} min`,
      timestamp: s.createdAt.toISOString(),
    })),
    ...allPlayers.slice(-2).map((p, i) => ({
      id: i + 10,
      type: "player",
      description: `Jugador ${p.name} añadido al plantel`,
      timestamp: p.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  res.json(GetDashboardStatsResponse.parse({
    totalPlayers,
    fitPlayers,
    injuredPlayers,
    highRiskPlayers,
    sessionsThisWeek,
    avgLoadScore: Math.round(avgLoadScore * 10) / 10,
    avgExplodeScore: Math.round(avgExplodeScore * 10) / 10,
    avgDriveScore: Math.round(avgDriveScore * 10) / 10,
    recentActivity,
  }));
});

router.get("/dashboard/alerts", async (req, res): Promise<void> => {
  const players = await db.select().from(playersTable);

  const alerts = players
    .filter(p => p.injuryStatus !== "fit" || p.riskLevel === "high")
    .map((p, i) => {
      let alertType = "risk";
      let message = "";
      let severity: "info" | "warning" | "critical" = "info";

      if (p.injuryStatus === "injured") {
        alertType = "injury";
        message = `${p.name} está lesionado. Requiere seguimiento médico inmediato.`;
        severity = "critical";
      } else if (p.injuryStatus === "minor_risk") {
        alertType = "minor_risk";
        message = `${p.name} presenta riesgo menor. Monitorear carga de entrenamiento.`;
        severity = "warning";
      } else if (p.injuryStatus === "recovery") {
        alertType = "recovery";
        message = `${p.name} en proceso de recuperación. Adaptar plan de entrenamiento.`;
        severity = "info";
      } else if (p.riskLevel === "high") {
        alertType = "high_risk";
        message = `${p.name} con índice de riesgo alto. Revisar perfil neuromuscular.`;
        severity = "warning";
      }

      return {
        id: i + 1,
        playerId: p.id,
        playerName: p.name,
        alertType,
        message,
        severity,
        createdAt: p.createdAt.toISOString(),
      };
    });

  res.json(GetDashboardAlertsResponse.parse(alerts));
});

export default router;
