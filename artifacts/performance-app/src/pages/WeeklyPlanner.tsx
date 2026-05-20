import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSessions,
  useUpdateSession,
  useDeleteSession,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import {
  ChevronLeft, ChevronRight, Plus, Zap, AlertTriangle,
  Clock, Dumbbell, Trophy, BarChart3, Trash2, X,
  Flame, Wind, Activity, RefreshCcw, CheckCircle2,
  Calendar, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Date helpers ────────────────────────────────────────────────────────────
function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}
function sameDate(a: string, b: Date): boolean {
  return a.startsWith(toDateStr(b));
}

const DAY_NAMES = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// ─── MD label helpers ─────────────────────────────────────────────────────────
// matchDayIndex: 0=Mon...6=Sun (within the week Mon-Sun grid)
function getMdLabel(dayIndex: number, matchDayIndex: number): string {
  const diff = (matchDayIndex - dayIndex + 7) % 7;
  if (diff === 0) return "MD";
  const dayAfter = (dayIndex - matchDayIndex + 7) % 7;
  if (diff > 0 && diff <= 5) return `MD-${diff}`;
  return `MD+${dayAfter}`;
}
function getMdColor(label: string): string {
  if (label === "MD") return "text-red-400 bg-red-500/10 border-red-500/30";
  if (label === "MD-1") return "text-orange-400 bg-orange-500/10 border-orange-500/30";
  if (label === "MD-2") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  if (label === "MD-3") return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  if (label === "MD-4") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (label === "MD-5") return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
  return "text-muted-foreground bg-secondary border-border";
}

