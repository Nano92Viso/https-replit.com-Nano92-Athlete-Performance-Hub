import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InjuryEntry = {
  bodyZone: string;
  injuryType: string;
  startDate: string;
  endDate: string | null;
};

type Props = {
  injuries: InjuryEntry[];
  compact?: boolean;
  onZoneClick?: (zone: string) => void;
};

// ─── Zone metadata ────────────────────────────────────────────────────────────

export const BODY_ZONES = [
  "head", "neck", "shoulder", "chest", "abdomen", "groin",
  "quadriceps", "hamstring", "knee", "calf", "ankle", "foot",
  "back", "glute", "forearm", "hand",
] as const;

export type BodyZone = typeof BODY_ZONES[number];

export const ZONE_LABELS: Record<string, string> = {
  head:        "Cabeza",
  neck:        "Cuello",
  shoulder:    "Hombro",
  chest:       "Pecho",
  abdomen:     "Abdomen",
  groin:       "Ingle",
  quadriceps:  "Cuádriceps",
  hamstring:   "Isquiotibiales",
  knee:        "Rodilla",
  calf:        "Gemelo / Pantorrilla",
  ankle:       "Tobillo",
  foot:        "Pie",
  back:        "Espalda",
  glute:       "Glúteo",
  forearm:     "Antebrazo",
  hand:        "Mano",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function zoneStats(zone: string, injuries: InjuryEntry[]) {
  const zi = injuries.filter(i => i.bodyZone === zone);
  const active = zi.filter(i => !i.endDate).length;
  return { total: zi.length, active, past: zi.length - active };
}

function zoneFill(zone: string, injuries: InjuryEntry[], hovered: boolean): string {
  const { active, past } = zoneStats(zone, injuries);
  if (active > 0) return hovered ? "hsla(0,72%,65%,0.95)"   : "hsla(0,72%,52%,0.88)";
  if (past  > 0) return hovered ? "hsla(28,78%,60%,0.90)"  : "hsla(28,78%,48%,0.72)";
  return               hovered ? "hsla(184,42%,30%,0.90)"  : "hsla(184,38%,18%,0.75)";
}

function zoneStroke(zone: string, injuries: InjuryEntry[]): string {
  const { active, past } = zoneStats(zone, injuries);
  if (active > 0) return "hsla(0,72%,72%,0.55)";
  if (past  > 0) return "hsla(28,78%,68%,0.45)";
  return               "hsla(184,55%,48%,0.28)";
}

// ─── Zone group wrapper ───────────────────────────────────────────────────────

type ZProps = {
  zone: string;
  injuries: InjuryEntry[];
  hovered: string | null;
  onEnter: (z: string, e: React.MouseEvent<SVGElement>) => void;
  onLeave: () => void;
  onMove:  (e: React.MouseEvent<SVGElement>) => void;
  onClick?: (z: string) => void;
  children: React.ReactNode;
};

function Z({ zone, injuries, hovered, onEnter, onLeave, onMove, onClick, children }: ZProps) {
  const isHov = hovered === zone;
  return (
    <g
      fill={zoneFill(zone, injuries, isHov)}
      stroke={zoneStroke(zone, injuries)}
      strokeWidth={isHov ? 1.8 : 0.9}
      style={{ cursor: onClick ? "pointer" : "default", transition: "fill 0.12s, stroke 0.12s" }}
      onMouseEnter={e => onEnter(zone, e)}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      onClick={() => onClick?.(zone)}
    >
      {children}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BodyMap({ injuries, compact = false, onZoneClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function onEnter(zone: string, e: React.MouseEvent<SVGElement>) {
    setHovered(zone);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function onLeave() { setHovered(null); setTipPos(null); }
  function onMove(e: React.MouseEvent<SVGElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const zp = { injuries, hovered, onEnter, onLeave, onMove, onClick: onZoneClick } as const;

  const W = compact ? 76 : 110;
  const FH = compact ? 228 : 330;  // front height
  const BH = compact ? 215 : 310;  // back height

  const totalActive = injuries.filter(i => !i.endDate).length;
  const totalPast   = injuries.filter(i =>  i.endDate).length;

  return (
    <div ref={containerRef} className="relative select-none" style={{ userSelect: "none" }}>

      {/* ── Tooltip ──────────────────────────────────────────────────────────── */}
      {tipPos && hovered && (
        <div
          className="absolute z-20 px-2.5 py-1.5 bg-card border border-border rounded-md shadow-xl pointer-events-none text-xs whitespace-nowrap"
          style={{ left: tipPos.x + 14, top: tipPos.y - 36 }}
        >
          <span className="font-semibold text-foreground">
            {ZONE_LABELS[hovered] ?? hovered}
          </span>
          {(() => {
            const s = zoneStats(hovered, injuries);
            if (s.total === 0) return <span className="ml-2 text-muted-foreground/60">Sin lesiones</span>;
            return (
              <span className="ml-2 space-x-1">
                {s.active > 0 && (
                  <span className="text-red-400 font-medium">
                    {s.active} activa{s.active !== 1 ? "s" : ""}
                  </span>
                )}
                {s.active > 0 && s.past > 0 && <span className="text-muted-foreground/40">·</span>}
                {s.past > 0 && (
                  <span className="text-orange-400 font-medium">
                    {s.past} pasada{s.past !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
            );
          })()}
        </div>
      )}

      {/* ── SVG views ────────────────────────────────────────────────────────── */}
      <div className={`flex ${compact ? "gap-2" : "gap-8"} justify-center items-start`}>

        {/* Front view */}
        <div className="flex flex-col items-center gap-1">
          {!compact && (
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold">
              Frontal
            </span>
          )}
          <svg viewBox="0 0 110 330" width={W} height={FH}>

            <Z zone="head" {...zp}>
              <circle cx="55" cy="22" r="18" />
            </Z>
            <Z zone="neck" {...zp}>
              <ellipse cx="55" cy="43" rx="9" ry="7" />
            </Z>
            <Z zone="shoulder" {...zp}>
              <ellipse cx="21" cy="65" rx="19" ry="13" />
              <ellipse cx="89" cy="65" rx="19" ry="13" />
            </Z>
            <Z zone="chest" {...zp}>
              <rect x="35" y="51" width="40" height="46" rx="5" />
            </Z>
            <Z zone="abdomen" {...zp}>
              <rect x="37" y="97" width="36" height="38" rx="4" />
            </Z>
            <Z zone="groin" {...zp}>
              <rect x="41" y="135" width="28" height="20" rx="6" />
            </Z>
            <Z zone="forearm" {...zp}>
              <rect x="4"  y="86" width="14" height="50" rx="6" />
              <rect x="92" y="86" width="14" height="50" rx="6" />
            </Z>
            <Z zone="hand" {...zp}>
              <ellipse cx="11"  cy="142" rx="12" ry="9" />
              <ellipse cx="99"  cy="142" rx="12" ry="9" />
            </Z>
            <Z zone="quadriceps" {...zp}>
              <rect x="32" y="155" width="21" height="65" rx="8" />
              <rect x="57" y="155" width="21" height="65" rx="8" />
            </Z>
            <Z zone="knee" {...zp}>
              <ellipse cx="42" cy="226" rx="14" ry="9" />
              <ellipse cx="68" cy="226" rx="14" ry="9" />
            </Z>
            <Z zone="calf" {...zp}>
              <rect x="30" y="235" width="20" height="55" rx="7" />
              <rect x="60" y="235" width="20" height="55" rx="7" />
            </Z>
            <Z zone="ankle" {...zp}>
              <ellipse cx="40" cy="295" rx="14" ry="8" />
              <ellipse cx="70" cy="295" rx="14" ry="8" />
            </Z>
            <Z zone="foot" {...zp}>
              <ellipse cx="40" cy="313" rx="17" ry="9" />
              <ellipse cx="70" cy="313" rx="17" ry="9" />
            </Z>

          </svg>
        </div>

        {/* Back view */}
        <div className="flex flex-col items-center gap-1">
          {!compact && (
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold">
              Posterior
            </span>
          )}
          <svg viewBox="0 0 110 310" width={W} height={BH}>

            <Z zone="head" {...zp}>
              <circle cx="55" cy="22" r="18" />
            </Z>
            <Z zone="neck" {...zp}>
              <ellipse cx="55" cy="43" rx="9" ry="7" />
            </Z>
            <Z zone="shoulder" {...zp}>
              <ellipse cx="21" cy="65" rx="19" ry="13" />
              <ellipse cx="89" cy="65" rx="19" ry="13" />
            </Z>
            <Z zone="back" {...zp}>
              <rect x="35" y="51" width="40" height="84" rx="5" />
            </Z>
            <Z zone="glute" {...zp}>
              <ellipse cx="40" cy="153" rx="20" ry="20" />
              <ellipse cx="70" cy="153" rx="20" ry="20" />
            </Z>
            <Z zone="hamstring" {...zp}>
              <rect x="31" y="170" width="20" height="60" rx="7" />
              <rect x="59" y="170" width="20" height="60" rx="7" />
            </Z>
            <Z zone="knee" {...zp}>
              <ellipse cx="41" cy="236" rx="14" ry="9" />
              <ellipse cx="69" cy="236" rx="14" ry="9" />
            </Z>
            <Z zone="calf" {...zp}>
              <rect x="30" y="245" width="20" height="52" rx="6" />
              <rect x="60" y="245" width="20" height="52" rx="6" />
            </Z>

          </svg>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      {!compact && (
        <div className="flex items-center justify-center gap-5 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="text-[10px] text-muted-foreground">
              Activa {totalActive > 0 && <span className="font-bold text-red-400">({totalActive})</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500/70 inline-block" />
            <span className="text-[10px] text-muted-foreground">
              Historial {totalPast > 0 && <span className="font-bold text-orange-400">({totalPast})</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "hsla(184,38%,30%,0.8)" }} />
            <span className="text-[10px] text-muted-foreground">Sin lesiones</span>
          </div>
        </div>
      )}
    </div>
  );
}
