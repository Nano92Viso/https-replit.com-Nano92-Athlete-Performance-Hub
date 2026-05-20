export type MdType = "MD-5" | "MD-4" | "MD-3" | "MD-2" | "readaptation" | "preventive";
export type DeficitType = "load" | "explode" | "drive" | "balanced";
export type RiskProfile = "high" | "medium" | "low";
export type IntensityLevel = "low" | "medium" | "high" | "max";
export type SessionTypeName = "strength" | "speed" | "endurance" | "technical" | "recovery" | "match";

export interface PlayerProfile {
  load: number;
  explode: number;
  drive: number;
  rsi?: number | null;
  cmjHeight?: number | null;
  asymmetryIndex?: number | null;
  maxSpeed?: number | null;
  injuryStatus: "fit" | "minor_risk" | "injured" | "recovery";
  riskLevel: "low" | "medium" | "high";
}

export interface SessionPrescription {
  mdType: MdType;
  primaryDeficit: DeficitType;
  secondaryDeficit: DeficitType | null;
  sessionType: SessionTypeName;
  intensityLevel: IntensityLevel;
  volumeModifier: number; // 0.4 – 1.2 multiplier on sets/volume
  focusPhase: DeficitType;
  includedSections: string[];
  rationale: string;
  warnings: string[];
  duration: number; // minutes
}

// ─── Thresholds ──────────────────────────────────────────────────────────────
const DEFICIT_THRESHOLD = 62;   // below this → deficit
const SEVERE_DEFICIT = 50;      // below this → severe deficit
const BALANCE_RANGE = 10;       // max difference for "balanced"

// ─── MD-type parameters ──────────────────────────────────────────────────────
const MD_PARAMS: Record<MdType, {
  maxIntensity: IntensityLevel;
  volumeModifier: number;
  label: string;
  sessionType: SessionTypeName;
  allowedSections: string[];
}> = {
  "MD-5": {
    maxIntensity: "max",
    volumeModifier: 1.0,
    label: "MD-5 (Fuerza base)",
    sessionType: "strength",
    allowedSections: ["warmup", "activation", "plyometrics", "strength", "preventive", "cooldown"],
  },
  "MD-4": {
    maxIntensity: "high",
    volumeModifier: 0.9,
    label: "MD-4 (Potencia)",
    sessionType: "strength",
    allowedSections: ["warmup", "activation", "plyometrics", "strength", "speed", "preventive", "cooldown"],
  },
  "MD-3": {
    maxIntensity: "max",
    volumeModifier: 0.85,
    label: "MD-3 (Velocidad-potencia)",
    sessionType: "speed",
    allowedSections: ["warmup", "activation", "plyometrics", "speed", "preventive", "cooldown"],
  },
  "MD-2": {
    maxIntensity: "high",
    volumeModifier: 0.6,
    label: "MD-2 (Activación)",
    sessionType: "speed",
    allowedSections: ["warmup", "activation", "speed", "preventive", "cooldown"],
  },
  "readaptation": {
    maxIntensity: "low",
    volumeModifier: 0.4,
    label: "Readaptación",
    sessionType: "recovery",
    allowedSections: ["warmup", "activation", "preventive", "cooldown"],
  },
  "preventive": {
    maxIntensity: "medium",
    volumeModifier: 0.7,
    label: "Preventivo",
    sessionType: "recovery",
    allowedSections: ["warmup", "activation", "plyometrics", "preventive", "cooldown"],
  },
};

// ─── Deficit detection ───────────────────────────────────────────────────────
function detectDeficit(profile: PlayerProfile): { primary: DeficitType; secondary: DeficitType | null } {
  const { load, explode, drive } = profile;
  const max = Math.max(load, explode, drive);
  const min = Math.min(load, explode, drive);
  const range = max - min;

  // Balanced if all within range
  if (range <= BALANCE_RANGE && load >= DEFICIT_THRESHOLD && explode >= DEFICIT_THRESHOLD && drive >= DEFICIT_THRESHOLD) {
    return { primary: "balanced", secondary: null };
  }

  // Find primary deficit (lowest below threshold, or simply lowest)
  const scores: [DeficitType, number][] = [["load", load], ["explode", explode], ["drive", drive]];
  scores.sort((a, b) => a[1] - b[1]);

  const primary = scores[0][0];
  const secondary = scores[1][1] < DEFICIT_THRESHOLD ? scores[1][0] : null;

  return { primary, secondary };
}

function capIntensity(desired: IntensityLevel, cap: IntensityLevel): IntensityLevel {
  const order: IntensityLevel[] = ["low", "medium", "high", "max"];
  const capIdx = order.indexOf(cap);
  const desIdx = order.indexOf(desired);
  return order[Math.min(desIdx, capIdx)];
}