// ─── Session type styles ──────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  strength: { label: "Fuerza", bg: "bg-orange-500/10", border: "border-orange-500/25", text: "text-orange-300", dot: "bg-orange-400" },
  speed:    { label: "Velocidad", bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-300", dot: "bg-blue-400" },
  endurance:{ label: "Resistencia", bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-300", dot: "bg-emerald-400" },
  technical:{ label: "Técnico", bg: "bg-purple-500/10", border: "border-purple-500/25", text: "text-purple-300", dot: "bg-purple-400" },
  recovery: { label: "Recuperación", bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-300", dot: "bg-cyan-400" },
  match:    { label: "Partido", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-300", dot: "bg-red-400" },
};
const INTENSITY_CONFIG: Record<string, { label: string; color: string; bar: string; value: number }> = {
  low:    { label: "Baja",    color: "text-emerald-400", bar: "bg-emerald-400", value: 25 },
  medium: { label: "Media",   color: "text-yellow-400",  bar: "bg-yellow-400",  value: 50 },
  high:   { label: "Alta",    color: "text-orange-400",  bar: "bg-orange-400",  value: 75 },
  max:    { label: "Máxima",  color: "text-red-400",     bar: "bg-red-400",     value: 100 },
};

// ─── Load calculation ────────────────────────────────────────────────────────
interface SessionLike { intensity: string; sessionType: string; duration: number }
function calcLoad(s: SessionLike): number {
  const iv = INTENSITY_CONFIG[s.intensity]?.value ?? 50;
  const tm: Record<string, number> = { match: 1.5, strength: 1.2, speed: 1.15, endurance: 1.0, technical: 0.75, recovery: 0.35 };
  const mod = tm[s.sessionType] ?? 1.0;
  return Math.min(100, Math.round(iv * mod * (s.duration / 60)));
}
function dayLoad(sessions: SessionLike[]): number {
  if (!sessions.length) return 0;
  return Math.min(100, sessions.reduce((a, s) => a + calcLoad(s), 0) / sessions.length);
}
function loadBarColor(load: number): string {
  if (load < 30) return "bg-emerald-400";
  if (load < 55) return "bg-yellow-400";
  if (load < 75) return "bg-orange-400";
  return "bg-red-400";
}

// ─── Alert detection ──────────────────────────────────────────────────────────
interface WeekAlert { day?: number; severity: "warning" | "critical"; message: string; detail: string }
function detectAlerts(days: Date[], sessionsByDay: Record<string, SessionLike[]>): WeekAlert[] {
  const alerts: WeekAlert[] = [];
  const loads = days.map(d => dayLoad(sessionsByDay[toDateStr(d)] ?? []));

  // Consecutive high-load days (3+)
  let consecutive = 0;
  for (let i = 0; i < 7; i++) {
    if (loads[i] > 60) { consecutive++; if (consecutive >= 3) { alerts.push({ severity: "warning", message: "Alta carga acumulada", detail: `${consecutive} días consecutivos con carga elevada` }); break; } }
    else consecutive = 0;
  }

  // Max intensity day before match
  days.forEach((d, i) => {
    const sessions = sessionsByDay[toDateStr(d)] ?? [];
    sessions.forEach(s => {
      if (s.intensity === "max" && i === 5) alerts.push({ day: i, severity: "critical", message: "Intensidad máxima en MD-1", detail: "Riesgo de sobrecarga pre-partido" });
      if (s.sessionType === "strength" && i >= 5) alerts.push({ day: i, severity: "warning", message: "Fuerza en MD-1 o MD", detail: "Posible fatiga neuromuscular en vísperas de partido" });
    });
  });

  // No recovery day in 5+ sessions week
  const totalSessions = Object.values(sessionsByDay).reduce((a, s) => a + s.length, 0);
  const hasRecovery = Object.values(sessionsByDay).some(ss => ss.some(s => s.sessionType === "recovery"));
  if (totalSessions >= 5 && !hasRecovery) {
    alerts.push({ severity: "warning", message: "Sin día de recuperación", detail: "Semana intensa sin sesión de recuperación activa" });
  }

  // Double high-intensity consecutive days
  for (let i = 0; i < 6; i++) {
    if (loads[i] >= 75 && loads[i + 1] >= 75) {
      alerts.push({ day: i, severity: "warning", message: "Doble jornada de alta intensidad", detail: `${DAY_NAMES[i]} y ${DAY_NAMES[i + 1]} con carga ≥ alta` });
      break;
    }
  }

  return alerts;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: number;
  title: string;
  sessionType: string;
  mdType?: string | null;
  date: string;
  duration: number;
  intensity: string;
  playerIds: number[];
  exercises: unknown[];
  notes?: string | null;
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({
  session, onDragStart, onDelete, isDragging,
}: {
  session: Session;
  onDragStart: () => void;
  onDelete: (id: number) => void;
  isDragging: boolean;
}) {
  const [, navigate] = useLocation();
  const cfg = TYPE_CONFIG[session.sessionType] ?? TYPE_CONFIG.technical;
  const icfg = INTENSITY_CONFIG[session.intensity] ?? INTENSITY_CONFIG.medium;
  const load = calcLoad(session);

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onClick={() => navigate(`/sessions/${session.id}`)}
      className={`group relative rounded-lg border p-2.5 cursor-grab active:cursor-grabbing select-none transition-all ${cfg.bg} ${cfg.border}
        ${isDragging ? "opacity-40 scale-95" : "hover:brightness-110"}`}
    >
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(session.id); }}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1 pr-4">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {session.mdType && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70">{session.mdType}</span>
        )}
      </div>

      {/* Title */}
      <div className={`text-[11px] font-semibold leading-snug mb-1.5 ${cfg.text}`}>
        {session.title}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="w-2.5 h-2.5" />
        <span>{session.duration}min</span>
        <span className={`ml-auto font-medium ${icfg.color}`}>{icfg.label}</span>
      </div>

      {/* Load bar */}
      <div className="mt-2 h-0.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${loadBarColor(load)}`} style={{ width: `${load}%` }} />
      </div>
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────
function DayColumn({
  day, dayIndex, matchDayIndex, sessions, draggingId, dragTarget,
  onDragOver, onDragLeave, onDrop, onAddSession, onDragStart, onDelete,
}: {
  day: Date; dayIndex: number; matchDayIndex: number;
  sessions: Session[]; draggingId: number | null; dragTarget: string | null;
  onDragOver: (dateStr: string) => void; onDragLeave: () => void;
  onDrop: (dateStr: string) => void; onAddSession: (dateStr: string) => void;
  onDragStart: (id: number) => void; onDelete: (id: number) => void;
}) {
  const dateStr = toDateStr(day);
  const mdLabel = getMdLabel(dayIndex, matchDayIndex);
  const mdColor = getMdColor(mdLabel);
  const isToday = toDateStr(new Date()) === dateStr;
  const isMatch = mdLabel === "MD";
  const isDragTarget = dragTarget === dateStr;
  const load = dayLoad(sessions);
  const isWeekend = dayIndex >= 5;

  return (
    <div
      className={`flex flex-col min-h-[500px] rounded-xl border transition-all
        ${isDragTarget ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10" : isMatch ? "border-red-500/20 bg-red-500/3" : isWeekend ? "border-border/50 bg-secondary/20" : "border-border bg-card/50"}
        ${isToday ? "ring-1 ring-primary/30" : ""}`}
      onDragOver={e => { e.preventDefault(); onDragOver(dateStr); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(dateStr); }}
    >
      {/* Day header */}
      <div className={`px-3 py-2.5 border-b ${isMatch ? "border-red-500/20" : "border-border/60"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-primary" : "text-muted-foreground"}`}>
            {DAY_NAMES[dayIndex]}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${mdColor}`}>
            {mdLabel}
          </span>
        </div>
        <div className={`text-lg font-bold leading-none ${isToday ? "text-primary" : isMatch ? "text-red-300" : "text-foreground"}`}>
          {day.getDate()}
          <span className="text-xs font-normal text-muted-foreground ml-1">{MONTHS_SHORT[day.getMonth()]}</span>
        </div>

        {/* Load bar */}
        {load > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Carga</span>
              <span className="text-[9px] font-medium text-muted-foreground">{Math.round(load)}</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${loadBarColor(load)}`} style={{ width: `${load}%` }} />
            </div>
          </div>
        )}

        {isMatch && (
          <div className="mt-1.5 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-red-400" />
            <span className="text-[9px] text-red-400/80 font-medium">Partido</span>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className={`flex-1 p-2 space-y-2 overflow-y-auto transition-all ${isDragTarget ? "bg-primary/5" : ""}`}>
        {sessions.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            onDragStart={() => onDragStart(s.id)}
            onDelete={onDelete}
            isDragging={draggingId === s.id}
          />
        ))}

        {/* Drop zone indicator */}
        {isDragTarget && (
          <div className="border-2 border-dashed border-primary/40 rounded-lg h-12 flex items-center justify-center">
            <span className="text-xs text-primary/60">Soltar aquí</span>
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-border/40">
        <button
          onClick={() => onAddSession(dateStr)}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg py-1.5 transition-colors"
        >
          <Plus className="w-3 h-3" /> Añadir sesión
        </button>
      </div>
    </div>
  );
}

