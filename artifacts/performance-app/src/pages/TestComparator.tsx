import { useRef, useState, useMemo } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPlayer,
  useGetPlayerNeuromuscularHistory,
  getGetPlayerQueryKey,
  getGetPlayerNeuromuscularHistoryQueryKey,
  type NeuromuscularProfile,
} from "@workspace/api-client-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import {
  ArrowLeft, FileDown, Loader2, ArrowUpRight, ArrowDownRight,
  Minus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart3, Brain, Target, Zap, Shield, Activity,
  ChevronDown,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

// Elite reference values (=100% score)
const ELITE: Record<string, number> = {
  cmjHeight:      45,
  squatJump:      38,
  rsi:            2.2,
  isometricForce: 2500,
  forcePerKg:     28,
  power:          3500,
  powerPerKg:     40,
  maxSpeed:       10,
  tToVmax:        280,   // lower is better — handled inverted
  rfd:            8000,
  load:           100,
  explode:        100,
  drive:          100,
};

// Variable definitions for the comparison table (Excel columns)
const VARS = [
  { key:"maxSpeed",       label:"v(m/s)",      abbr:"v",        unit:"m/s",   desc:"Velocidad máxima",              inverted:false },
  { key:"maxSpeed",       label:"vmax(m/s)",    abbr:"vmax",     unit:"m/s",   desc:"Velocidad máxima sin carga",    inverted:false },
  { key:"tToVmax",        label:"t→vmax(ms)",   abbr:"t→vmax",   unit:"ms",    desc:"Tiempo hasta velocidad máxima", inverted:true  },
  { key:"power",          label:"p(W)",         abbr:"p",        unit:"W",     desc:"Potencia media",                inverted:false },
  { key:"powerPerKg",     label:"PmedRel",      abbr:"PmedRel",  unit:"W/kg",  desc:"Potencia media relativa",       inverted:false },
  { key:"_pmax",          label:"pmax(W)",      abbr:"pmax",     unit:"W",     desc:"Potencia pico (estimada F-V)",  inverted:false },
  { key:"_pmaxrel",       label:"PmaxRel",      abbr:"PmaxRel",  unit:"W/kg",  desc:"Potencia pico relativa",        inverted:false },
  { key:"isometricForce", label:"Fmax(N)",      abbr:"Fmax",     unit:"N",     desc:"Fuerza máxima isométrica",      inverted:false },
  { key:"forcePerKg",     label:"FmaxRel",      abbr:"FmaxRel",  unit:"N/kg",  desc:"Fuerza relativa al peso",       inverted:false },
];

