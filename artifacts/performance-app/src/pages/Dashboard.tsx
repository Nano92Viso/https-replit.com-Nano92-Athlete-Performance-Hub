import { Link } from "wouter";
import { useGetDashboardStats, useGetDashboardAlerts } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import {
  Users, ShieldCheck, AlertTriangle, Dumbbell, TrendingUp,
  Activity, Clock, Zap, CalendarDays, FileText, UserPlus,
  ChevronRight, Shield, Flame, Target, BarChart3, GitCompare,
  FileDown, ArrowRight,
} from "lucide-react";

// ─── date ────────────────────────────────────────────────────────────────────
const formattedDate = new Date().toLocaleDateString("es-ES", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ─── Hero quick stat ──────────────────────────────────────────────────────────
function QuickStat({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div className="text-center px-5">
      <div className={`text-4xl font-black tabular-nums leading-none ${color}`}>
        {value ?? "—"}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accentColor, testId }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accentColor: string; testId?: string;
}) {
  return (
    <div
      className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-4 cursor-default transition-all"
      data-testid={testId ?? `card-stat-${label}`}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</span>
      </div>
      <div>
        <div className="text-4xl font-black text-foreground tabular-nums leading-none">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>}
      </div>
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-40"
        style={{ background: accentColor }}
      />
    </div>
  );
}

// ─── Quick action ─────────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, href, color = "hsl(184 100% 42%)" }: {
  icon: React.ElementType; label: string; href: string; color?: string;
}) {
  return (
    <Link href={href}>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-white/[0.04] transition-all text-sm font-medium text-muted-foreground hover:text-foreground group"
      >
        <Icon className="w-4 h-4 transition-colors" style={{ color }} />
        {label}
        <ChevronRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
    </Link>
  );
}

// ─── LED score bar ────────────────────────────────────────────────────────────
function LedBar({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: React.ElementType;
}) {
  const pct = Math.round(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-black tabular-nums" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}70, ${color})` }}
        />
      </div>
    </div>
  );
}

