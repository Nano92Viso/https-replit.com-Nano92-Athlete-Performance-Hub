import { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetSession } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import {
  ArrowLeft, Dumbbell, CalendarDays, Clock, Users, FileText,
  Flame, Activity, Zap, Wind, Shield, Moon, ChevronRight,
  Timer, Info, AlertTriangle, FileDown,
} from "lucide-react";
import { generateSessionPdf, type PdfExercise } from "@/utils/sessionPdf";

const typeLabel: Record<string, string> = {
  strength: "Fuerza", speed: "Velocidad", endurance: "Resistencia",
  technical: "Técnico", recovery: "Recuperación", match: "Partido",
};
const typeColor: Record<string, string> = {
  strength: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  speed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  endurance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  technical: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  recovery: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  match: "bg-red-500/15 text-red-400 border-red-500/30",
};
const intensityLabel: Record<string, string> = {
  low: "Baja", medium: "Media", high: "Alta", max: "Máxima",
};
const intensityDot: Record<string, string> = {
  low: "bg-emerald-400", medium: "bg-yellow-400", high: "bg-orange-400", max: "bg-red-400",
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  warmup: <Flame className="w-4 h-4 text-orange-400" />,
  activation: <Activity className="w-4 h-4 text-yellow-400" />,
  plyometrics: <Zap className="w-4 h-4 text-blue-400" />,
  strength: <Dumbbell className="w-4 h-4 text-red-400" />,
  speed: <Wind className="w-4 h-4 text-emerald-400" />,
  preventive: <Shield className="w-4 h-4 text-cyan-400" />,
  cooldown: <Moon className="w-4 h-4 text-purple-400" />,
};

const SECTION_LABELS: Record<string, string> = {
  warmup: "Calentamiento",
  activation: "Activación neuromuscular",
  plyometrics: "Pliometría",
  strength: "Fuerza",
  speed: "Velocidad",
  preventive: "Preventivo",
  cooldown: "Vuelta a la calma",
};

const SECTION_ORDER = ["warmup", "activation", "plyometrics", "strength", "speed", "preventive", "cooldown"];

const SECTION_COLORS: Record<string, string> = {
  warmup: "border-orange-500/20 bg-orange-500/5",
  activation: "border-yellow-500/20 bg-yellow-500/5",
  plyometrics: "border-blue-500/20 bg-blue-500/5",
  strength: "border-red-500/20 bg-red-500/5",
  speed: "border-emerald-500/20 bg-emerald-500/5",
  preventive: "border-cyan-500/20 bg-cyan-500/5",
  cooldown: "border-purple-500/20 bg-purple-500/5",
};

const PHASE_BADGE: Record<string, string> = {
  load: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  explode: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  drive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  balanced: "bg-muted/40 text-muted-foreground border-border",
};

