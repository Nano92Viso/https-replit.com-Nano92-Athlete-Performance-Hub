import { ShieldCheck, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

// Base player fields from GetPlayerResponse + new schema fields not yet in OpenAPI
export type PlayerCardData = {
  id: number;
  name: string;
  position: string;
  number: number;
  age: number;
  team?: string | null;
  nationality?: string | null;
  height?: number | null;
  injuryStatus: string;
  riskLevel: string;
  photoUrl?: string | null;
  // New fields (added to DB schema but not yet in OpenAPI spec)
  physicalStatus?: string | null;
  preferredFoot?: string | null;
  subteamId?: number | null;
  // subteam name resolved externally if needed
  subteamName?: string | null;
};

export type NeuromuscularMetrics = {
  cmjHeight?: number | null;
  asymmetryIndex?: number | null;
  rsi?: number | null;
  isometricForce?: number | null;
  forcePerKg?: number | null;
  load?: number;
  explode?: number;
  drive?: number;
};

type Props = {
  player: PlayerCardData;
  latestMetrics?: NeuromuscularMetrics;
};

// ─── Config maps ──────────────────────────────────────────────────────────────

const physicalStatusConfig: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  available:  { label: "Disponible",   dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/25" },
  doubt:      { label: "Duda",         dot: "bg-yellow-400",  text: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/25" },
  recovery:   { label: "Recuperación", dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  injured:    { label: "Lesionado",    dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/25" },
  sanctioned: { label: "Sancionado",   dot: "bg-orange-400",  text: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25" },
};

const footLabel: Record<string, string> = {
  right: "Derecho", left: "Izquierdo", both: "Ambos",
};

const injuryStatusConfig: Record<string, { label: string; color: string }> = {
  fit:         { label: "Apto",          color: "text-emerald-400" },
  minor_risk:  { label: "Riesgo menor",  color: "text-yellow-400"  },
  injured:     { label: "Lesionado",     color: "text-red-400"     },
  recovery:    { label: "Recuperación",  color: "text-blue-400"    },
};

// ─── Stat mini-card ───────────────────────────────────────────────────────────

function StatCell({ label, value, unit, warn }: {
  label: string; value?: number | null; unit: string; warn?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg"
      style={{ background: "hsl(230 20% 8%)", border: "1px solid hsl(230 14% 11%)" }}
    >
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold leading-none">
        {label}
      </span>
      <span className={`text-lg font-black tabular-nums leading-none mt-0.5 ${warn ? "text-yellow-400" : "text-foreground"}`}>
        {value != null ? value : "—"}
        {value != null && (
          <span className="text-[10px] font-normal text-muted-foreground/60 ml-0.5">{unit}</span>
        )}
      </span>
    </div>
  );
}

// ─── PlayerCard ───────────────────────────────────────────────────────────────

export default function PlayerCard({ player, latestMetrics }: Props) {
  const initials = player.name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("");

  const statusCfg = player.physicalStatus
    ? (physicalStatusConfig[player.physicalStatus] ?? physicalStatusConfig["available"])
    : null;

  const injuryCfg = injuryStatusConfig[player.injuryStatus] ?? injuryStatusConfig["fit"];

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden w-full"
      style={{
        background: "linear-gradient(160deg, hsl(220 25% 7%) 0%, hsl(230 20% 4%) 100%)",
        border: "1px solid hsl(184 60% 35% / 0.22)",
        boxShadow: "0 0 0 1px hsl(184 100% 42% / 0.06), 0 8px 32px hsl(184 100% 42% / 0.04)",
      }}
    >
      {/* ── Top band with gradient accent ────────────────────────────────── */}
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, hsl(184 100% 35%), hsl(200 100% 45%))" }}
      />

      {/* ── Avatar + identity ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-16 h-16 rounded-full object-cover"
              style={{ border: "2px solid hsl(184 100% 42% / 0.4)" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(184 100% 42% / 0.22), hsl(200 100% 40% / 0.08))",
                border: "2px solid hsl(184 100% 42% / 0.38)",
              }}
            >
              <span className="text-xl font-black text-primary/90 tracking-tight select-none">
                {initials}
              </span>
            </div>
          )}
          {/* Dorsal badge */}
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-card"
            style={{ background: "hsl(184 100% 38%)" }}
          >
            <span className="text-[9px] font-black text-white leading-none">{player.number}</span>
          </div>
        </div>

        {/* Name + position */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-foreground tracking-tight leading-tight truncate">
            {player.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{
                background: "hsl(184 100% 42% / 0.12)",
                border: "1px solid hsl(184 100% 42% / 0.28)",
                color: "hsl(184 100% 55%)",
              }}
            >
              {player.position}
            </span>
            {player.team && (
              <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                {player.team}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats 2×2 grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <StatCell
          label="CMJ"
          value={latestMetrics?.cmjHeight != null ? Number(latestMetrics.cmjHeight.toFixed(1)) : null}
          unit="cm"
          warn={latestMetrics?.cmjHeight != null && latestMetrics.cmjHeight < 28}
        />
        <StatCell
          label="Asimetría"
          value={latestMetrics?.asymmetryIndex != null ? Number(latestMetrics.asymmetryIndex.toFixed(1)) : null}
          unit="%"
          warn={latestMetrics?.asymmetryIndex != null && latestMetrics.asymmetryIndex > 10}
        />
        <StatCell
          label="RSI"
          value={latestMetrics?.rsi != null ? Number(latestMetrics.rsi.toFixed(2)) : null}
          unit=""
          warn={latestMetrics?.rsi != null && latestMetrics.rsi < 1.0}
        />
        <StatCell
          label="F. Isométrica"
          value={latestMetrics?.isometricForce != null ? Math.round(latestMetrics.isometricForce) : null}
          unit="N"
        />
      </div>

      {/* ── Footer: status + foot ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
        style={{ borderTop: "1px solid hsl(230 14% 10%)" }}
      >
        {/* Physical / injury status */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusCfg ? (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${injuryCfg.color}`}>
              {player.injuryStatus === "fit"
                ? <ShieldCheck className="w-3 h-3" />
                : <AlertTriangle className="w-3 h-3" />}
              {injuryCfg.label}
            </span>
          )}
        </div>

        {/* Preferred foot + nationality */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          {player.preferredFoot && (
            <span>
              Pie <span className="font-semibold text-muted-foreground/80">{footLabel[player.preferredFoot] ?? player.preferredFoot}</span>
            </span>
          )}
          {player.nationality && (
            <span className="font-semibold text-muted-foreground/70">{player.nationality}</span>
          )}
          {player.height && (
            <span>{player.height} cm</span>
          )}
        </div>
      </div>
    </div>
  );
}