// ─── Severity helpers ─────────────────────────────────────────────────────────
const SEV_CONFIG: Record<string, { dot: string; bg: string; border: string; label: string; text: string }> = {
  critical: { dot: "bg-red-500",    bg: "bg-red-500/5",    border: "border-red-500/15",    label: "CRÍTICO",  text: "text-red-400" },
  warning:  { dot: "bg-yellow-500", bg: "bg-yellow-500/5", border: "border-yellow-500/15", label: "ATENCIÓN", text: "text-yellow-400" },
  info:     { dot: "bg-blue-400",   bg: "bg-blue-400/5",   border: "border-blue-400/15",   label: "INFO",     text: "text-blue-400" },
};

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "Ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: alerts = [], isLoading: alertsLoading } = useGetDashboardAlerts();

  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const warningAlerts  = alerts.filter(a => a.severity === "warning");

  return (
    <Layout>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="hero-gradient border-b border-border/60 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-7 flex items-center gap-8 flex-wrap">
          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary/70">Club Performance Dept. · Temporada 2025/26</span>
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight leading-none">
              Análisis del Equipo
            </h1>
            <p className="text-sm text-muted-foreground mt-2 capitalize">{formattedDate}</p>
          </div>

          {/* Quick stats */}
          {!statsLoading && stats && (
            <div className="flex items-center divide-x divide-border/60">
              <QuickStat label="Aptos" value={stats.fitPlayers} color="text-emerald-400" />
              <QuickStat label="Lesionados" value={stats.injuredPlayers} color="text-red-400" />
              <QuickStat label="Alto Riesgo" value={stats.highRiskPlayers} color="text-yellow-400" />
              <QuickStat label="Sesiones / sem" value={stats.sessionsThisWeek} color="text-primary" />
            </div>
          )}
        </div>

        {/* Gradient separator */}
        <div className="gradient-sep" />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">

        {/* KPI Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-[108px] animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
            <div className="relative">
              <StatCard label="Plantel Total" value={stats.totalPlayers} sub={`${stats.fitPlayers} activos disponibles`} icon={Users} accentColor="#06b6d4" testId="card-stat-plantel-total" />
            </div>
            <div className="relative">
              <StatCard label="Disponibles" value={stats.fitPlayers} sub="Estado apto · listos" icon={ShieldCheck} accentColor="#10b981" testId="card-stat-disponibles" />
            </div>
            <div className="relative">
              <StatCard label="Lesionados" value={stats.injuredPlayers} sub={`${stats.highRiskPlayers} en alto riesgo`} icon={AlertTriangle} accentColor="#ef4444" testId="card-stat-lesionados" />
            </div>
            <div className="relative">
              <StatCard label="Sesiones / Semana" value={stats.sessionsThisWeek} sub="Últimos 7 días" icon={Dumbbell} accentColor="#f97316" testId="card-stat-sesiones-/-semana" />
            </div>
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mr-1">Acceso rápido</span>
          <QuickAction icon={Zap} label="Generar Sesión" href="/sessions/generate" color="hsl(184 100% 42%)" />
          <QuickAction icon={CalendarDays} label="Planificación" href="/planner" color="#8b5cf6" />
          <QuickAction icon={Users} label="Jugadores" href="/players" color="#06b6d4" />
          <QuickAction icon={FileText} label="Informes" href="/reports" color="#f97316" />
        </div>

        {/* Informes CTA card */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card">
          {/* Glow backdrop */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 120% at 90% 50%, hsl(184 100% 42% / 0.10) 0%, transparent 70%)" }} />
          <div className="relative flex items-center gap-6 px-6 py-5 flex-wrap">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(184 100% 35% / 0.25), hsl(184 100% 50% / 0.15))", border: "1px solid hsl(184 100% 42% / 0.30)" }}>
              <GitCompare className="w-5 h-5 text-primary" />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-0.5">Análisis de Evolución</div>
              <h3 className="text-base font-black text-foreground leading-tight">Comparador de Tests · Informes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Compara tests neuromusculares entre fechas y genera informes de evolución por jugador</p>
            </div>
            {/* Acciones */}
            <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
              <Link href="/players">
                <button className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white overflow-hidden shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all hover:scale-[1.03] active:scale-100"
                  style={{ background: "linear-gradient(135deg, hsl(184 100% 35%), hsl(184 100% 50%) 60%, hsl(200 100% 55%))" }}>
                  <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-xl" />
                  <GitCompare className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">Ir al Comparador</span>
                </button>
              </Link>
              <Link href="/reports">
                <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-border text-muted-foreground hover:text-foreground text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap">
                  <FileDown className="w-3.5 h-3.5" />
                  Todos los Informes
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </div>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(184 100% 42%), transparent)" }} />
        </div>

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Neuromuscular Profile */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 card-hover">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">Perfil Neuromuscular Medio</h2>
            </div>

            {statsLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-7 bg-secondary rounded-lg" />)}
              </div>
            ) : stats ? (
              <div className="space-y-3.5">
                <LedBar label="Load" value={stats.avgLoadScore} color="#f97316" icon={Shield} />
                <LedBar label="Explode" value={stats.avgExplodeScore} color="#06b6d4" icon={Zap} />
                <LedBar label="Drive" value={stats.avgDriveScore} color="#8b5cf6" icon={Target} />
              </div>
            ) : null}

            {stats && (
              <div className="pt-2 border-t border-border/60">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Load", val: stats.avgLoadScore, color: "#f97316" },
                    { label: "Explode", val: stats.avgExplodeScore, color: "#06b6d4" },
                    { label: "Drive", val: stats.avgDriveScore, color: "#8b5cf6" },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/50 rounded-lg py-2">
                      <div className="text-lg font-black tabular-nums" style={{ color: item.color }}>
                        {Math.round(item.val)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/players">
              <button className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1 hover:bg-secondary/50 rounded-lg transition-colors">
                Ver todos los jugadores <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          {/* Alerts */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 card-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                </div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">Alertas de Rendimiento</h2>
              </div>
              {alerts.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {criticalAlerts.length} críticas
                </span>
              )}
            </div>

            {alertsLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-secondary rounded-lg" />)}
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-2">
                {[...criticalAlerts, ...warningAlerts, ...alerts.filter(a => a.severity === "info")]
                  .slice(0, 5)
                  .map(alert => {
                    const cfg = SEV_CONFIG[alert.severity] ?? SEV_CONFIG.info;
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${cfg.bg} ${cfg.border}`}
                        data-testid={`alert-${alert.id}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black tracking-widest ${cfg.text}`}>{cfg.label}</span>
                            <span className="text-xs font-semibold text-foreground truncate">{alert.playerName}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{alert.message}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">Sin alertas activas</p>
                <p className="text-xs text-muted-foreground/60">Plantel en estado óptimo</p>
              </div>
            )}

            {alerts.length > 5 && (
              <Link href="/players">
                <button className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1 hover:bg-secondary/50 rounded-lg transition-colors">
                  Ver {alerts.length - 5} alertas más <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            )}
          </div>

          {/* Activity */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 card-hover">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">Actividad Reciente</h2>
            </div>

            {statsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-secondary rounded-lg" />)}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-1">
                {stats.recentActivity.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex gap-3 items-start px-2 py-2.5 rounded-lg hover:bg-secondary/40 transition-colors"
                    data-testid={`activity-${item.id}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {i < (stats.recentActivity?.length ?? 0) - 1 && (
                        <div className="w-px h-full min-h-3 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
              </div>
            )}

            <div className="pt-2 border-t border-border/60">
              <div className="flex gap-2">
                <Link href="/sessions" className="flex-1">
                  <button className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1.5 hover:bg-secondary/50 rounded-lg transition-colors border border-transparent hover:border-border">
                    <Dumbbell className="w-3 h-3" /> Ver sesiones
                  </button>
                </Link>
                <Link href="/sessions/generate" className="flex-1">
                  <button className="w-full text-xs text-primary/80 hover:text-primary flex items-center justify-center gap-1.5 py-1.5 hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20">
                    <Zap className="w-3 h-3" /> Generar
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance Banner */}
        {stats && (
          <div
            className="rounded-xl border border-border/60 p-5 flex items-center justify-between flex-wrap gap-4"
            style={{ background: "linear-gradient(135deg, hsl(230 18% 5.5%) 0%, hsl(200 20% 5%) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Estado del equipo</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stats.fitPlayers} de {stats.totalPlayers} jugadores disponibles ·{" "}
                  {stats.highRiskPlayers > 0
                    ? <span className="text-yellow-400">{stats.highRiskPlayers} en seguimiento</span>
                    : <span className="text-emerald-400">todos en estado óptimo</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/players">
                <button className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 rounded-lg px-3 py-2 transition-all">
                  <Users className="w-3.5 h-3.5" /> Gestionar plantel
                </button>
              </Link>
              <Link href="/reports">
                <button className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded-lg px-3 py-2 transition-all">
                  <FileText className="w-3.5 h-3.5" /> Ver informes
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
