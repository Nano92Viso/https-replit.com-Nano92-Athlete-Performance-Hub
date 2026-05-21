import { Link } from "wouter";
import { useListPlayers, useGetPlayerNeuromuscular } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { FileText, FileDown, ChevronRight, Shield, Zap, Target, User, AlertTriangle, ShieldCheck } from "lucide-react";

const PROFILE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Power Profile":    { bg: "bg-blue-500/10",    border: "border-blue-500/25",   text: "text-blue-400" },
  "Perfil Neuromuscular": { bg: "bg-orange-500/10",  border: "border-orange-500/25", text: "text-orange-400" },
  "Force Profile":    { bg: "bg-purple-500/10",  border: "border-purple-500/25", text: "text-purple-400" },
  "Balanced Profile": { bg: "bg-emerald-500/10", border: "border-emerald-500/25",text: "text-emerald-400" },
};

const INJURY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  fit:         { bg: "bg-emerald-500/10 border-emerald-500/25", text: "text-emerald-400", label: "Apto" },
  minor_risk:  { bg: "bg-yellow-500/10 border-yellow-500/25",  text: "text-yellow-400",  label: "Riesgo Menor" },
  injured:     { bg: "bg-red-500/10 border-red-500/25",        text: "text-red-400",     label: "Lesionado" },
  recovery:    { bg: "bg-blue-500/10 border-blue-500/25",      text: "text-blue-400",    label: "Recuperación" },
};

function PlayerReportCard({ player }: { player: { id: number; name: string; position?: string | null; injuryStatus?: string | null; riskLevel?: string | null; squadNumber?: number | null } }) {
  const { data: neuro } = useGetPlayerNeuromuscular(player.id, {
    query: { enabled: true },
  });

  const inj = INJURY_CONFIG[player.injuryStatus ?? "fit"] ?? INJURY_CONFIG.fit;
  const profile = neuro?.profileType ? PROFILE_COLORS[neuro.profileType] : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all card-hover group">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
          {player.squadNumber
            ? <span className="text-lg font-black text-primary">{player.squadNumber}</span>
            : <User className="w-5 h-5 text-primary/60" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{player.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{player.position ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${inj.bg} ${inj.text}`}>
              {player.injuryStatus === "fit" ? <ShieldCheck className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
              {inj.label}
            </span>
            {neuro?.profileType && profile && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${profile.bg} ${profile.border} ${profile.text}`}>
                {neuro.profileType.replace(" Profile", "")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* LED scores mini */}
      {neuro && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Load", val: Number(neuro.load), color: "#f97316", icon: Shield },
            { label: "Explode", val: Number(neuro.explode), color: "#06b6d4", icon: Zap },
            { label: "Drive", val: Number(neuro.drive), color: "#8b5cf6", icon: Target },
          ].map(m => (
            <div key={m.label} className="bg-secondary/40 rounded-lg p-2 text-center">
              <div className="text-sm font-black tabular-nums" style={{ color: m.color }}>{Math.round(m.val)}</div>
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/players/${player.id}`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/20 rounded-lg py-2 transition-all">
            Ver perfil <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
        <Link href={`/players/${player.id}/report`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded-lg py-2 transition-all">
            <FileDown className="w-3 h-3" /> Informe PDF
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function Reports() {
  const { data: players = [], isLoading } = useListPlayers({});

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">Informes de Rendimiento</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Genera y descarga informes PDF individuales por jugador</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
              {players.length} jugadores
            </span>
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-5 py-3.5 flex items-center gap-3">
          <FileDown className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Cada informe incluye perfil neuromuscular LED, métricas de rendimiento, curva fuerza-velocidad, alertas activas, historial de sesiones y recomendaciones metodológicas automáticas.
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
            {players.map(p => (
              <PlayerReportCard key={p.id} player={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <User className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground">No hay jugadores registrados</p>
            <Link href="/players">
              <button className="flex items-center gap-2 text-xs font-semibold text-primary border border-primary/20 rounded-lg px-4 py-2 hover:bg-primary/5 transition-all">
                Añadir jugadores
              </button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