// ─── Quick session modal ──────────────────────────────────────────────────────
function QuickAddModal({
  dateStr, onClose, onNavigateGenerator,
}: {
  dateStr: string; onClose: () => void; onNavigateGenerator: (date: string) => void;
}) {
  const d = new Date(dateStr + "T12:00:00");
  const dayName = DAY_NAMES_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1];
  const formattedDate = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-5 w-80 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Añadir sesión</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{dayName}, {formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onNavigateGenerator(dateStr)}
            className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-lg px-4 py-3 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Generar automáticamente</div>
              <div className="text-xs text-muted-foreground">Motor de prescripción neuromuscular</div>
            </div>
          </button>

          <Link href="/sessions">
            <button
              onClick={onClose}
              className="w-full flex items-center gap-3 bg-secondary/40 hover:bg-secondary border border-border rounded-lg px-4 py-3 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Crear manualmente</div>
                <div className="text-xs text-muted-foreground">Configurar tipo, intensidad y duración</div>
              </div>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────
function AlertsPanel({ alerts }: { alerts: WeekAlert[] }) {
  if (!alerts.length) return (
    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs font-medium">Sin conflictos detectados esta semana</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border text-xs
            ${a.severity === "critical"
              ? "bg-red-500/8 border-red-500/25 text-red-300"
              : "bg-yellow-500/8 border-yellow-500/25 text-yellow-300"}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{a.message}</div>
            <div className="opacity-70 mt-0.5">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Weekly summary bar chart ─────────────────────────────────────────────────
function WeekLoadChart({ days, sessionsByDay }: { days: Date[]; sessionsByDay: Record<string, SessionLike[]> }) {
  const loads = days.map(d => dayLoad(sessionsByDay[toDateStr(d)] ?? []));
  const max = Math.max(...loads, 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {loads.map((load, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: "44px" }}>
            <div
              className={`w-full rounded-sm transition-all ${load > 0 ? loadBarColor(load) : "bg-secondary"}`}
              style={{ height: load > 0 ? `${Math.max(4, (load / max) * 44)}px` : "2px", opacity: load > 0 ? 1 : 0.3 }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{DAY_NAMES[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyPlanner() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [matchDayIndex, setMatchDayIndex] = useState(6); // 0=Mon...6=Sun
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [showMatchConfig, setShowMatchConfig] = useState(false);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allSessions = [] } = useListSessions({});

  const updateMutation = useUpdateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Sesión actualizada" });
      },
      onError: () => toast({ title: "Error al mover sesión", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Sesión eliminada" });
      },
    },
  });

  // Week days array (Mon–Sun)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter sessions for this week
  const weekSessions = (allSessions as Session[]).filter(s =>
    days.some(d => sameDate(s.date, d)),
  );

  // Group by date string
  const sessionsByDay: Record<string, Session[]> = {};
  for (const d of days) sessionsByDay[toDateStr(d)] = [];
  for (const s of weekSessions) {
    const key = s.date.split("T")[0];
    if (sessionsByDay[key]) sessionsByDay[key].push(s);
  }

  const alerts = detectAlerts(days, sessionsByDay as Record<string, SessionLike[]>);

  // Week label
  const weekLabel = `${days[0].getDate()} ${MONTHS_SHORT[days[0].getMonth()]} – ${days[6].getDate()} ${MONTHS_SHORT[days[6].getMonth()]} ${days[6].getFullYear()}`;

  // Stats
  const totalLoad = weekSessions.reduce((a, s) => a + calcLoad(s), 0);
  const avgIntensity = weekSessions.length
    ? Math.round(weekSessions.reduce((a, s) => a + (INTENSITY_CONFIG[s.intensity]?.value ?? 50), 0) / weekSessions.length)
    : 0;

  function handleDrop(dateStr: string) {
    if (draggingId == null || dragTarget !== dateStr) return;
    const session = weekSessions.find(s => s.id === draggingId);
    if (!session || session.date.startsWith(dateStr)) {
      setDraggingId(null);
      setDragTarget(null);
      return;
    }
    updateMutation.mutate({ id: draggingId, data: { date: dateStr } });
    setDraggingId(null);
    setDragTarget(null);
  }

  function handleDragLeave() {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    dragLeaveTimer.current = setTimeout(() => setDragTarget(null), 80);
  }

  function handleDragOver(dateStr: string) {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setDragTarget(dateStr);
  }

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h1 className="text-base font-bold text-foreground tracking-tight">Planificación Semanal</h1>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Match day config */}
              <div className="relative">
                <button
                  onClick={() => setShowMatchConfig(v => !v)}
                  className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Trophy className="w-3 h-3 text-red-400" />
                  Partido: {DAY_NAMES_FULL[matchDayIndex]}
                </button>
                {showMatchConfig && (
                  <div className="absolute top-full mt-1 right-0 bg-card border border-border rounded-lg shadow-2xl z-20 p-2 w-40">
                    {DAY_NAMES_FULL.map((name, i) => (
                      <button
                        key={i}
                        onClick={() => { setMatchDayIndex(i); setShowMatchConfig(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${matchDayIndex === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setWeekStart(getMonday(new Date()))}
                className="flex items-center gap-1 border border-border rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <RefreshCcw className="w-3 h-3" /> Hoy
              </button>

              <div className="flex items-center gap-1 bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-foreground px-3 whitespace-nowrap">{weekLabel}</span>
                <button
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <Link href="/sessions/generate">
                <button className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg transition-all">
                  <Zap className="w-3.5 h-3.5" /> Generar
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 flex gap-4 min-w-[900px]">
            {/* 7-day grid */}
            <div className="flex-1 grid grid-cols-7 gap-2">
              {days.map((day, i) => (
                <DayColumn
                  key={i}
                  day={day}
                  dayIndex={i}
                  matchDayIndex={matchDayIndex}
                  sessions={sessionsByDay[toDateStr(day)] ?? []}
                  draggingId={draggingId}
                  dragTarget={dragTarget}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onAddSession={setQuickAddDate}
                  onDragStart={setDraggingId}
                  onDelete={id => deleteMutation.mutate({ id })}
                />
              ))}
            </div>

            {/* Right sidebar */}
            <div className="w-56 flex-shrink-0 space-y-4">
              {/* Week stats */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-3 h-3" /> Resumen
                </h3>

                <WeekLoadChart days={days} sessionsByDay={sessionsByDay as Record<string, SessionLike[]>} />

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sesiones</span>
                    <span className="text-xs font-bold text-foreground">{weekSessions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Carga media</span>
                    <span className={`text-xs font-bold ${loadBarColor(avgIntensity).replace("bg-", "text-")}`}>
                      {avgIntensity > 0 ? `${avgIntensity}/100` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Carga total</span>
                    <span className="text-xs font-bold text-foreground">{weekSessions.length > 0 ? Math.round(totalLoad) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Partido</span>
                    <span className="text-xs font-medium text-red-400">{DAY_NAMES_FULL[matchDayIndex]}</span>
                  </div>
                </div>
              </div>

              {/* Session type breakdown */}
              {weekSessions.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Tipos
                  </h3>
                  {Object.entries(
                    weekSessions.reduce((acc, s) => {
                      acc[s.sessionType] = (acc[s.sessionType] ?? 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  ).map(([type, count]) => {
                    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.technical;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-muted-foreground flex-1">{cfg.label}</span>
                        <span className="text-xs font-bold text-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Alerts */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Alertas
                  {alerts.length > 0 && (
                    <span className="ml-auto text-[9px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5">
                      {alerts.length}
                    </span>
                  )}
                </h3>
                <AlertsPanel alerts={alerts} />
              </div>

              {/* Quick links */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Acciones
                </h3>
                <Link href="/sessions/generate">
                  <button className="w-full flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary transition-all text-left">
                    <Zap className="w-3 h-3" /> Generar sesión
                  </button>
                </Link>
                <Link href="/sessions">
                  <button className="w-full flex items-center gap-2 hover:bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-all text-left">
                    <Dumbbell className="w-3 h-3" /> Ver todas las sesiones
                  </button>
                </Link>
                <Link href="/players">
                  <button className="w-full flex items-center gap-2 hover:bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-all text-left">
                    <Users className="w-3 h-3" /> Jugadores
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick add modal */}
      {quickAddDate && (
        <QuickAddModal
          dateStr={quickAddDate}
          onClose={() => setQuickAddDate(null)}
          onNavigateGenerator={(date) => {
            setQuickAddDate(null);
            navigate(`/sessions/generate?date=${date}`);
          }}
        />
      )}

      {/* Click outside match config */}
      {showMatchConfig && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMatchConfig(false)} />
      )}
    </Layout>
  );
}
