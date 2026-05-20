import { EXERCISES, type Exercise, type Section } from "./exercises.js";
import { prescribe, type MdType, type PlayerProfile, type SessionPrescription } from "./rules.js";

export interface GeneratedExercise {
  id: string;
  name: string;
  section: string;
  phase: string;
  vector: string;
  contractionType: string;
  sets: number;
  reps: number | null;
  duration: number | null;
  rest: number;
  intensityLevel: string;
  coachingCues: string[];
  physiologicalObjective: string;
  transfer: string;
  equipment: string;
}

export interface SessionSection {
  name: string;
  label: string;
  duration: number;
  exercises: GeneratedExercise[];
}

export interface GeneratedSession {
  title: string;
  sessionType: string;
  mdType: string;
  duration: number;
  intensity: string;
  generatedFor: number;
  rationale: string;
  warnings: string[];
  sections: SessionSection[];
}

// ─── Section metadata ────────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  warmup: "Calentamiento",
  activation: "Activación neuromuscular",
  plyometrics: "Pliometría",
  strength: "Fuerza",
  speed: "Velocidad",
  preventive: "Preventivo",
  cooldown: "Vuelta a la calma",
};

const SECTION_ORDER: Section[] = [
  "warmup", "activation", "plyometrics", "strength", "speed", "preventive", "cooldown",
];

// ─── Volume modifier application ─────────────────────────────────────────────
function applySets(base: number, modifier: number): number {
  return Math.max(1, Math.round(base * modifier));
}

// ─── Exercise selection ──────────────────────────────────────────────────────
function selectExercises(
  section: Section,
  prescription: SessionPrescription,
  count: number,
): Exercise[] {
  const phase = prescription.focusPhase;
  const injuryStatus = prescription.mdType === "readaptation" ? "recovery" : "fit";

  let pool = EXERCISES.filter(e => e.section === section);

  // For injured/recovery: only safe exercises
  if (injuryStatus === "recovery") {
    pool = pool.filter(e => e.safeForInjury);
  }

  // For high-intensity MDs (MD-3): prefer high neuromuscular load
  // For MD-2: avoid max neuromuscular load
  if (prescription.mdType === "MD-2") {
    pool = pool.filter(e => e.neuromuscularLoad <= 3);
  }

  // Phase-specific priority
  const phaseExercises = pool.filter(e => e.phase === phase);
  const balancedExercises = pool.filter(e => e.phase === "balanced");
  const otherExercises = pool.filter(e => e.phase !== phase && e.phase !== "balanced");

  const prioritized = [...phaseExercises, ...balancedExercises, ...otherExercises];

  // Deduplicate and take count
  const seen = new Set<string>();
  const result: Exercise[] = [];
  for (const ex of prioritized) {
    if (!seen.has(ex.id) && result.length < count) {
      seen.add(ex.id);
      result.push(ex);
    }
  }
  return result;
}

// ─── Convert exercise + apply volume ────────────────────────────────────────
function toGenerated(ex: Exercise, prescription: SessionPrescription): GeneratedExercise {
  const vol = prescription.volumeModifier;
  return {
    id: ex.id,
    name: ex.name,
    section: ex.section,
    phase: ex.phase,
    vector: ex.vector,
    contractionType: ex.contractionType,
    sets: applySets(ex.defaultSets, vol),
    reps: ex.defaultReps,
    duration: ex.defaultDuration,
    rest: ex.defaultRest,
    intensityLevel: ex.intensityLevel,
    coachingCues: ex.coachingCues,
    physiologicalObjective: ex.physiologicalObjective,
    transfer: ex.transfer,
    equipment: ex.equipment,
  };
}

// ─── Section exercise counts by MD type ─────────────────────────────────────
const SECTION_COUNTS: Record<string, Partial<Record<Section, number>>> = {
  "MD-5": { warmup: 3, activation: 3, plyometrics: 2, strength: 3, preventive: 2, cooldown: 2 },
  "MD-4": { warmup: 3, activation: 2, plyometrics: 2, strength: 3, speed: 2, preventive: 2, cooldown: 2 },
  "MD-3": { warmup: 3, activation: 2, plyometrics: 3, speed: 3, preventive: 2, cooldown: 2 },
  "MD-2": { warmup: 2, activation: 2, speed: 2, preventive: 2, cooldown: 2 },
  "readaptation": { warmup: 2, activation: 2, preventive: 3, cooldown: 2 },
  "preventive": { warmup: 2, activation: 2, plyometrics: 1, preventive: 3, cooldown: 2 },
};

// ─── Section duration estimates (minutes) ────────────────────────────────────
function estimateSectionDuration(exercises: GeneratedExercise[]): number {
  if (exercises.length === 0) return 0;
  let total = 0;
  for (const ex of exercises) {
    const workTime = ex.duration ?? (((ex.reps ?? 8) * 4) / 60) * 60; // seconds
    const restTime = ex.rest ?? 90;
    total += (workTime + restTime) * ex.sets;
  }
  return Math.round(total / 60); // to minutes
}

// ─── Session title generator ─────────────────────────────────────────────────
function buildTitle(prescription: SessionPrescription): string {
  const deficitNames: Record<string, string> = {
    load: "Fuerza-Carga",
    explode: "Potencia Explosiva",
    drive: "Velocidad-Tracción",
    balanced: "Integral",
  };
  const mdLabel: Record<string, string> = {
    "MD-5": "MD-5",
    "MD-4": "MD-4",
    "MD-3": "MD-3",
    "MD-2": "MD-2",
    "readaptation": "Readaptación",
    "preventive": "Preventivo",
  };
  return `${mdLabel[prescription.mdType]}: ${deficitNames[prescription.primaryDeficit]}`;
}

// ─── Main generator function ─────────────────────────────────────────────────
export function generateSession(
  profile: PlayerProfile,
  mdType: MdType,
  playerId: number,
): GeneratedSession {
  const prescription = prescribe(profile, mdType);
  const counts = SECTION_COUNTS[mdType] ?? SECTION_COUNTS["MD-3"];

  const sections: SessionSection[] = [];

  for (const sectionName of SECTION_ORDER) {
    if (!prescription.includedSections.includes(sectionName)) continue;

    const count = counts[sectionName] ?? 2;
    const exercises = selectExercises(sectionName, prescription, count);
    const generated = exercises.map(ex => toGenerated(ex, prescription));
    const duration = estimateSectionDuration(generated);

    sections.push({
      name: sectionName,
      label: SECTION_LABELS[sectionName] ?? sectionName,
      duration,
      exercises: generated,
    });
  }

  return {
    title: buildTitle(prescription),
    sessionType: prescription.sessionType,
    mdType: prescription.mdType,
    duration: prescription.duration,
    intensity: prescription.intensityLevel,
    generatedFor: playerId,
    rationale: prescription.rationale,
    warnings: prescription.warnings,
    sections,
  };
}
