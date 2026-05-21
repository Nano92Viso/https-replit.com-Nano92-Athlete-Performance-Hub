import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, neuromuscularTable, playersTable } from "@workspace/db";
import {
  GetPlayerNeuromuscularParams,
  GetPlayerNeuromuscularResponse,
  UpsertPlayerNeuromuscularParams,
  UpsertPlayerNeuromuscularBody,
  UpsertPlayerNeuromuscularResponse,
  GetPlayerAlertsParams,
  GetPlayerAlertsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

export function computeProfile(load: number, explode: number, drive: number): { profileType: string; interpretation: string } {
  const max = Math.max(load, explode, drive);
  const min = Math.min(load, explode, drive);
  const range = max - min;

  if (range <= 10) {
    return {
      profileType: "Balanced Profile",
      interpretation: "Perfil neuromuscular equilibrado. Las tres capacidades (Carga, Explosión, Tracción) se encuentran en rangos similares, indicando versatilidad física óptima para múltiples demandas del juego. Mantener el trabajo de mantenimiento integrado.",
    };
  } else if (explode === max) {
    return {
      profileType: "Power Profile",
      interpretation: "Dominancia en potencia explosiva. Destaca en aceleración y sprints de alta intensidad. Complementar con fuerza de base para sostener esta cualidad durante la temporada.",
    };
  } else if (load === max) {
    return {
      profileType: "Perfil Neuromuscular",
      interpretation: "Perfil de fuerza y resistencia muscular predominante. Alta capacidad de carga y durabilidad ante el esfuerzo repetido. Ideal para posiciones con alto volumen de duelos físicos. Trabajar reactividad y velocidad gestual.",
    };
  } else {
    return {
      profileType: "Force Profile",
      interpretation: "Perfil orientado a la producción de fuerza máxima y tracción. Alta eficiencia en acciones de alta intensidad con carga externa. Enfocarse en velocidad y agilidad para optimizar el perfil completo.",
    };
  }
}

function numericFields(profile: typeof neuromuscularTable.$inferSelect) {
  return {
    ...profile,
    load: Number(profile.load),
    explode: Number(profile.explode),
    drive: Number(profile.drive),
    cmjHeight: profile.cmjHeight != null ? Number(profile.cmjHeight) : null,
    squatJump: profile.squatJump != null ? Number(profile.squatJump) : null,
    isometricForce: profile.isometricForce != null ? Number(profile.isometricForce) : null,
    forcePerKg: profile.forcePerKg != null ? Number(profile.forcePerKg) : null,
    power: profile.power != null ? Number(profile.power) : null,
    powerPerKg: profile.powerPerKg != null ? Number(profile.powerPerKg) : null,
    maxSpeed: profile.maxSpeed != null ? Number(profile.maxSpeed) : null,
    tToVmax: profile.tToVmax != null ? Number(profile.tToVmax) : null,
    asymmetryIndex: profile.asymmetryIndex != null ? Number(profile.asymmetryIndex) : null,
    rsi: profile.rsi != null ? Number(profile.rsi) : null,
  };
}

router.get("/players/:id/neuromuscular/history", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerNeuromuscularParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const profiles = await db
    .select()
    .from(neuromuscularTable)
    .where(eq(neuromuscularTable.playerId, params.data.id))
    .orderBy(desc(neuromuscularTable.testDate));

  res.json(profiles.map(numericFields));
});

router.get("/players/:id/neuromuscular", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerNeuromuscularParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [profile] = await db
    .select()
    .from(neuromuscularTable)
    .where(eq(neuromuscularTable.playerId, params.data.id))
    .orderBy(desc(neuromuscularTable.testDate))
    .limit(1);

  if (!profile) { res.status(404).json({ error: "Perfil neuromuscular no encontrado" }); return; }

  res.json(GetPlayerNeuromuscularResponse.parse(numericFields(profile)));
});