// Radar variables (normalized, no duplicates)
const RADAR_VARS = [
  { key:"cmjHeight",      label:"CMJ"     },
  { key:"squatJump",      label:"SJ"      },
  { key:"isometricForce", label:"Fmax"    },
  { key:"forcePerKg",     label:"FmaxRel" },
  { key:"powerPerKg",     label:"PotRel"  },
  { key:"maxSpeed",       label:"vmax"    },
  { key:"rsi",            label:"RSI"     },
  { key:"rfd",            label:"RFD"     },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function n(v: unknown): number { return Number(v ?? 0); }
function fmt(v: number | null | undefined, dec = 1): string {
  if (v == null || v === 0) return "—";
  return v.toFixed(dec);
}

function getScore(key: string, value: number): number {
  if (value === 0) return 0;
  const elite = ELITE[key] ?? 100;
  if (key === "tToVmax") {
    // lower is better: 0ms=100%, 500ms=0%
    return Math.max(0, Math.min(100, Math.round(((500 - value) / 500) * 100)));
  }
  return Math.min(100, Math.round((value / elite) * 100));
}

function scoreColor(score: number): string {
  if (score >= 75) return "#34d399";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

function scoreBg(score: number): string {
  if (score >= 75) return "rgba(52,211,153,0.12)";
  if (score >= 50) return "rgba(251,191,36,0.12)";
  return "rgba(248,113,113,0.12)";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Élite";
  if (score >= 65) return "Óptimo";
  if (score >= 50) return "Mejorable";
  return "Déficit";
}

function calcPmax(load: number, explode: number, weight: number): number {
  const F0 = 8 + (load / 100) * 14;
  const V0 = 4 + (explode / 100) * 12;
  return +((F0 * V0) / 4 * weight).toFixed(0);
}

function calcRFD(isometricForce: number, load: number): number {
  return Math.round(isometricForce * (load / 100) * 18);
}

function getProfileField(t: NeuromuscularProfile, key: string): number {
  switch (key) {
    case "cmjHeight":      return n(t.cmjHeight);
    case "squatJump":      return n(t.squatJump);
    case "isometricForce": return n(t.isometricForce);
    case "forcePerKg":     return n(t.forcePerKg);
    case "power":          return n(t.power);
    case "powerPerKg":     return n(t.powerPerKg);
    case "maxSpeed":       return n(t.maxSpeed);
    case "tToVmax":        return n(t.tToVmax);
    case "asymmetryIndex": return n(t.asymmetryIndex);
    case "rsi":            return n(t.rsi);
    case "load":           return n(t.load);
    case "explode":        return n(t.explode);
    case "drive":          return n(t.drive);
    default:               return 0;
  }
}

function getValue(t: NeuromuscularProfile, key: string, weight: number): number {
  if (key === "_pmax")    return calcPmax(n(t.load), n(t.explode), weight);
  if (key === "_pmaxrel") {
    const pmax = calcPmax(n(t.load), n(t.explode), weight);
    return weight > 0 ? +(pmax / weight).toFixed(1) : 0;
  }
  if (key === "rfd") return calcRFD(n(t.isometricForce), n(t.load));
  return getProfileField(t, key);
}

function getIdeal(key: string, unit: string): string {
  if (key === "_pmax")    return "≥ 4000 W";
  if (key === "_pmaxrel") return "≥ 45 W/kg";
  if (key === "rfd")      return "≥ 8000 N/s";
  const elite = ELITE[key];
  if (!elite) return "—";
  if (key === "tToVmax")  return "≤ 280 ms";
  return `≥ ${elite} ${unit}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3 h-3 text-primary" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
    </div>
  );
}

function DeltaBadge({ delta, pct }: { delta: number; pct: number }) {
  const up = delta > 0.5;
  const down = delta < -0.5;
  if (!up && !down) return <span className="flex items-center gap-0.5 text-[#64748b] text-[10px] font-bold"><Minus className="w-3 h-3" /> —</span>;
  const color = up ? "#34d399" : "#f87171";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-0.5 font-bold text-[10px]" style={{ color }}>
      <Icon className="w-3 h-3" />
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <div className="w-10 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width:`${score}%`, backgroundColor: scoreColor(score) }} />
        </div>
        <span className="text-[10px] font-black tabular-nums" style={{ color: scoreColor(score) }}>{score}%</span>
      </div>
      <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: scoreColor(score) }}>{scoreLabel(score)}</span>
    </div>
  );
}

function TestSelect({ label, tests, value, onChange, disabled }: {
  label: string;
  tests: NeuromuscularProfile[];
  value: number | null;
  onChange: (id: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#4a5568]">{label}</label>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={e => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full appearance-none bg-[#0f1118] border border-[#1e2130] text-[#94a3b8] text-sm font-medium rounded-lg px-3 py-2.5 pr-8 focus:outline-none focus:border-primary/40 disabled:opacity-40 cursor-pointer"
        >
          <option value="" disabled>Seleccionar test…</option>
          {tests.map(t => (
            <option key={t.id} value={t.id}>
              {t.testDate} — Load:{Math.round(n(t.load))} / Exp:{Math.round(n(t.explode))} / Drive:{Math.round(n(t.drive))}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568] pointer-events-none" />
      </div>
    </div>
  );
}

// Custom radar tick
function RadarTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={700} dy={2}>
      {payload?.value}
    </text>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TestComparator() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = parseInt(rawId ?? "0", 10);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [testAId, setTestAId] = useState<number | null>(null);
  const [testBId, setTestBId] = useState<number | null>(null);
  const [compared, setCompared] = useState(false);

  const { data: player, isLoading: loadingPlayer } = useGetPlayer(id, {
    query: { enabled: !!id, queryKey: getGetPlayerQueryKey(id) },
  });
  const { data: history = [], isLoading: loadingHistory } = useGetPlayerNeuromuscularHistory(id, {
    query: { enabled: !!id, queryKey: getGetPlayerNeuromuscularHistoryQueryKey(id) },
  });

  const weight = n(player?.weight) || 75;

  // Sorted tests (oldest first in selector, newest last)
  const tests = useMemo(() =>
    [...history].sort((a, b) => a.testDate.localeCompare(b.testDate)), [history]
  );

  const testA = useMemo(() => tests.find(t => t.id === testAId) ?? null, [tests, testAId]);
  const testB = useMemo(() => tests.find(t => t.id === testBId) ?? null, [tests, testBId]);

  // Auto-select: oldest = A (anterior), newest = B (actual), and auto-compare
  useMemo(() => {
    if (tests.length >= 2 && !testAId && !testBId) {
      setTestAId(tests[0].id);
      setTestBId(tests[tests.length - 1].id);
      setCompared(true);
    } else if (tests.length === 1 && !testAId) {
      setTestAId(tests[0].id);
    }
  }, [tests]);

  // ─── Radar data ────────────────────────────────────────────────────────────
  const radarData = RADAR_VARS.map(rv => {
    const valA = testA ? getValue(testA, rv.key, weight) : 0;
    const valB = testB ? getValue(testB, rv.key, weight) : 0;
    const scoreA = getScore(rv.key, valA);
    const scoreB = getScore(rv.key, valB);
    return { axis: rv.label, testA: scoreA, testB: scoreB, ideal: 80 };
  });

  // ─── Per-variable analysis ─────────────────────────────────────────────────
  const varAnalysis = VARS.map(v => {
    const valA = testA ? getValue(testA, v.key, weight) : null;
    const valB = testB ? getValue(testB, v.key, weight) : null;
    const scoreA = valA ? getScore(v.key, valA) : 0;
    const scoreB = valB ? getScore(v.key, valB) : 0;
    const scoreIdeal = 80;
    const delta = (valA != null && valB != null) ? valB - valA : null;
    const deltaScore = scoreB - scoreA;
    const pctChange = (valA && valA !== 0 && delta != null) ? (delta / valA) * 100 : 0;
    return { ...v, valA, valB, scoreA, scoreB, scoreIdeal, delta, deltaScore, pctChange };
  });

  // ─── LED profile comparison ────────────────────────────────────────────────
  const ledData = [
    { label: "LOAD",    key:"load",    color:"#f97316", icon: Shield },
    { label: "EXPLODE", key:"explode", color:"#06b6d4", icon: Zap    },
    { label: "DRIVE",   key:"drive",   color:"#8b5cf6", icon: Target },
  ];

  // ─── Auto interpretation ──────────────────────────────────────────────────
  const improved = varAnalysis.filter(v => v.deltaScore > 3 && v.valA != null && v.valB != null);
  const worsened = varAnalysis.filter(v => v.deltaScore < -3 && v.valA != null && v.valB != null);
  const stable   = varAnalysis.filter(v => Math.abs(v.deltaScore) <= 3 && v.valA != null && v.valB != null);

  const loadDelta   = testB && testA ? n(testB.load)    - n(testA.load)    : 0;
  const explodeDelta = testB && testA ? n(testB.explode) - n(testA.explode) : 0;
  const driveDelta  = testB && testA ? n(testB.drive)   - n(testA.drive)   : 0;

  // ─── Export PDF ──────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"), import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, backgroundColor: "#0a0b0f", useCORS: true, logging: false, allowTaint: true,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297;
      const ratio = pageW / canvas.width;
      const totalH = canvas.height * ratio;
      let yMM = 0;
      while (yMM < totalH) {
        if (yMM > 0) pdf.addPage();
        const yPx = yMM / ratio;
        const sliceHPx = Math.min(pageH / ratio, canvas.height - yPx);
        const sl = document.createElement("canvas");
        sl.width = canvas.width; sl.height = sliceHPx;
        const ctx = sl.getContext("2d")!;
        ctx.fillStyle = "#0a0b0f"; ctx.fillRect(0, 0, sl.width, sl.height);
        ctx.drawImage(canvas, 0, yPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
        pdf.addImage(sl.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, pageW, sliceHPx * ratio);
        yMM += pageH;
      }
      pdf.save(`${player?.name ?? "Jugador"}_Comparador_Tests.pdf`);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadingPlayer || loadingHistory) return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
  if (!player) return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center text-muted-foreground">
      Jugador no encontrado
    </div>
  );

  const canCompare = testA != null && (testB != null || tests.length === 0);
  const showResults = compared && testA != null;

  return (
    <div className="min-h-screen bg-[#06070d]">

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#0a0b0f]/95 backdrop-blur border-b border-[#1e2130] px-6 py-3 flex items-center gap-4 print:hidden">
        <Link href={`/players/${id}`}>
          <button className="flex items-center gap-2 text-sm text-[#64748b] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> {player.name}
          </button>
        </Link>
        <div className="h-4 w-px bg-[#1e2130]" />
        <span className="text-xs text-[#4a5568] font-medium">Comparador de Tests</span>
        <div className="flex-1" />
        {showResults && (
          <button
            onClick={exportPDF} disabled={exporting}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? "Exportando…" : "Descargar PDF"}
          </button>
        )}
      </div>

      <div className="max-w-[960px] mx-auto px-6 py-6 space-y-5">

        {/* ── Selector card ────────────────────────────────────────────── */}
        <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Comparador de Tests</h1>
              <p className="text-xs text-[#64748b]">Selecciona dos tests para comparar la evolución del jugador</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[9px] text-[#4a5568] uppercase tracking-wider">Jugador</div>
              <div className="text-sm font-bold text-[#94a3b8]">{player.name}</div>
            </div>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-[#2a3040] mx-auto mb-3" />
              <p className="text-sm text-[#64748b]">No hay tests registrados para este jugador.</p>
              <p className="text-xs text-[#4a5568] mt-1">
                Añade un perfil neuromuscular desde la ficha del jugador para comenzar.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#f97316]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#f97316]">Test Anterior (A)</span>
                  </div>
                  <TestSelect
                    label="Seleccionar test anterior"
                    tests={tests}
                    value={testAId}
                    onChange={v => { setTestAId(v); setCompared(false); }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#06b6d4]">Test Actual (B)</span>
                  </div>
                  <TestSelect
                    label="Seleccionar test actual"
                    tests={tests}
                    value={testBId}
                    onChange={v => { setTestBId(v); setCompared(false); }}
                    disabled={tests.length < 2}
                  />
                </div>
              </div>

              {/* Quick summary of selected tests */}
              {testA && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label:"Test A", test: testA, color:"#f97316" },
                    ...(testB ? [{ label:"Test B", test: testB, color:"#06b6d4" }] : []),
                  ].map(({ label, test, color }) => (
                    <div key={label} className="bg-[#0f1118] rounded-lg border border-[#1e2130] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                        <span className="text-[9px] text-[#4a5568] ml-auto">{test.testDate}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { k:"LOAD",    v:n(test.load),    c:"#f97316" },
                          { k:"EXPLODE", v:n(test.explode), c:"#06b6d4" },
                          { k:"DRIVE",   v:n(test.drive),   c:"#8b5cf6" },
                        ].map(m => (
                          <div key={m.k} className="text-center">
                            <div className="text-lg font-black" style={{ color:m.c }}>{Math.round(m.v)}</div>
                            <div className="text-[8px] font-bold text-[#4a5568] uppercase">{m.k}</div>
                          </div>
                        ))}
                      </div>
                      {test.profileType && (
                        <div className="text-[9px] text-[#64748b] mt-2 text-center">{test.profileType}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setCompared(true)}
                disabled={!canCompare}
                className="w-full py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 transition-all"
                style={{
                  background: canCompare ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "#1e2130",
                  color: canCompare ? "#000" : "#4a5568",
                }}
              >
                Comparar Tests
              </button>

              {tests.length === 1 && (
                <p className="text-[9px] text-[#4a5568] text-center mt-2">
                  Solo hay un test registrado. Añade más tests desde la ficha del jugador para comparar evolución.
                </p>
              )}
            </>
          )}
        </div>

        {/* ════════ RESULTS ════════════════════════════════════════════════ */}
        {showResults && (
          <div ref={reportRef} className="space-y-5" style={{ backgroundColor:"#06070d" }}>

            {/* ── Report header (for PDF) ────────────────────────────────── */}
            <div className="relative rounded-2xl overflow-hidden border border-[#1e2130]"
              style={{ background:"linear-gradient(135deg,#0d1117 0%,#0f1422 55%,#0a0e1a 100%)" }}>
              <div className="h-1 w-full" style={{ background:"linear-gradient(90deg,#f97316,#06b6d4,#8b5cf6)" }} />
              <div className="p-6 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary/50 mb-1">
                    Comparador de Tests · Informe de Evolución
                  </div>
                  <h2 className="text-2xl font-black text-white">{player.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#64748b]">
                    <span>{player.position}</span>
                    {player.team && <><span>·</span><span>{player.team}</span></>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[8px] font-bold uppercase tracking-wider text-[#f97316]/70 mb-0.5">Test A</div>
                      <div className="text-sm font-black text-[#f97316]">{testA?.testDate}</div>
                    </div>
                    <div className="text-[#4a5568] font-bold">→</div>
                    <div className="text-center">
                      <div className="text-[8px] font-bold uppercase tracking-wider text-[#06b6d4]/70 mb-0.5">Test B</div>
                      <div className="text-sm font-black text-[#06b6d4]">{testB?.testDate ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#4a5568] mt-2">{today}</div>
                </div>
              </div>
            </div>

            {/* ── 1. TABLA COMPARATIVA SUPERIOR (Excel style) ───────────── */}
            <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
              <SectionLabel icon={BarChart3} label="Tabla Comparativa de Variables (Datos_Test)" />

              {/* Excel-style table: rows = metrics, cols = Test A | Ideal | Test B */}
              <div className="rounded-lg border border-[#1e2130] overflow-x-auto">
                <table className="w-full text-[10px] min-w-[700px]">
                  <thead>
                    {/* Test A header row */}
                    <tr className="border-b border-[#1e2130]">
                      <th className="text-left px-3 py-2 font-bold text-[#4a5568] uppercase tracking-wider bg-[#0f1118] w-36">Variable</th>
                      <th colSpan={3} className="text-center px-3 py-2 font-black text-[#f97316] uppercase tracking-wider bg-[#f97316]/8 border-l border-[#1e2130]">
                        TEST A — {testA?.testDate}
                      </th>
                      {testB && (
                        <th colSpan={3} className="text-center px-3 py-2 font-black text-[#06b6d4] uppercase tracking-wider bg-[#06b6d4]/8 border-l border-[#1e2130]">
                          TEST B — {testB.testDate}
                        </th>
                      )}
                      <th className="text-center px-3 py-2 font-bold text-[#4a5568] uppercase tracking-wider bg-[#0f1118] border-l border-[#1e2130]">Evolución</th>
                    </tr>
                    <tr className="border-b border-[#1e2130]">
                      <th className="text-left px-3 py-2 text-[#3a4460] bg-[#0f1118]">Abrev.</th>
                      <th className="px-3 py-2 text-[#f97316]/70 bg-[#f97316]/5 border-l border-[#1e2130]">Valor</th>
                      <th className="px-3 py-2 text-[#4a5568] bg-[#f97316]/5">Ideal</th>
                      <th className="px-3 py-2 text-[#f97316]/70 bg-[#f97316]/5">Score</th>
                      {testB && (
                        <>
                          <th className="px-3 py-2 text-[#06b6d4]/70 bg-[#06b6d4]/5 border-l border-[#1e2130]">Valor</th>
                          <th className="px-3 py-2 text-[#4a5568] bg-[#06b6d4]/5">Ideal</th>
                          <th className="px-3 py-2 text-[#06b6d4]/70 bg-[#06b6d4]/5">Score</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-[#4a5568] bg-[#0f1118] border-l border-[#1e2130]">Δ / %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varAnalysis.map((row, i) => (
                      <tr key={`${row.key}-${row.abbr}`}
                        className={`border-t border-[#1e2130] ${i % 2 === 0 ? "" : "bg-[#0f1118]/30"}`}>
                        {/* Label */}
                        <td className="px-3 py-2.5 bg-[#0f1118]">
                          <div className="font-bold text-[#94a3b8]">{row.label}</div>
                          <div className="text-[8px] font-mono text-[#3a4460]">{row.abbr}</div>
                        </td>
                        {/* Test A */}
                        <td className="px-3 py-2.5 text-center border-l border-[#1e2130] bg-[#f97316]/5">
                          <span className="font-black text-white">{fmt(row.valA, row.unit === "ms" || row.unit === "N" || row.unit === "W" ? 0 : 2)}</span>
                          <span className="text-[#4a5568] ml-0.5">{row.unit}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-[#4a5568] bg-[#f97316]/5">
                          {getIdeal(row.key, row.unit)}
                        </td>
                        <td className="px-3 py-2.5 bg-[#f97316]/5">
                          {row.valA ? <ScoreCell score={row.scoreA} /> : <span className="text-[#3a4460]">—</span>}
                        </td>
                        {/* Test B */}
                        {testB && (
                          <>
                            <td className="px-3 py-2.5 text-center border-l border-[#1e2130] bg-[#06b6d4]/5">
                              <span className="font-black text-white">{fmt(row.valB, row.unit === "ms" || row.unit === "N" || row.unit === "W" ? 0 : 2)}</span>
                              <span className="text-[#4a5568] ml-0.5">{row.unit}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-[#4a5568] bg-[#06b6d4]/5">
                              {getIdeal(row.key, row.unit)}
                            </td>
                            <td className="px-3 py-2.5 bg-[#06b6d4]/5">
                              {row.valB ? <ScoreCell score={row.scoreB} /> : <span className="text-[#3a4460]">—</span>}
                            </td>
                          </>
                        )}
                        {/* Delta */}
                        <td className="px-3 py-2.5 text-center border-l border-[#1e2130]">
                          {testB && row.delta != null
                            ? <DeltaBadge delta={row.deltaScore} pct={row.pctChange} />
                            : <span className="text-[#3a4460]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[8px] text-[#3a4460] mt-2">
                * pmax y RFD: estimados con modelo teórico F-V a partir de Load/Explode. Score: % respecto a referencia élite. Ideal = referencia 80% del óptimo élite.
              </p>
            </div>

            {/* ── 2. RADAR COMPARATIVO GRANDE ────────────────────────────── */}
            <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
              <SectionLabel icon={Activity} label="Radar Comparativo de Variables Normalizadas" />

              <div className="grid grid-cols-3 gap-5 items-start">
                {/* Radar — takes 2/3 */}
                <div className="col-span-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                        <PolarGrid stroke="#1e2130" gridType="polygon" />
                        <PolarAngleAxis dataKey="axis" tick={<RadarTick />} />
                        <PolarRadiusAxis
                          angle={90} domain={[0, 100]} tick={false}
                          axisLine={false} stroke="#1e2130"
                        />
                        {/* Ideal 80 reference */}
                        <Radar name="Referencia ideal (80)" dataKey="ideal"
                          stroke="#1e2130" strokeDasharray="5 3" fill="#1e2130" fillOpacity={0.25} strokeWidth={1.5} />
                        {/* Test A (anterior) */}
                        <Radar name={`Test A (${testA?.testDate})`} dataKey="testA"
                          stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2}
                          dot={{ fill:"#f97316", strokeWidth:0, r:4 }} />
                        {/* Test B (actual) */}
                        {testB && (
                          <Radar name={`Test B (${testB.testDate})`} dataKey="testB"
                            stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2}
                            dot={{ fill:"#06b6d4", strokeWidth:0, r:4 }} />
                        )}
                        <Tooltip
                          contentStyle={{ backgroundColor:"#0f1118", border:"1px solid #1e2130", borderRadius:"8px", fontSize:"11px" }}
                          formatter={(v: unknown, name: string) => [`${v}%`, name]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize:"10px", color:"#94a3b8", paddingTop:"12px" }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[8px] text-[#3a4460] text-center mt-1">
                    Valores normalizados 0–100% respecto a referencia élite. Ideal = 80%.
                  </p>
                </div>

                {/* Score summary column */}
                <div className="space-y-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#4a5568] mb-3">Puntuaciones por variable</div>
                  {radarData.map(rd => {
                    const bScore = testB ? rd.testB : null;
                    const diff = bScore != null ? rd.testB - rd.testA : 0;
                    return (
                      <div key={rd.axis} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-[#94a3b8]">{rd.axis}</span>
                          <div className="flex items-center gap-1.5">
                            {bScore != null && (
                              <span className="text-[8px]" style={{ color: diff > 2 ? "#34d399" : diff < -2 ? "#f87171" : "#64748b" }}>
                                {diff > 2 ? `+${Math.round(diff)}` : diff < -2 ? Math.round(diff) : "="}
                              </span>
                            )}
                            <span className="font-black" style={{ color: scoreColor(testB ? rd.testB : rd.testA) }}>
                              {testB ? rd.testB : rd.testA}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {/* Test A bar */}
                          <div className="flex-1 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#f97316]" style={{ width:`${rd.testA}%` }} />
                          </div>
                          {/* Test B bar */}
                          {testB && (
                            <div className="flex-1 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#06b6d4]" style={{ width:`${rd.testB}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── 3. LED PROFILE COMPARISON ─────────────────────────────── */}
            <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
              <SectionLabel icon={Zap} label="Perfil Neuromuscular LED — Comparativa" />
              <div className="grid grid-cols-3 gap-4">
                {ledData.map(m => {
                  const valA = testA ? getProfileField(testA, m.key) : 0;
                  const valB = testB ? getProfileField(testB, m.key) : null;
                  const delta = valB != null ? valB - valA : null;
                  return (
                    <div key={m.key} className="bg-[#0f1118] rounded-xl border border-[#1e2130] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <m.icon className="w-4 h-4" style={{ color:m.color }} />
                        <span className="text-xs font-black uppercase tracking-wider" style={{ color:m.color }}>{m.label}</span>
                      </div>
                      {/* A */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#f97316]" /><span className="text-[9px] text-[#4a5568]">Test A</span></div>
                        <span className="text-lg font-black" style={{ color:"#f97316" }}>{Math.round(valA)}</span>
                      </div>
                      <div className="h-2 bg-[#1e2130] rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-[#f97316]" style={{ width:`${valA}%`, opacity:0.7 }} />
                      </div>
                      {/* B */}
                      {valB != null && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#06b6d4]" /><span className="text-[9px] text-[#4a5568]">Test B</span></div>
                            <span className="text-lg font-black" style={{ color:"#06b6d4" }}>{Math.round(valB)}</span>
                          </div>
                          <div className="h-2 bg-[#1e2130] rounded-full overflow-hidden mb-3">
                            <div className="h-full rounded-full bg-[#06b6d4]" style={{ width:`${valB}%` }} />
                          </div>
                        </>
                      )}
                      {/* Delta */}
                      {delta != null && (
                        <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-[#1e2130]">
                          {delta > 0 ? <TrendingUp className="w-3.5 h-3.5 text-[#34d399]" /> : delta < 0 ? <TrendingDown className="w-3.5 h-3.5 text-[#f87171]" /> : <Minus className="w-3.5 h-3.5 text-[#64748b]" />}
                          <span className="text-xs font-black" style={{ color: delta > 0 ? "#34d399" : delta < 0 ? "#f87171" : "#64748b" }}>
                            {delta > 0 ? "+" : ""}{Math.round(delta)} pts
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 4. CAMBIOS ENTRE TESTS ────────────────────────────────── */}
            {testB && (
              <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
                <SectionLabel icon={TrendingUp} label="Cambios entre Tests — Variable por Variable" />
                <div className="grid grid-cols-3 gap-2">
                  {varAnalysis.filter(v => v.valA != null && v.valB != null).map(row => {
                    const improved = row.deltaScore > 3;
                    const worsened = row.deltaScore < -3;
                    const bg = improved ? "bg-emerald-500/8 border-emerald-500/20"
                      : worsened ? "bg-red-500/8 border-red-500/20"
                      : "bg-[#0f1118] border-[#1e2130]";
                    const color = improved ? "#34d399" : worsened ? "#f87171" : "#64748b";
                    const Icon = improved ? TrendingUp : worsened ? TrendingDown : Minus;
                    return (
                      <div key={`${row.key}-${row.abbr}`} className={`rounded-lg border p-3 ${bg}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-[#94a3b8]">{row.label}</span>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="text-center">
                            <div className="text-[8px] text-[#4a5568]">Test A</div>
                            <div className="text-sm font-black text-[#f97316]">{fmt(row.valA, 1)}</div>
                          </div>
                          <div className="text-[#3a4460] mb-0.5">→</div>
                          <div className="text-center">
                            <div className="text-[8px] text-[#4a5568]">Test B</div>
                            <div className="text-sm font-black text-[#06b6d4]">{fmt(row.valB, 1)}</div>
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-xs font-black" style={{ color }}>
                              {row.pctChange > 0 ? "+" : ""}{row.pctChange.toFixed(1)}%
                            </div>
                            <div className="text-[8px] font-bold" style={{ color }}>
                              {improved ? "Mejora" : worsened ? "Empeora" : "Estable"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 5. INTERPRETACIÓN AUTOMÁTICA ─────────────────────────── */}
            <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
              <SectionLabel icon={Brain} label="Interpretación Automática del Análisis" />
              <div className="space-y-3 text-[11px] leading-relaxed">

                {/* What improved */}
                {improved.length > 0 && (
                  <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#34d399]">Variables que mejoran</span>
                    </div>
                    <p className="text-[#94a3b8]">
                      {improved.map(v => `${v.label} (+${v.pctChange.toFixed(1)}%)`).join(", ")}.{" "}
                      {improved.length >= 3
                        ? "La mejora generalizada sugiere una adaptación positiva al programa de entrenamiento. El bloque de trabajo ha generado adaptaciones neuromusculares medibles en múltiples cualidades."
                        : "Mejora específica en las variables mencionadas. Mantener el estímulo actual para consolidar la adaptación."}
                    </p>
                  </div>
                )}

                {/* What worsened */}
                {worsened.length > 0 && (
                  <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#f87171]" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#f87171]">Variables que empeoran</span>
                    </div>
                    <p className="text-[#94a3b8]">
                      {worsened.map(v => `${v.label} (${v.pctChange.toFixed(1)}%)`).join(", ")}.{" "}
                      {worsened.some(v => v.key === "rsi") && "El descenso del RSI indica fatiga acumulada o pérdida de capacidad reactiva. Revisar volumen de pliometría y descanso. "}
                      {worsened.some(v => v.key === "maxSpeed") && "La reducción de velocidad máxima puede deberse a fatiga del sistema nervioso central. Incluir sesiones de activación neural de baja carga. "}
                      Revisar la planificación de la carga en el bloque previo al test.
                    </p>
                  </div>
                )}

                {/* Stable */}
                {stable.length > 0 && (
                  <div className="bg-[#0f1118] border border-[#1e2130] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Minus className="w-3.5 h-3.5 text-[#64748b]" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#64748b]">Variables estables</span>
                    </div>
                    <p className="text-[#64748b]">
                      {stable.map(v => v.label).join(", ")} — Sin cambios significativos. Mantener el estímulo actual para estas cualidades.
                    </p>
                  </div>
                )}

                {/* Neuromuscular profile analysis */}
                {testB && (
                  <div className="bg-[#0f1420] border border-primary/15 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary/80">Análisis del perfil neuromuscular</span>
                    </div>
                    <p className="text-[#94a3b8]">
                      {loadDelta > 5
                        ? `Load aumentó ${Math.round(loadDelta)} puntos — mejora en capacidad de fuerza máxima. `
                        : loadDelta < -5
                        ? `Load disminuyó ${Math.abs(Math.round(loadDelta))} puntos — posible desentrenamiento de fuerza máxima. Revisar volumen de trabajo con cargas elevadas. `
                        : "Load estable entre tests — mantener el estímulo de fuerza máxima. "}
                      {explodeDelta > 5
                        ? `Explode mejoró ${Math.round(explodeDelta)} puntos — ganancia en potencia explosiva y aceleración. `
                        : explodeDelta < -5
                        ? `Explode disminuyó ${Math.abs(Math.round(explodeDelta))} puntos — pérdida de potencia explosiva. Incorporar trabajo de velocidad-potencia en el próximo bloque. `
                        : "Explode sin cambios relevantes. "}
                      {driveDelta > 5
                        ? `Drive mejoró ${Math.round(driveDelta)} puntos — mejor transmisión de fuerza al suelo y capacidad reactiva. `
                        : driveDelta < -5
                        ? `Drive redujo ${Math.abs(Math.round(driveDelta))} puntos — menor eficiencia en el ciclo estiramiento-acortamiento. Priorizar pliometría reactiva. `
                        : "Drive sin variaciones relevantes. "}
                      {testB.profileType !== testA?.profileType && testB.profileType
                        ? `El perfil dominante cambió a ${testB.profileType} — adaptación neuromuscular relevante que debe considerarse en la planificación.`
                        : testB.profileType
                        ? `El perfil ${testB.profileType} se mantiene consistente entre tests.`
                        : ""}
                    </p>
                  </div>
                )}

                {/* Training block recommendation */}
                <div className="bg-[#0f1118] border border-[#1e2130] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-3.5 h-3.5 text-[#8b5cf6]" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#8b5cf6]">Bloque metodológico a priorizar</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Load (Fuerza base)",
                        priority: loadDelta < -5 || (testB && n(testB.load) < 65),
                        detail: "Fuerza máxima 3-5 RM, sentadilla pesada, peso muerto. Descanso 3-5 min. 2-3 sesiones/semana.",
                        color: "#f97316",
                      },
                      {
                        label: "Explode (Potencia)",
                        priority: explodeDelta < -5 || (testB && n(testB.explode) < 65),
                        detail: "CMJ, Drop Jumps, sprints 10-30m, halterofilia adaptada. Alta velocidad de ejecución.",
                        color: "#06b6d4",
                      },
                      {
                        label: "Drive (Reactividad)",
                        priority: driveDelta < -5 || (testB && n(testB.drive) < 65),
                        detail: "Pliometría reactiva, mini-hurdles, cambios de dirección con tiempo de contacto mínimo.",
                        color: "#8b5cf6",
                      },
                    ].map(b => (
                      <div key={b.label} className={`rounded-lg p-2.5 border ${b.priority ? "border-current/30" : "border-[#1e2130]"}`}
                        style={{ borderColor: b.priority ? b.color + "33" : undefined, backgroundColor: b.priority ? b.color + "0d" : undefined }}>
                        <div className="text-[9px] font-black uppercase mb-1" style={{ color: b.color }}>{b.label}</div>
                        <div className="text-[8px] text-[#64748b] leading-tight">{b.detail}</div>
                        {b.priority && (
                          <div className="text-[8px] font-black mt-1.5" style={{ color: b.color }}>⬆ PRIORIDAD</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1e2130]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background:"linear-gradient(135deg,#06b6d4,#3b82f6)" }}>
                  <Activity className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="text-[9px] font-black tracking-[0.2em] text-[#64748b] uppercase">PerformanceIQ</div>
                  <div className="text-[8px] text-[#3a4460]">Football Analytics Platform</div>
                </div>
              </div>
              <div className="text-[8px] text-[#3a4460] text-center">
                <div className="font-bold uppercase tracking-wider">Documento Confidencial</div>
                <div>Club Performance Dept. · Temporada 2025/26</div>
              </div>
              <div className="text-right text-[8px] text-[#3a4460]">{today}</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
