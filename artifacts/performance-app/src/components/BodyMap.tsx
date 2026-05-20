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
  "head", "neck", "shoulder", "bicep", "chest", "abdomen", "groin",
  "quadriceps", "hamstring", "knee", "calf", "ankle", "foot",
  "back", "glute", "forearm", "hand",
] as const;

export type BodyZone = typeof BODY_ZONES[number];

export const ZONE_LABELS: Record<string, string> = {
  head:       "Cabeza",
  neck:       "Cuello",
  shoulder:   "Hombro / Deltoides",
  bicep:      "Bíceps",
  chest:      "Pectoral",
  abdomen:    "Abdomen",
  groin:      "Ingle",
  quadriceps: "Cuádriceps",
  hamstring:  "Isquiotibiales",
  knee:       "Rodilla",
  calf:       "Gemelo / Pantorrilla",
  ankle:      "Tobillo",
  foot:       "Pie",
  back:       "Espalda / Dorsales",
  glute:      "Glúteo",
  forearm:    "Antebrazo",
  hand:       "Mano",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function zoneStats(zone: string, injuries: InjuryEntry[]) {
  const zi = injuries.filter(i => i.bodyZone === zone);
  const active = zi.filter(i => !i.endDate).length;
  return { total: zi.length, active, past: zi.length - active };
}

function zoneFill(zone: string, injuries: InjuryEntry[], hovered: boolean): string {
  const { active, past } = zoneStats(zone, injuries);
  if (active > 0) return hovered ? "hsla(0,72%,65%,0.95)"  : "hsla(0,72%,52%,0.88)";
  if (past  > 0) return hovered ? "hsla(28,78%,60%,0.90)" : "hsla(28,78%,48%,0.72)";
  return               hovered ? "hsla(184,42%,30%,0.90)" : "hsla(184,38%,18%,0.75)";
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

  const W  = compact ? 76  : 110;
  const FH = compact ? 228 : 330;
  const BH = compact ? 215 : 310;

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

        {/* ── FRONTAL ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1">
          {!compact && (
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold">
              Frontal
            </span>
          )}
          <svg viewBox="0 0 110 330" width={W} height={FH}>

            {/* Head */}
            <Z zone="head" {...zp}>
              <circle cx="55" cy="22" r="18" />
            </Z>

            {/* Neck */}
            <Z zone="neck" {...zp}>
              <ellipse cx="55" cy="43" rx="8" ry="6" />
            </Z>

            {/* Deltoides — capucha orgánica sobre el hombro */}
            <Z zone="shoulder" {...zp}>
              {/* Hombro izquierdo (derecha del SVG) */}
              <path d="M 88 55 C 96 51 105 55 107 65 C 109 77 102 87 92 89 C 82 91 73 83 71 72 C 69 61 80 53 88 55 Z" />
              {/* Hombro derecho (izquierda del SVG) */}
              <path d="M 22 55 C 14 51 5 55 3 65 C 1 77 8 87 18 89 C 28 91 37 83 39 72 C 41 61 30 53 22 55 Z" />
            </Z>

            {/* Bíceps — vientre muscular frontal del brazo */}
            <Z zone="bicep" {...zp}>
              {/* Brazo izquierdo */}
              <path d="M 101 90 C 107 104 107 120 102 130 C 96 138 84 136 80 126 C 75 114 77 100 83 90 C 89 82 97 82 101 90 Z" />
              {/* Brazo derecho */}
              <path d="M 9 90 C 3 104 3 120 8 130 C 14 138 26 136 30 126 C 35 114 33 100 27 90 C 21 82 13 82 9 90 Z" />
            </Z>

            {/* Pectorales — forma de abanico desde el esternón */}
            <Z zone="chest" {...zp}>
              {/* Pectoral izquierdo */}
              <path d="M 56 58 C 68 52 84 60 90 74 C 94 86 86 102 56 100 Z" />
              {/* Pectoral derecho */}
              <path d="M 54 58 C 42 52 26 60 20 74 C 16 86 24 102 54 100 Z" />
            </Z>

            {/* Abdomen — 6 bloques orgánicos (recto abdominal) */}
            <Z zone="abdomen" {...zp}>
              {/* Fila 1 */}
              <path d="M 44 104 C 44 101 53 100 54 103 L 54 117 C 53 120 44 119 Z" />
              <path d="M 56 104 C 57 101 66 100 66 103 L 66 117 C 65 120 56 119 Z" />
              {/* Fila 2 */}
              <path d="M 43 120 C 43 117 53 116 54 119 L 54 132 C 53 135 43 134 Z" />
              <path d="M 56 120 C 57 117 66 116 66 119 L 66 132 C 65 135 56 134 Z" />
              {/* Fila 3 */}
              <path d="M 44 135 C 43 132 53 131 54 134 L 54 147 C 53 150 44 149 Z" />
              <path d="M 56 135 C 57 132 66 131 66 134 L 66 147 C 65 150 56 149 Z" />
            </Z>

            {/* Ingle / Cadera */}
            <Z zone="groin" {...zp}>
              <path d="M 39 150 C 39 144 48 140 55 140 C 62 140 71 144 71 150 C 71 166 62 174 55 174 C 48 174 39 166 39 150 Z" />
            </Z>

            {/* Antebrazo */}
            <Z zone="forearm" {...zp}>
              <path d="M 5 132 C 2 150 2 168 6 180 C 10 188 22 188 26 180 C 30 168 30 150 26 132 C 22 124 10 124 5 132 Z" />
              <path d="M 105 132 C 108 150 108 168 104 180 C 100 188 88 188 84 180 C 80 168 80 150 84 132 C 88 124 100 124 105 132 Z" />
            </Z>

            {/* Mano */}
            <Z zone="hand" {...zp}>
              <ellipse cx="15" cy="196" rx="12" ry="9" />
              <ellipse cx="95" cy="196" rx="12" ry="9" />
            </Z>

            {/* Cuádriceps — hoja orgánica en cara anterior del muslo */}
            <Z zone="quadriceps" {...zp}>
              {/* Muslo derecho */}
              <path d="M 28 176 C 22 192 22 214 26 228 C 30 238 42 242 50 234 C 56 226 56 208 52 192 C 48 176 36 168 28 176 Z" />
              {/* Muslo izquierdo */}
              <path d="M 82 176 C 88 192 88 214 84 228 C 80 238 68 242 60 234 C 54 226 54 208 58 192 C 62 176 74 168 82 176 Z" />
            </Z>

            {/* Rodilla */}
            <Z zone="knee" {...zp}>
              <path d="M 24 232 C 20 240 22 250 28 254 C 36 258 48 256 52 250 C 56 242 54 234 46 228 C 38 224 28 224 24 232 Z" />
              <path d="M 62 232 C 58 240 60 250 66 254 C 74 258 86 256 90 250 C 94 242 92 234 84 228 C 76 224 66 224 62 232 Z" />
            </Z>

            {/* Gemelo / Tibial anterior (vista frontal) */}
            <Z zone="calf" {...zp}>
              <path d="M 28 256 C 24 272 24 286 28 296 C 32 302 42 304 48 298 C 52 292 52 276 50 260 C 46 250 30 250 28 256 Z" />
              <path d="M 62 256 C 58 272 58 286 62 296 C 66 302 78 304 82 298 C 86 292 86 276 82 260 C 78 250 64 250 62 256 Z" />
            </Z>

            {/* Tobillo */}
            <Z zone="ankle" {...zp}>
              <ellipse cx="38" cy="303" rx="14" ry="7" />
              <ellipse cx="72" cy="303" rx="14" ry="7" />
            </Z>

            {/* Pie */}
            <Z zone="foot" {...zp}>
              <path d="M 22 308 C 16 316 18 324 30 327 C 40 330 54 326 56 318 C 58 312 52 308 44 306 Z" />
              <path d="M 88 308 C 94 316 92 324 80 327 C 70 330 56 326 54 318 C 52 312 58 308 66 306 Z" />
            </Z>

          </svg>
        </div>

        {/* ── POSTERIOR ────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1">
          {!compact && (
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold">
              Posterior
            </span>
          )}
          <svg viewBox="0 0 110 310" width={W} height={BH}>

            {/* Head */}
            <Z zone="head" {...zp}>
              <circle cx="55" cy="22" r="18" />
            </Z>

            {/* Neck */}
            <Z zone="neck" {...zp}>
              <ellipse cx="55" cy="43" rx="8" ry="6" />
            </Z>

            {/* Deltoides posteriores */}
            <Z zone="shoulder" {...zp}>
              <path d="M 88 55 C 96 51 105 55 107 65 C 109 77 102 87 92 89 C 82 91 73 83 71 72 C 69 61 80 53 88 55 Z" />
              <path d="M 22 55 C 14 51 5 55 3 65 C 1 77 8 87 18 89 C 28 91 37 83 39 72 C 41 61 30 53 22 55 Z" />
            </Z>

            {/* Espalda: trapecio + dorsales (lat wings) + lumbar */}
            <Z zone="back" {...zp}>
              {/* Trapecio superior — rombo entre cuello y hombros */}
              <path d="M 36 50 C 38 44 46 40 55 40 C 64 40 72 44 74 50 C 76 62 68 78 55 82 C 42 78 34 62 36 50 Z" />
              {/* Dorsal izquierdo — ala hacia el flanco */}
              <path d="M 33 70 C 26 84 22 104 26 132 C 30 152 42 162 55 164 L 55 84 C 46 84 38 78 33 70 Z" />
              {/* Dorsal derecho */}
              <path d="M 77 70 C 84 84 88 104 84 132 C 80 152 68 162 55 164 L 55 84 C 64 84 72 78 77 70 Z" />
              {/* Lumbar / zona baja */}
              <path d="M 40 162 C 38 170 42 178 55 180 C 68 178 72 170 70 162 C 64 156 46 156 40 162 Z" />
            </Z>

            {/* Glúteos — formas redondeadas grandes */}
            <Z zone="glute" {...zp}>
              <path d="M 26 168 C 20 180 18 198 22 212 C 26 222 40 226 50 220 C 58 214 62 202 60 190 C 58 174 46 164 36 164 C 30 162 26 164 26 168 Z" />
              <path d="M 84 168 C 90 180 92 198 88 212 C 84 222 70 226 60 220 C 52 214 48 202 50 190 C 52 174 64 164 74 164 C 80 162 84 164 84 168 Z" />
            </Z>

            {/* Isquiotibiales */}
            <Z zone="hamstring" {...zp}>
              <path d="M 28 188 C 22 206 20 222 24 234 C 28 244 42 248 50 240 C 56 232 56 216 52 200 C 48 184 36 182 28 188 Z" />
              <path d="M 82 188 C 88 206 90 222 86 234 C 82 244 68 248 60 240 C 54 232 54 216 58 200 C 62 184 74 182 82 188 Z" />
            </Z>

            {/* Rodilla posterior */}
            <Z zone="knee" {...zp}>
              <path d="M 24 238 C 20 246 22 256 28 260 C 36 264 48 262 52 256 C 56 248 54 240 46 234 C 38 230 28 230 24 238 Z" />
              <path d="M 62 238 C 58 246 60 256 66 260 C 74 264 86 262 90 256 C 94 248 92 240 84 234 C 76 230 66 230 62 238 Z" />
            </Z>

            {/* Gemelos (gastrocnemios) — diamante de dos cabezas */}
            <Z zone="calf" {...zp}>
              {/* Pierna derecha — cabeza medial */}
              <path d="M 30 262 C 24 276 24 292 28 302 C 32 308 42 308 48 302 C 52 294 50 278 48 266 C 44 256 32 254 30 262 Z" />
              {/* Pierna derecha — cabeza lateral */}
              <path d="M 46 264 C 48 278 48 294 46 302 C 50 308 58 306 62 300 C 66 290 64 274 60 264 C 56 254 44 254 46 264 Z" />
              {/* Pierna izquierda — cabeza medial */}
              <path d="M 80 262 C 86 276 86 292 82 302 C 78 308 68 308 62 302 C 58 294 60 278 62 266 C 66 256 78 254 80 262 Z" />
              {/* Pierna izquierda — cabeza lateral */}
              <path d="M 64 264 C 62 278 62 294 64 302 C 60 308 52 306 48 300 C 44 290 46 274 50 264 C 54 254 66 254 64 264 Z" />
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