router.get("/players/:id/alerts", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerAlertsParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [profile] = await db
    .select()
    .from(neuromuscularTable)
    .where(eq(neuromuscularTable.playerId, params.data.id))
    .orderBy(desc(neuromuscularTable.testDate))
    .limit(1);

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, params.data.id))
    .limit(1);

  if (!profile || !player) {
    res.json(GetPlayerAlertsResponse.parse([]));
    return;
  }

  const p = numericFields(profile);
  const alerts: {
    id: number;
    type: string;
    metric: string;
    value: number | null;
    threshold: number;
    message: string;
    severity: "info" | "warning" | "critical";
    recommendation: string;
  }[] = [];
  let alertId = 1;

  // CMJ deficit
  if (p.cmjHeight != null && p.cmjHeight < 30) {
    alerts.push({
      id: alertId++,
      type: "cmj_deficit",
      metric: "CMJ Height",
      value: p.cmjHeight,
      threshold: 30,
      message: `Altura CMJ baja: ${p.cmjHeight.toFixed(1)} cm (referencia: ≥30 cm)`,
      severity: p.cmjHeight < 25 ? "critical" : "warning",
      recommendation: "Incluir trabajo pliométrico y saltos reactivos 2×/semana.",
    });
  }

  // RSI deficit
  if (p.rsi != null && p.rsi < 1.5) {
    alerts.push({
      id: alertId++,
      type: "rsi_deficit",
      metric: "RSI",
      value: p.rsi,
      threshold: 1.5,
      message: `RSI bajo: ${p.rsi.toFixed(2)} (referencia: ≥1.50)`,
      severity: p.rsi < 1.0 ? "critical" : "warning",
      recommendation: "Priorizar ejercicios de reactividad y ciclo estiramiento-acortamiento.",
    });
  }

  // Asymmetry alert — umbral: ≥7% atención, >10% riesgo elevado
  if (p.asymmetryIndex != null && p.asymmetryIndex >= 7) {
    alerts.push({
      id: alertId++,
      type: "asymmetry",
      metric: "Índice de Asimetría",
      value: p.asymmetryIndex,
      threshold: 7,
      message: p.asymmetryIndex > 10
        ? `Asimetría elevada: ${p.asymmetryIndex.toFixed(1)}% — riesgo elevado (referencia: <7%)`
        : `Asimetría: ${p.asymmetryIndex.toFixed(1)}% — requiere atención (referencia: <7%)`,
      severity: p.asymmetryIndex > 10 ? "critical" : "warning",
      recommendation: "Trabajo unilateral prioritario para equilibrar la cadena muscular.",
    });
  }

  // Explode score deficit (vs team norm ~70)
  if (p.explode < 55) {
    alerts.push({
      id: alertId++,
      type: "explode_deficit",
      metric: "Explode Score",
      value: p.explode,
      threshold: 55,
      message: `Score Explode bajo: ${p.explode.toFixed(0)}/100 (referencia equipo: ≥55)`,
      severity: p.explode < 45 ? "critical" : "warning",
      recommendation: "Aumentar volumen de sprints y ejercicios de potencia en las próximas 4 semanas.",
    });
  }

  // Load score deficit
  if (p.load < 55) {
    alerts.push({
      id: alertId++,
      type: "load_deficit",
      metric: "Load Score",
      value: p.load,
      threshold: 55,
      message: `Score Load bajo: ${p.load.toFixed(0)}/100 (referencia equipo: ≥55)`,
      severity: p.load < 45 ? "critical" : "warning",
      recommendation: "Revisar plan de cargas. Sesiones de fuerza de base 3×/semana.",
    });
  }

  // Drive score deficit
  if (p.drive < 55) {
    alerts.push({
      id: alertId++,
      type: "drive_deficit",
      metric: "Drive Score",
      value: p.drive,
      threshold: 55,
      message: `Score Drive bajo: ${p.drive.toFixed(0)}/100 (referencia equipo: ≥55)`,
      severity: p.drive < 45 ? "critical" : "warning",
      recommendation: "Incorporar ejercicios de tracción horizontal y trabajo de glúteos.",
    });
  }

  // Max speed
  if (p.maxSpeed != null && p.maxSpeed < 28) {
    alerts.push({
      id: alertId++,
      type: "max_speed_deficit",
      metric: "Velocidad Máxima",
      value: p.maxSpeed,
      threshold: 28,
      message: `Velocidad máxima baja: ${p.maxSpeed.toFixed(1)} km/h (referencia: ≥28 km/h)`,
      severity: p.maxSpeed < 25 ? "critical" : "info",
      recommendation: "Añadir sprints máximos y trabajo de técnica de carrera.",
    });
  }

  // Force per kg
  if (p.forcePerKg != null && p.forcePerKg < 20) {
    alerts.push({
      id: alertId++,
      type: "force_deficit",
      metric: "Fuerza Relativa",
      value: p.forcePerKg,
      threshold: 20,
      message: `Fuerza relativa baja: ${p.forcePerKg.toFixed(1)} N/kg (referencia: ≥20 N/kg)`,
      severity: p.forcePerKg < 15 ? "critical" : "warning",
      recommendation: "Incrementar trabajo de fuerza máxima en bloque de 3-4 semanas.",
    });
  }

  // Injury status alerts
  if (player.injuryStatus === "injured") {
    alerts.push({
      id: alertId++,
      type: "injury",
      metric: "Estado Físico",
      value: null,
      threshold: 0,
      message: "Jugador en estado lesionado. Requiere seguimiento médico inmediato.",
      severity: "critical",
      recommendation: "Consultar con el cuerpo médico antes de retomar actividad física.",
    });
  } else if (player.injuryStatus === "recovery") {
    alerts.push({
      id: alertId++,
      type: "recovery",
      metric: "Estado Físico",
      value: null,
      threshold: 0,
      message: "Jugador en proceso de recuperación. Adaptar carga de entrenamiento.",
      severity: "warning",
      recommendation: "Seguir protocolo de retorno progresivo. Evaluar semanalmente.",
    });
  }

  res.json(GetPlayerAlertsResponse.parse(alerts));
});