// ─── Main rule engine ────────────────────────────────────────────────────────
export function prescribe(profile: PlayerProfile, mdType: MdType): SessionPrescription {
  const { primary, secondary } = detectDeficit(profile);
  const mdParams = MD_PARAMS[mdType];
  const warnings: string[] = [];

  // ── Injury / Status overrides ──
  if (profile.injuryStatus === "injured") {
    return {
      mdType,
      primaryDeficit: primary,
      secondaryDeficit: secondary,
      sessionType: "recovery",
      intensityLevel: "low",
      volumeModifier: 0.3,
      focusPhase: "balanced",
      includedSections: ["warmup", "activation", "preventive", "cooldown"],
      rationale: "El jugador está lesionado. La sesión se limita a trabajo de readaptación suave, movilidad y activación sin carga.",
      warnings: ["Jugador lesionado: consultar protocolo médico antes de iniciar"],
      duration: 40,
    };
  }

  if (profile.injuryStatus === "recovery") {
    const sections = ["warmup", "activation", "preventive", "cooldown"];
    return {
      mdType,
      primaryDeficit: primary,
      secondaryDeficit: secondary,
      sessionType: "recovery",
      intensityLevel: "low",
      volumeModifier: 0.4,
      focusPhase: primary === "balanced" ? "load" : primary,
      includedSections: sections,
      rationale: "El jugador está en readaptación. Sesión de bajo impacto con énfasis en prevención y recuperación funcional.",
      warnings: ["Jugador en readaptación: evaluar tolerancia al dolor en cada ejercicio"],
      duration: 50,
    };
  }

  // ── Risk adjustments ──
  let volumeModifier = mdParams.volumeModifier;
  if (profile.riskLevel === "high") {
    volumeModifier *= 0.75;
    warnings.push("Nivel de riesgo alto: volumen reducido al 75%");
  } else if (profile.riskLevel === "medium") {
    volumeModifier *= 0.9;
    warnings.push("Nivel de riesgo medio: volumen reducido al 90%");
  }

  // ── RSI warning ──
  if (profile.rsi != null && profile.rsi < 1.0) {
    warnings.push("RSI crítico (<1.0): reducir pliometría de alto impacto");
    if (mdType === "MD-3" || mdType === "MD-4") {
      volumeModifier *= 0.8;
    }
  }

  // ── Asymmetry warning — umbral: ≥7% atención, >10% riesgo elevado ──
  if (profile.asymmetryIndex != null && profile.asymmetryIndex > 10) {
    warnings.push("Asimetría elevada (>10%): riesgo elevado — incluir trabajo unilateral correctivo prioritario");
  } else if (profile.asymmetryIndex != null && profile.asymmetryIndex >= 7) {
    warnings.push("Asimetría en zona de atención (≥7%): monitorizar y compensar con trabajo unilateral");
  }

  // ── Session intensity (capped by MD type) ──
  let baseIntensity: IntensityLevel = "high";
  if (primary === "load" && (mdType === "MD-5" || mdType === "MD-4")) {
    baseIntensity = "max";
  } else if (primary === "explode") {
    baseIntensity = mdType === "MD-3" || mdType === "MD-4" ? "max" : "high";
  } else if (primary === "drive") {
    baseIntensity = "high";
  } else if (primary === "balanced") {
    baseIntensity = mdType === "MD-2" ? "medium" : "high";
  }
  const intensityLevel = capIntensity(baseIntensity, mdParams.maxIntensity);

  // ── Focus phase: address the primary deficit ──
  let focusPhase: DeficitType = primary === "balanced" ? "balanced" : primary;

  // ── Section selection ──
  let includedSections = [...mdParams.allowedSections];

  // Add strength for load deficit even in MD-3/MD-4 if severe
  if (primary === "load" && profile.load < SEVERE_DEFICIT && !includedSections.includes("strength")) {
    includedSections.push("strength");
  }

  // Remove high-impact sections for high-risk players
  if (profile.riskLevel === "high" && mdType !== "readaptation" && mdType !== "preventive") {
    includedSections = includedSections.filter(s => s !== "plyometrics");
    warnings.push("Pliometría eliminada por riesgo alto");
  }

  // ── Duration calculation ──
  const baseDuration: Record<MdType, number> = {
    "MD-5": 90,
    "MD-4": 75,
    "MD-3": 65,
    "MD-2": 50,
    "readaptation": 45,
    "preventive": 60,
  };
  const duration = Math.round(baseDuration[mdType] * volumeModifier + baseDuration[mdType] * 0.3);

  // ── Rationale generation ──
  const rationaleMap: Record<DeficitType, string> = {
    load: `Déficit en capacidad de carga (Load: ${profile.load.toFixed(0)}/100). La sesión prioriza fuerza máxima y resistencia muscular para elevar la base de carga del jugador.`,
    explode: `Déficit en capacidad explosiva (Explode: ${profile.explode.toFixed(0)}/100). La sesión prioriza potencia, pliometría y velocidad para mejorar la producción de fuerza en corto tiempo.`,
    drive: `Déficit en capacidad de tracción (Drive: ${profile.drive.toFixed(0)}/100). La sesión prioriza fuerza horizontal, aceleraciones y cambios de dirección para mejorar la propulsión.`,
    balanced: `Perfil neuromuscular equilibrado (Load: ${profile.load.toFixed(0)}, Explode: ${profile.explode.toFixed(0)}, Drive: ${profile.drive.toFixed(0)}). La sesión trabaja de forma global con énfasis en el período de entrenamiento (${mdType}).`,
  };

  return {
    mdType,
    primaryDeficit: primary,
    secondaryDeficit: secondary,
    sessionType: mdParams.sessionType,
    intensityLevel,
    volumeModifier,
    focusPhase,
    includedSections,
    rationale: rationaleMap[primary],
    warnings,
    duration,
  };
}

export { MD_PARAMS };