interface GeneratedExercise {
  id: string;
  name: string;
  section: string;
  phase?: string;
  vector?: string;
  contractionType?: string;
  sets: number;
  reps?: number | null;
  duration?: number | null;
  rest: number;
  intensityLevel?: string;
  coachingCues?: string[];
  physiologicalObjective?: string;
  transfer?: string;
  equipment?: string;
  // extended fields
  load?: number | null;
  loadText?: string | null;
  restText?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}min`;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
}

function RichExerciseCard({ ex, idx }: { ex: GeneratedExercise; idx: number }) {
  const [open, setOpen] = useState(false);
  const isRich = !!(ex.coachingCues && ex.coachingCues.length > 0);

  return (
    <div className="bg-background/60 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => isRich && setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${isRich ? "hover:bg-secondary/30 cursor-pointer" : "cursor-default"} transition-colors`}
      >
        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground leading-tight">{ex.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {ex.sets}×{ex.reps != null ? `${ex.reps} reps` : ex.duration != null ? formatTime(ex.duration) : "—"}
            </span>
            {ex.rest > 0 && (
              <>
                <span className="text-xs text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{formatTime(ex.rest)} desc.</span>
              </>
            )}
            {ex.phase && ex.phase !== "balanced" && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-medium uppercase tracking-wider ${PHASE_BADGE[ex.phase] ?? ""}`}>
                {ex.phase}
              </span>
            )}
            {ex.load != null && <span className="text-xs text-muted-foreground">{ex.load}kg</span>}
          </div>
          {ex.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{ex.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          {ex.equipment && <span className="text-xs text-muted-foreground hidden sm:block">{ex.equipment}</span>}
          {isRich && <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />}
        </div>
      </button>

      {open && isRich && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-secondary/20">
          {ex.physiologicalObjective && (
            <div className="pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Objetivo fisiológico</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{ex.physiologicalObjective}</p>
            </div>
          )}
          {ex.transfer && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transferencia</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{ex.transfer}</p>
            </div>
          )}
          {ex.coachingCues && ex.coachingCues.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Coaching Cues</div>
              <ul className="space-y-1">
                {ex.coachingCues.map((cue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);

  const { data: session, isLoading } = useGetSession(id, {
    query: { enabled: !!id },
  });

  function handlePdf() {
    if (!session) return;
    const exercises = (session.exercises as GeneratedExercise[]) ?? [];
    const pdfExercises: PdfExercise[] = exercises.map(ex => ({
      blockLabel: ex.physiologicalObjective ?? ex.section ?? "Ejercicio",
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps ?? undefined,
      durationSec: ex.duration ?? undefined,
      restText: ex.restText ?? (ex.rest > 0 ? `${ex.rest}"` : "—"),
      loadText: ex.loadText ?? (ex.load != null ? `${ex.load} kg` : ""),
      notes: ex.notes ?? "",
      videoUrl: ex.videoUrl ?? "",
      regime: ex.contractionType,
    }));
    generateSessionPdf({
      sessionTitle: session.title,
      sessionType: session.sessionType,
      playerName: `${(session.playerIds as number[])?.length ?? 0} jugadores`,
      date: session.date,
      objective: session.rationale ?? "",
      notes: session.notes ?? "",
      exercises: pdfExercises,
    });
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-5 animate-pulse">
          <div className="h-5 w-32 bg-card rounded" />
          <div className="h-32 bg-card rounded" />
          <div className="h-64 bg-card rounded" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <Link href="/sessions">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Volver a Sesiones
            </button>
          </Link>
          <div className="bg-card border border-border rounded p-12 text-center">
            <Dumbbell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Sesión no encontrada</p>
          </div>
        </div>
      </Layout>
    );
  }

  const exercises: GeneratedExercise[] = (session.exercises as GeneratedExercise[]) ?? [];
  const playerIds: number[] = (session.playerIds as number[]) ?? [];

  // Group exercises by section if they have section info
  const isGenerated = exercises.length > 0 && !!exercises[0].section;
  const sectionMap: Map<string, GeneratedExercise[]> = new Map();
  if (isGenerated) {
    for (const ex of exercises) {
      const key = ex.section ?? "other";
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(ex);
    }
  }
  const orderedSections = SECTION_ORDER.filter(s => sectionMap.has(s));
  const otherSections = [...sectionMap.keys()].filter(s => !SECTION_ORDER.includes(s));

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Back */}
        <Link href="/sessions">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver a Sesiones
          </button>
        </Link>

        {/* Session Header */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {session.mdType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-widest">
                    {session.mdType}
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${typeColor[session.sessionType] ?? "bg-secondary border-border text-muted-foreground"}`}>
                  {typeLabel[session.sessionType] ?? session.sessionType}
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight mt-1">{session.title}</h1>
              <div className="flex items-center gap-5 mt-2 flex-wrap text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="capitalize">{formatDate(session.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{session.duration} minutos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${intensityDot[session.intensity] ?? "bg-muted"}`} />
                  <span>Intensidad {intensityLabel[session.intensity] ?? session.intensity}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{playerIds.length} jugadores</span>
                </div>
              </div>
            </div>
          </div>
          {session.notes && (
            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{session.notes}</p>
            </div>
          )}
          {session.rationale && (
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <Info className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{session.rationale}</p>
            </div>
          )}

          {/* PDF button */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={handlePdf}
              className="flex items-center gap-2 border border-primary/40 hover:border-primary/70 hover:bg-primary/5 text-primary text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            >
              <FileDown className="w-4 h-4" />
              Generar PDF de sesión
            </button>
          </div>
        </div>

        {/* Exercises — grouped or flat */}
        {exercises.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center flex flex-col items-center gap-2">
            <Dumbbell className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay ejercicios registrados para esta sesión</p>
          </div>
        ) : isGenerated ? (
          <div className="space-y-4">
            {[...orderedSections, ...otherSections].map(sectionName => {
              const exs = sectionMap.get(sectionName) ?? [];
              return (
                <div key={sectionName} className={`border rounded-lg overflow-hidden ${SECTION_COLORS[sectionName] ?? "border-border"}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {SECTION_ICONS[sectionName] ?? <Dumbbell className="w-4 h-4 text-muted-foreground" />}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        {SECTION_LABELS[sectionName] ?? sectionName}
                      </h3>
                      <p className="text-xs text-muted-foreground">{exs.length} ejercicios</p>
                    </div>
                    <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="px-3 pb-3 space-y-2">
                    {exs.map((ex, i) => <RichExerciseCard key={ex.id ?? i} ex={ex} idx={i} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" /> Ejercicios
            </h2>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <RichExerciseCard key={i} ex={ex} idx={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