router.post("/players/:id/neuromuscular", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpsertPlayerNeuromuscularParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpsertPlayerNeuromuscularBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { profileType, interpretation } = computeProfile(
    parsed.data.load,
    parsed.data.explode,
    parsed.data.drive,
  );

  const values = {
    load: parsed.data.load.toString(),
    explode: parsed.data.explode.toString(),
    drive: parsed.data.drive.toString(),
    cmjHeight: parsed.data.cmjHeight?.toString(),
    squatJump: parsed.data.squatJump?.toString(),
    isometricForce: parsed.data.isometricForce?.toString(),
    forcePerKg: parsed.data.forcePerKg?.toString(),
    power: parsed.data.power?.toString(),
    powerPerKg: parsed.data.powerPerKg?.toString(),
    maxSpeed: parsed.data.maxSpeed?.toString(),
    tToVmax: parsed.data.tToVmax?.toString(),
    asymmetryIndex: parsed.data.asymmetryIndex?.toString(),
    rsi: parsed.data.rsi?.toString(),
    interpretation,
    profileType,
    testDate: parsed.data.testDate,
  };

  const [existing] = await db
    .select()
    .from(neuromuscularTable)
    .where(eq(neuromuscularTable.playerId, params.data.id))
    .limit(1);

  let profile;
  if (existing) {
    [profile] = await db.update(neuromuscularTable).set(values).where(eq(neuromuscularTable.id, existing.id)).returning();
  } else {
    [profile] = await db.insert(neuromuscularTable).values({ playerId: params.data.id, ...values }).returning();
  }

  res.json(UpsertPlayerNeuromuscularResponse.parse(numericFields(profile)));
});

export default router;
