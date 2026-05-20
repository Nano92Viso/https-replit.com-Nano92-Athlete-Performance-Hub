import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPlayer,
  useGetPlayerNeuromuscular,
  useGetPlayerAlerts,
  useListSessions,
  getGetPlayerQueryKey,
  getGetPlayerNeuromuscularQueryKey,
  getGetPlayerAlertsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import PlayerCard from "@/components/PlayerCard";
import BodyMap, { type InjuryEntry, ZONE_LABELS, BODY_ZONES } from "@/components/BodyMap";
import {
  BarChart, Bar, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  ArrowLeft, User, Activity, Dumbbell, AlertTriangle, ShieldCheck,
  Clock, Zap, Gauge, TrendingUp, Heart, FileDown, GitCompare,
  Plus, Stethoscope, ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── Config maps ──────────────────────────────────────────────────────────────

const injuryBadge: Record<string, string> = {
  fit: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  minor_risk: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  injured: "bg-red-500/15 text-red-400 border-red-500/30",
  recovery: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
const injuryLabel: Record<string, string> = {
  fit: "Apto", minor_risk: "Riesgo Menor", injured: "Lesionado", recovery: "Recuperación",
};
const profileTypeColor: Record<string, string> = {
  "Power Profile":    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Strength Profile": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Force Profile":    "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Balanced Profile": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};
const alertSeverityStyle: Record<string, { bar: string; icon: string; bg: string }> = {
  critical: { bar: "bg-red-500",    icon: "text-red-400",    bg: "bg-red-500/5 border-red-500/20" },
  warning:  { bar: "bg-yellow-500", icon: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20" },
  info:     { bar: "bg-blue-500",   icon: "text-blue-400",   bg: "bg-blue-500/5 border-blue-500/20" },
};
const sessionTypeLabel: Record<string, string> = {
  strength: "Fuerza", speed: "Velocidad", endurance: "Resistencia",
  technical: "Técnico", recovery: "Recuperación", match: "Partido",
};
const sessionTypeColor: Record<string, string> = {
  strength: "text-orange-400", speed: "text-blue-400", endurance: "text-emerald-400",
  technical: "text-purple-400", recovery: "text-cyan-400", match: "text-red-400",
};

const physicalStatusConfig: Record<string, { label: string; color: string; border: string; activeBg: string; dimBg: string }> = {
  available:  { label: "Disponible",   color: "text-emerald-400", border: "border-emerald-500/40", activeBg: "bg-emerald-500/20", dimBg: "bg-emerald-500/5" },
  injured:    { label: "Lesionado",    color: "text-red-400",     border: "border-red-500/40",     activeBg: "bg-red-500/20",     dimBg: "bg-red-500/5" },
  doubt:      { label: "Duda",         color: "text-yellow-400",  border: "border-yellow-500/40",  activeBg: "bg-yellow-500/20",  dimBg: "bg-yellow-500/5" },
  sanctioned: { label: "Sancionado",   color: "text-orange-400",  border: "border-orange-500/40",  activeBg: "bg-orange-500/20",  dimBg: "bg-orange-500/5" },
  recovery:   { label: "Recuperación", color: "text-blue-400",    border: "border-blue-500/40",    activeBg: "bg-blue-500/20",    dimBg: "bg-blue-500/5" },
};

const INJURY_TYPES = [
  "Contusión", "Esguince", "Rotura muscular", "Tendinopatía",
  "Fractura", "Luxación", "Sobrecarga", "Molestias sin determinar",
  "Trabajo al margen",
];

const SEASONS = ["2023/24", "2024/25", "2025/26", "2026/27"];

// ─── Types ────────────────────────────────────────────────────────────────────

type LegacyInjuryRecord = {
  date: string; type: string; description: string; daysOut: number; recovered?: boolean;
};

type InjuryDbRecord = {
  id: number;
  playerId: number;
  season: string;
  bodyZone: string;
  injuryType: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
};

type InjuryFormState = {
  season: string;
  bodyZone: string;
  injuryType: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const EMPTY_FORM: InjuryFormState = {
  season: "2025/26", bodyZone: "", injuryType: "",
  startDate: "", endDate: "", notes: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, status }: {
  label: string; value: number | null | undefined; unit: string;
  status?: "ok" | "warn" | "critical";
}) {
  const statusColor = status === "critical" ? "text-red-400" : status === "warn" ? "text-yellow-400" : "text-foreground";
  return (
    <div className="bg-secondary/50 rounded p-3 border border-border">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${statusColor}`}>
        {value != null ? value : "—"}
        {value != null && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

// ─── Synthetic CMJ force-time curve ──────────────────────────────────────────

function generateCmjCurve(heightCm: number, weightKg: number) {
  const g = 9.81, BW = weightKg * g;
  const h = Math.max(heightCm, 3) / 100;
  const flightMs = Math.sqrt(8 * h / g) * 1000;
  const t1 = 160, t2 = 370, t3 = 600, t4 = 870;
  const t5 = t4 + flightMs, t6 = t5 + 170, t7 = t5 + 520;
  const peakBraking = BW * (1.85 + heightCm / 90), peakLanding = BW * 2.65;
  function ease(x: number) { return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x; }
  function interp(t: number, t0: number, t1e: number, f0: number, f1: number) {
    return f0 + (f1 - f0) * ease(Math.max(0, Math.min(1, (t - t0) / (t1e - t0))));
  }
  const pts: Array<{ t: number; f: number }> = [];
  for (let t = 0; t <= 2700; t += 22) {
    let f: number;
    if      (t < t1) f = BW;
    else if (t < t2) f = interp(t, t1, t2, BW, BW * 0.10);
    else if (t < t3) f = interp(t, t2, t3, BW * 0.10, peakBraking);
    else if (t < t4) f = interp(t, t3, t4, peakBraking, 0);
    else if (t < t5) f = 0;
    else if (t < t6) f = interp(t, t5, t6, 0, peakLanding);
    else if (t < t7) f = interp(t, t6, t7, peakLanding, BW);
    else             f = BW;
    pts.push({ t: Math.round(t), f: Math.round(f) });
  }
  return pts;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlayerProfile() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Existing queries ──────────────────────────────────────────────────────
  const { data: player, isLoading: playerLoading } = useGetPlayer(id, {
    query: { enabled: !!id, queryKey: getGetPlayerQueryKey(id) },
  });
  const { data: neuro, isLoading: neuroLoading } = useGetPlayerNeuromuscular(id, {
    query: { enabled: !!id, queryKey: getGetPlayerNeuromuscularQueryKey(id) },
  });
  const { data: alerts = [] } = useGetPlayerAlerts(id, {
    query: { enabled: !!id, queryKey: getGetPlayerAlertsQueryKey(id) },
  });
  const { data: allSessions } = useListSessions();

  const playerSessions = allSessions?.filter(s => {
    const ids = (s.playerIds as number[]) ?? [];
    return ids.includes(id);
  }) ?? [];

  // ── Injuries ──────────────────────────────────────────────────────────────
  const [selectedSeason, setSelectedSeason] = useState<string>("2025/26");
  const [showAddInjury, setShowAddInjury] = useState(false);
  const [injuryForm, setInjuryForm] = useState<InjuryFormState>(EMPTY_FORM);

  const { data: allInjuries = [] } = useQuery<InjuryDbRecord[]>({
    queryKey: ["player-injuries", id],
    queryFn: () => fetch(`/api/players/${id}/injuries`).then(r => r.json()),
    enabled: !!id,
  });

  const filteredInjuries: InjuryEntry[] = (
    selectedSeason === "all"
      ? allInjuries
      : allInjuries.filter(i => i.season === selectedSeason)
  ).map(i => ({
    bodyZone: i.bodyZone,
    injuryType: i.injuryType,
    startDate: i.startDate,
    endDate: i.endDate,
  }));

  const createInjury = useMutation({
    mutationFn: (data: InjuryFormState) =>
      fetch(`/api/players/${id}/injuries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: data.season,
          bodyZone: data.bodyZone,
          injuryType: data.injuryType,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          notes: data.notes || undefined,
        }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-injuries", id] });
      setShowAddInjury(false);
      setInjuryForm(EMPTY_FORM);
      toast({ title: "Lesión registrada correctamente" });
    },
    onError: () => toast({ title: "Error al registrar lesión", variant: "destructive" }),
  });

  function submitInjury(e: React.FormEvent) {
    e.preventDefault();
    if (!injuryForm.season || !injuryForm.bodyZone || !injuryForm.injuryType || !injuryForm.startDate) return;
    createInjury.mutate(injuryForm);
  }

  // ── Physical status ───────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/players/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physicalStatus: status }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: getGetPlayerQueryKey(id) });
      const previous = queryClient.getQueryData(getGetPlayerQueryKey(id));
      queryClient.setQueryData(
        getGetPlayerQueryKey(id),
        (old: typeof player) => old ? { ...old, physicalStatus: status } : old,
      );
      return { previous };
    },
    onError: (_err, _status, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(getGetPlayerQueryKey(id), ctx.previous);
      toast({ title: "Error al actualizar el estado físico", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getGetPlayerQueryKey(id) });
    },
  });

  // ── Chart data ────────────────────────────────────────────────────────────
  const profileBars = neuro ? [
    { name: "Load",    value: Math.round(neuro.load),    color: "#4f7ef7", label: "avg RFD ecc" },
    { name: "Explode", value: Math.round(neuro.explode), color: "#22c55e", label: "avg rel. RFD con" },
    { name: "Drive",   value: Math.round(neuro.drive),   color: "#eab308", label: "avg rel. Impulse con" },
  ] : [];

  const jumpChartData = (() => {
    if (!neuro) return [];
    const wKg = player?.weight ? Number(player.weight) : 80;
    const h1 = neuro.cmjHeight   != null ? Number(neuro.cmjHeight)   : 35;
    const h2 = neuro.squatJump   != null ? Number(neuro.squatJump)   : h1 * 0.88;
    const h3 = h1 * 0.96;
    const c1 = generateCmjCurve(h1, wKg), c2 = generateCmjCurve(h2, wKg), c3 = generateCmjCurve(h3, wKg);
    return c1.map((pt, i) => ({ t: pt.t, j1: pt.f, j2: c2[i]?.f ?? 0, j3: c3[i]?.f ?? 0 }));
  })();

  const jumpLabels = neuro ? [
    `CMJ — ${neuro.cmjHeight != null ? Number(neuro.cmjHeight).toFixed(1) : "—"} cm`,
    `SJ  — ${neuro.squatJump != null ? Number(neuro.squatJump).toFixed(1) : "—"} cm`,
    `CMJ-2 — ${neuro.cmjHeight != null ? (Number(neuro.cmjHeight) * 0.96).toFixed(1) : "—"} cm`,
  ] : [];

  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const warningAlerts  = alerts.filter(a => a.severity === "warning");
  const infoAlerts     = alerts.filter(a => a.severity === "info");

  const injuryHistory = (player?.injuryHistory ?? []) as LegacyInjuryRecord[];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (playerLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-6xl mx-auto space-y-5 animate-pulse">
          <div className="h-6 w-32 bg-card rounded" />
          <div className="h-32 bg-card rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-card rounded" />
            <div className="h-64 bg-card rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <div className="p-6 max-w-6xl mx-auto">
          <Link href="/players">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Volver a Jugadores
            </button>
          </Link>
          <div className="bg-card border border-border rounded p-12 text-center">
            <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Jugador no encontrado</p>
          </div>
        </div>
      </Layout>
    );
  }

  // All new fields are now typed in the OpenAPI-generated Player interface

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Navigation + Action bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/players">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver a Jugadores
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/players/${id}/compare`}>
              <button
                className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap overflow-hidden shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-[1.03] active:scale-100"
                style={{ background: "linear-gradient(135deg, hsl(184 100% 35%), hsl(184 100% 50%) 60%, hsl(200 100% 55%))" }}
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-xl" />
                <GitCompare className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Comparar · Informe</span>
              </button>
            </Link>
            <Link href={`/players/${id}/report`}>
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-border hover:border-border/80 text-muted-foreground hover:text-foreground text-xs font-semibold px-3 py-2.5 rounded-xl transition-all whitespace-nowrap">
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
            </Link>
          </div>
        </div>

        {/* ── PlayerCard + player details ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">

          {/* PlayerCard */}
          <PlayerCard
            player={{
              id: player.id,
              name: player.name,
              position: player.position,
              number: player.number,
              age: player.age,
              team: player.team,
              nationality: player.nationality,
              height: player.height,
              injuryStatus: player.injuryStatus,
              riskLevel: player.riskLevel,
              photoUrl: player.photoUrl,
              physicalStatus: player.physicalStatus,
              preferredFoot: player.preferredFoot,
            }}
            latestMetrics={neuro ? {
              cmjHeight: neuro.cmjHeight,
              asymmetryIndex: neuro.asymmetryIndex,
              rsi: neuro.rsi,
              isometricForce: neuro.isometricForce,
              forcePerKg: neuro.forcePerKg,
              load: neuro.load,
              explode: neuro.explode,
              drive: neuro.drive,
            } : undefined}
          />

          {/* Player details panel */}
          <div className="bg-card border border-border rounded p-5 flex flex-col gap-4 h-full">
            {/* Details: estado físico + metadatos */}
            <div>
              {/* Physical status select */}
              {(() => {
                const status = player.physicalStatus ?? "available";
                const cfg = physicalStatusConfig[status] ?? physicalStatusConfig["available"];
                return (
                  <div className="flex items-center gap-2 mt-2 mb-1">
                    <Select
                      value={status}
                      onValueChange={v => updateStatus.mutate(v)}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className={`h-7 w-44 text-[11px] font-semibold border ${cfg.border} ${cfg.activeBg} ${cfg.color}`}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
                          <SelectValue />
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(physicalStatusConfig).map(([key, c]) => (
                          <SelectItem key={key} value={key} className={`text-[11px] ${c.color}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                              {c.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updateStatus.isPending && (
                      <span className="text-[10px] text-muted-foreground/50 animate-pulse">Guardando…</span>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{player.position}</span>
                {player.team && <span className="text-primary/80 font-medium">{player.team}</span>}
                {player.nationality && <span>{player.nationality}</span>}
                <span>{player.age} años</span>
                {player.height && <span>{player.height} cm</span>}
                {player.weight && <span>{player.weight} kg</span>}
                {player.dominantFoot && <span>Pie {player.dominantFoot}</span>}
                {player.birthDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDate(player.birthDate)}
                  </span>
                )}
                {player.contractEnd && (
                  <span className="text-muted-foreground/60 text-xs">Contrato hasta {formatDate(player.contractEnd)}</span>
                )}
                {player.lastTestDate && (
                  <span className="flex items-center gap-1 text-muted-foreground/60 text-xs">
                    <Clock className="w-3 h-3" /> Último test: {formatDate(player.lastTestDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Alert summary badges */}
            {alerts.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {criticalAlerts.length > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-xs text-red-400 font-medium">{criticalAlerts.length} crítico{criticalAlerts.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {warningAlerts.length > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">{warningAlerts.length} advertencia{warningAlerts.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {infoAlerts.length > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-xs text-blue-400 font-medium">{infoAlerts.length} info</span>
                  </div>
                )}
              </div>
            )}

            {/* Injury summary from DB */}
            {allInjuries.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground/60">Lesiones registradas:</span>
                <span className="text-red-400 font-semibold">{allInjuries.filter(i => !i.endDate).length} activas</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-orange-400 font-semibold">{allInjuries.filter(i => i.endDate).length} anteriores</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Main grid: Radar + Metrics ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Perfil Neuromuscular */}
          <div className="bg-card border border-border rounded p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Perfil Neuromuscular</h2>
              {neuro?.profileType && (
                <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${profileTypeColor[neuro.profileType] ?? "bg-secondary border-border text-muted-foreground"}`}>
                  {neuro.profileType}
                </span>
              )}
            </div>

            {neuroLoading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="w-full h-40 bg-secondary/50 animate-pulse rounded-lg" />
              </div>
            ) : neuro ? (
              <>
                {/* Load / Explode / Drive bars */}
                <div className="border border-border/50 rounded-lg bg-secondary/20 p-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={profileBars} margin={{ top: 8, right: 8, left: -18, bottom: 36 }} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                      <YAxis domain={[0, 100]} tickCount={5} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <ReferenceArea y1={42} y2={52} fill="#10b981" fillOpacity={0.08} />
                      <ReferenceLine y={42} stroke="#10b981" strokeDasharray="4 2" strokeOpacity={0.45} strokeWidth={1} />
                      <ReferenceLine y={52} stroke="#10b981" strokeDasharray="4 2" strokeOpacity={0.45} strokeWidth={1} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--border))", opacity: 0.2 }}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                        formatter={(v, _n, entry) => [
                          <span style={{ color: entry.payload.color, fontWeight: 700 }}>{`${v} / 100`}</span>,
                          entry.payload.label,
                        ]}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={80}>
                        {profileBars.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.88} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-1 px-2">
                    {profileBars.map(bar => (
                      <div key={bar.name} className="text-center">
                        <div className="text-[9px] text-muted-foreground/60 leading-tight">{bar.label}</div>
                        <div className="text-[10px] font-bold tabular-nums mt-0.5" style={{ color: bar.color }}>{bar.value}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CMJ force-time curves */}
                {jumpChartData.length > 0 && (
                  <div className="border border-border/50 rounded-lg bg-secondary/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Top 3 Saltos — Fuerza vs Tiempo</span>
                      <div className="flex items-center gap-3">
                        {([["#ef4444", jumpLabels[0]], ["#22c55e", jumpLabels[1]], ["#4f7ef7", jumpLabels[2]]] as [string, string][]).map(([c, l]) => (
                          <div key={l} className="flex items-center gap-1">
                            <div className="w-3 h-[2px] rounded" style={{ backgroundColor: c }} />
                            <span className="text-[9px] text-muted-foreground/70 font-mono">{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={165}>
                      <LineChart data={jumpChartData} margin={{ top: 4, right: 6, left: -20, bottom: 14 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.25} />
                        <XAxis dataKey="t" tickCount={6} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} label={{ value: "tiempo (ms)", position: "insideBottom", offset: -4, fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={false} label={{ value: "Fuerza (N)", angle: -90, position: "insideLeft", offset: 14, fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 10 }} formatter={(v: unknown, name: string) => { const map: Record<string, string> = { j1: jumpLabels[0], j2: jumpLabels[1], j3: jumpLabels[2] }; return [`${v} N`, map[name] ?? name]; }} labelFormatter={(l) => `t = ${l} ms`} />
                        <Line type="monotone" dataKey="j1" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="j2" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="j3" stroke="#4f7ef7" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Score bars */}
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Rango óptimo: 42–52</span>
                    <span className="text-[10px] text-muted-foreground/50">Score</span>
                  </div>
                  {[
                    { label: "Load", value: neuro.load, color: "#f97316" },
                    { label: "Explode", value: neuro.explode, color: "#06b6d4" },
                    { label: "Drive", value: neuro.drive, color: "#8b5cf6" },
                  ].map(({ label, value, color }) => {
                    const v = Math.round(value);
                    const inRange = v >= 42 && v <= 52;
                    const below = v < 42;
                    const status = inRange ? "Óptimo" : below ? "Déficit" : "Elevado";
                    const statusColor = inRange ? "#10b981" : below ? "#f59e0b" : "#3b82f6";
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: statusColor, background: `${statusColor}18` }}>{status}</span>
                            <span className="text-xs font-bold tabular-nums text-foreground w-6 text-right">{v}</span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="absolute h-full bg-emerald-500/15 rounded" style={{ left: "42%", width: "10%" }} />
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(v, 100)}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(() => {
                    const l = Math.round(neuro.load), e = Math.round(neuro.explode), d = Math.round(neuro.drive);
                    if (l >= 42 && l <= 52 && e >= 42 && e <= 52 && d >= 42 && d <= 52) return (
                      <div className="flex items-center gap-2 mt-1 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-semibold">Perfil equilibrado — Load, Explode y Drive dentro del rango óptimo</span>
                      </div>
                    );
                    return null;
                  })()}
                </div>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <Activity className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin perfil neuromuscular</p>
                <p className="text-xs text-muted-foreground/60">Importa datos de Chronojump para generar el radar</p>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Métricas de Salto y Fuerza</h2>
              </div>
              {neuroLoading ? (
                <div className="grid grid-cols-2 gap-2 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded" />)}
                </div>
              ) : neuro ? (
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="CMJ Height" value={neuro.cmjHeight != null ? Number(neuro.cmjHeight.toFixed(1)) : null} unit="cm" status={neuro.cmjHeight != null ? (neuro.cmjHeight < 25 ? "critical" : neuro.cmjHeight < 30 ? "warn" : "ok") : undefined} />
                  <MetricCard label="Squat Jump" value={neuro.squatJump != null ? Number(neuro.squatJump.toFixed(1)) : null} unit="cm" />
                  <MetricCard label="RSI" value={neuro.rsi != null ? Number(neuro.rsi.toFixed(2)) : null} unit="" status={neuro.rsi != null ? (neuro.rsi < 1.0 ? "critical" : neuro.rsi < 1.5 ? "warn" : "ok") : undefined} />
                  <div className="bg-secondary/50 rounded p-3 border border-amber-500/20 col-span-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Asimetría Bilateral</div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-400/90 leading-relaxed">Pendiente de datos Chronojump unilateral.</p>
                    </div>
                  </div>
                  <MetricCard label="Fuerza Isométrica" value={neuro.isometricForce != null ? Math.round(neuro.isometricForce) : null} unit="N" />
                  <MetricCard label="Fuerza Relativa" value={neuro.forcePerKg != null ? Number(neuro.forcePerKg.toFixed(1)) : null} unit="N/kg" status={neuro.forcePerKg != null ? (neuro.forcePerKg < 15 ? "critical" : neuro.forcePerKg < 20 ? "warn" : "ok") : undefined} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Sin datos disponibles</p>
              )}
            </div>

            {neuro && (neuro.maxSpeed != null || neuro.tToVmax != null || neuro.power != null) && (
              <div className="bg-card border border-border rounded p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Velocidad y Potencia</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {neuro.maxSpeed != null && <MetricCard label="Velocidad Máxima" value={Number(neuro.maxSpeed.toFixed(1))} unit="km/h" status={neuro.maxSpeed < 25 ? "critical" : neuro.maxSpeed < 28 ? "warn" : "ok"} />}
                  {neuro.tToVmax != null && <MetricCard label="t → Vmax" value={Number(neuro.tToVmax.toFixed(2))} unit="s" />}
                  {neuro.power != null && <MetricCard label="Potencia" value={Math.round(neuro.power)} unit="W" />}
                  {neuro.powerPerKg != null && <MetricCard label="Potencia Relativa" value={Number(neuro.powerPerKg.toFixed(1))} unit="W/kg" />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Interpretation ───────────────────────────────────────────────── */}
        {neuro?.interpretation && (
          <div className="bg-card border border-border rounded p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Interpretación del Perfil</h2>
              {neuro.profileType && (
                <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${profileTypeColor[neuro.profileType] ?? ""}`}>
                  {neuro.profileType}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{neuro.interpretation}</p>
            {neuro.testDate && (
              <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground/60">
                <Clock className="w-3 h-3" /> Test: {formatDate(neuro.testDate)}
              </div>
            )}
          </div>
        )}

        {/* ── Chronojump placeholder ───────────────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Imagen Chronojump · Perfil Original</h2>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground/50">Próximamente</span>
          </div>
          <div className="flex gap-5 flex-wrap">
            <div className="flex-1 min-w-[200px] h-36 rounded-lg border border-dashed border-border/60 bg-secondary/30 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Heart className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground/50 text-center px-4">Sube aquí la captura del perfil neuromuscular de Chronojump</p>
              <button disabled className="text-[10px] font-semibold text-muted-foreground/40 border border-border/40 rounded px-3 py-1 cursor-not-allowed">Subir imagen</button>
            </div>
            <div className="flex-1 min-w-[200px] flex flex-col justify-center gap-2">
              <div className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-1">Esta sección incluirá</div>
              {["Perfil F-V exportado de Chronojump", "Gráfico bilateral / unilateral original", "Curva de potencia original del test", "Imagen adjunta al informe PDF"].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="bg-card border border-border rounded p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Alertas de Rendimiento</h2>
              <span className="ml-auto text-xs text-muted-foreground">{alerts.length} activas</span>
            </div>
            <div className="space-y-3">
              {[...criticalAlerts, ...warningAlerts, ...infoAlerts].map(alert => {
                const style = alertSeverityStyle[alert.severity] ?? alertSeverityStyle["info"];
                return (
                  <div key={alert.id} className={`flex gap-3 p-3 rounded border ${style.bg}`}>
                    <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${style.bar}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${style.icon}`}>{alert.metric}</span>
                        {alert.value != null && <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{typeof alert.value === "number" ? alert.value.toFixed(alert.value < 10 ? 2 : 1) : alert.value}</span>}
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.recommendation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Mapa de lesiones ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex-1">
              Mapa de Lesiones
            </h2>

            {/* Season filter */}
            <div className="flex items-center gap-2">
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="bg-background border-border h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-xs">Todas</SelectItem>
                  {SEASONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowAddInjury(true)}>
              <Plus className="w-3.5 h-3.5" /> Añadir lesión
            </Button>
          </div>

          {/* BodyMap + legend */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <BodyMap
              injuries={filteredInjuries}
              onZoneClick={(zone) => {
                setInjuryForm(f => ({ ...f, bodyZone: zone }));
                setShowAddInjury(true);
              }}
            />

            {/* Injury list for the selected season */}
            {allInjuries.length > 0 && (
              <div className="flex-1 min-w-0 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-2">
                  {selectedSeason === "all" ? "Todas las lesiones" : `Lesiones ${selectedSeason}`}
                  <span className="ml-2 text-primary/70">{filteredInjuries.length}</span>
                </div>
                {filteredInjuries.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">Sin lesiones en esta temporada</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(selectedSeason === "all" ? allInjuries : allInjuries.filter(i => i.season === selectedSeason))
                      .sort((a, b) => b.startDate.localeCompare(a.startDate))
                      .map(inj => (
                        <div
                          key={inj.id}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-secondary/40 border border-border/60"
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${inj.endDate ? "bg-orange-400" : "bg-red-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">
                                {ZONE_LABELS[inj.bodyZone] ?? inj.bodyZone}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70 bg-secondary px-1.5 py-0.5 rounded">
                                {inj.injuryType}
                              </span>
                              {!inj.endDate && (
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Activa</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/60">
                              <span>{formatDate(inj.startDate)}</span>
                              {inj.endDate && <><span>→</span><span>{formatDate(inj.endDate)}</span></>}
                            </div>
                            {inj.notes && (
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{inj.notes}</p>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground/40 flex-shrink-0">{inj.season}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {allInjuries.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2 text-center">
                <Heart className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sin lesiones registradas</p>
                <p className="text-xs text-muted-foreground/60">
                  Haz clic en el mapa o usa "Añadir lesión" para registrar
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Legacy injury history ────────────────────────────────────────── */}
        {injuryHistory.length > 0 && (
          <div className="bg-card border border-border rounded p-5">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Historial Importado (CSV)</h2>
              <span className="ml-auto text-xs text-muted-foreground">{injuryHistory.length} registros</span>
            </div>
            <div className="divide-y divide-border">
              {injuryHistory.map((injury, idx) => (
                <div key={idx} className="py-3 flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="text-xs text-muted-foreground">{formatDate(injury.date)}</div>
                    <div className={`mt-1 text-xs font-medium ${injury.recovered ? "text-emerald-400" : "text-red-400"}`}>
                      {injury.recovered ? "Recuperado" : "Activo"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{injury.type}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{injury.description}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground">Baja</div>
                    <div className="text-sm font-bold text-foreground">{injury.daysOut}d</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Session history ───────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Historial de Sesiones</h2>
            <span className="ml-auto text-xs text-muted-foreground">{playerSessions.length} sesiones</span>
          </div>
          {playerSessions.length > 0 ? (
            <div className="divide-y divide-border">
              {playerSessions.map(s => (
                <Link key={s.id} href={`/sessions/${s.id}`}>
                  <div className="flex items-center gap-3 py-3 hover:bg-secondary/30 -mx-2 px-2 rounded cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{s.title}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs ${sessionTypeColor[s.sessionType] ?? "text-muted-foreground"}`}>{sessionTypeLabel[s.sessionType] ?? s.sessionType}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(s.date)}</span>
                        <span className="text-xs text-muted-foreground">{s.duration} min</span>
                      </div>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground rotate-180 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Este jugador no tiene sesiones registradas</p>
          )}
        </div>

        {/* ── Add injury modal ──────────────────────────────────────────────── */}
        <Dialog open={showAddInjury} onOpenChange={open => { if (!open) { setShowAddInjury(false); setInjuryForm(EMPTY_FORM); } }}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                Registrar Lesión
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={submitInjury} className="space-y-4">

              {/* Season + Zone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Temporada *</label>
                  <Select value={injuryForm.season} onValueChange={v => setInjuryForm(f => ({ ...f, season: v }))}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Zona corporal *</label>
                  <Select value={injuryForm.bodyZone} onValueChange={v => setInjuryForm(f => ({ ...f, bodyZone: v }))}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {BODY_ZONES.map(z => (
                        <SelectItem key={z} value={z}>{ZONE_LABELS[z] ?? z}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Injury type */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tipo de lesión *</label>
                <Select value={injuryForm.injuryType} onValueChange={v => setInjuryForm(f => ({ ...f, injuryType: v }))}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {INJURY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Fecha inicio *</label>
                  <Input
                    type="date"
                    value={injuryForm.startDate}
                    onChange={e => setInjuryForm(f => ({ ...f, startDate: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Fecha fin</label>
                  <Input
                    type="date"
                    value={injuryForm.endDate}
                    onChange={e => setInjuryForm(f => ({ ...f, endDate: e.target.value }))}
                    className="bg-background border-border"
                    placeholder="Dejar vacío si activa"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/50 -mt-2">
                Deja "Fecha fin" vacía si la lesión sigue activa
              </p>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Notas</label>
                <Textarea
                  value={injuryForm.notes}
                  onChange={e => setInjuryForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observaciones, contexto clínico…"
                  className="bg-background border-border text-sm resize-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowAddInjury(false); setInjuryForm(EMPTY_FORM); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !injuryForm.season || !injuryForm.bodyZone ||
                    !injuryForm.injuryType || !injuryForm.startDate ||
                    createInjury.isPending
                  }
                >
                  {createInjury.isPending ? "Guardando…" : "Guardar lesión"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
