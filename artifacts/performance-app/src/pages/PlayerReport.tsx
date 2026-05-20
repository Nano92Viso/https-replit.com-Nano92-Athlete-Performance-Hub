import { useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPlayer, useGetPlayerNeuromuscular, useGetPlayerAlerts,
  useListSessions, getGetPlayerQueryKey, getGetPlayerNeuromuscularQueryKey, getGetPlayerAlertsQueryKey,
} from "@workspace/api-client-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart, ReferenceLine,
} from "recharts";
import {
  FileDown, Loader2, ArrowLeft, Shield, Zap, Target,
  AlertTriangle, CheckCircle2, TrendingUp, Activity, Dumbbell,
  User, Clock, BarChart3, Brain, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

function n(v: unknown): number { return Number(v ?? 0); }
function fmt(v: unknown, dec = 1): string {
  const x = Number(v);
  return isNaN(x) || x === 0 ? "—" : x.toFixed(dec);
}

function calcLoad(s: { intensity: string; sessionType: string; duration: number }): number {
  const iv: Record<string,number> = { low:25, medium:50, high:75, max:100 };
  const tm: Record<string,number> = { match:1.5, strength:1.2, speed:1.15, endurance:1.0, technical:0.75, recovery:0.35 };
  return Math.min(100, Math.round((iv[s.intensity]??50)*(tm[s.sessionType]??1)*(s.duration/60)));
}

// F-V curve from Load/Explode parameters
function getFvData(load: number, explode: number) {
  const F0 = 8 + (load / 100) * 14;       // N/kg – theoretical max isometric force
  const V0 = 4 + (explode / 100) * 12;    // m/s  – theoretical max velocity
  const Pmax = (F0 * V0) / 4;             // W/kg – max power
  const points = [];
  for (let i = 0; i <= 22; i++) {
    const v = (V0 * i) / 20;
    const f = Math.max(0, F0 * (1 - v / V0));
    const p = f * v;
    points.push({ v: +v.toFixed(2), f: +f.toFixed(2), p: +p.toFixed(2) });
  }
  return { points, F0: +F0.toFixed(1), V0: +V0.toFixed(1), Pmax: +Pmax.toFixed(1) };
}

// RFD estimate (N/s)
function calcRFD(isometricForce: number, load: number): number {
  return Math.round(isometricForce * (load / 100) * 18);
}

// Generate MD recommendations
function getRecommendations(profile: string, load: number, explode: number, drive: number, asymm: number): string[] {
  const recs: string[] = [];
  if (load < 65)
    recs.push("MD-5/MD-4: Priorizar fuerza máxima (3-5 RM). Load por debajo del umbral óptimo (65). Incluir sentadilla pesada, prensa bilateral y peso muerto rumano. Volumen controlado, descanso largo (3-5 min).");
  else
    recs.push("MD-5/MD-4: Mantener estímulo de fuerza máxima con intensidad moderada (70-80% 1RM). Load en rango óptimo — conservar volumen. Añadir trabajo excéntrico si Drive < 70.");
  if (explode < 65)
    recs.push("MD-3/MD-2: Pliometría progresiva y sprints de aceleración. Déficit Explode detectado — Drop Jumps, CMJ con carga ligera y aceleraciones reactivas 3×5×10m. Énfasis en intención de ejecución máxima.");
  else
    recs.push("MD-3/MD-2: Trabajo de velocidad-potencia a alta intensidad de ejecución. Explode óptimo — mantener estímulo pliométrico con bajo volumen y máxima calidad. Sprint 3×30m + saltos.");
  if (drive < 65)
    recs.push("MD-2/MD-1: Refuerzo de transmisión de fuerza al suelo. Drive bajo — hip thrust progresivo, nórdico excéntrico y Drop Jumps reactivos. Foco en tiempo de contacto mínimo.");
  else
    recs.push("MD-1: Activación neuromuscular breve (≤20 min). Drive óptimo — mini-hurdles, skipping y drops a mínimo volumen. No generar fatiga residual pre-partido.");
  if (asymm > 15)
    recs.push("⚠ Asimetría bilateral elevada (>" + asymm.toFixed(0) + "%). Priorizar trabajo unilateral compensatorio: zancada búlgara, prensa unilateral y hop test. Objetivo: reducir diferencia a <10% en 4 semanas.");
  if (profile === "Strength Profile")
    recs.push("Perfil Fuerza: mejorar velocidad y potencia explosiva. Incorporar 2 sesiones/semana de velocidad máxima y pliometría de alta intensidad durante 8 semanas. Reducir volumen de fuerza máxima en fase de desarrollo.");
  if (profile === "Power Profile")
    recs.push("Perfil Potencia: mejorar Drive para completar el triángulo LED. Ejercicios de transmisión específica: Trap Bar deadlift jump, step-up explosivo y bounding con bastón.");
  recs.push("Recuperación activa post-esfuerzo: 24-36h post-partido — foam roller (15 min) + movilidad articular + hidroterapia o natación suave (20 min). Monitorizar HRV y calidad de sueño.");
  return recs;
}

// Status thresholds
function getStatus(metric: string, value: number): { label: string; color: string; icon: string } {
  const thresholds: Record<string, [number, number]> = {
    cmjHeight:      [35, 28],
    squatJump:      [30, 24],
    rsi:            [1.5, 1.0],
    isometricForce: [1800, 1400],
    forcePerKg:     [22, 17],
    power:          [2500, 1800],
    powerPerKg:     [30, 22],
    maxSpeed:       [8, 6],
    asymmetryIndex: [10, 15],   // lower = better — inverted
  };
  const t = thresholds[metric];
  if (!t) return { label: "—", color: "#64748b", icon: "—" };
  const [opt, warn] = t;
  const isInverted = metric === "asymmetryIndex";
  const good = isInverted ? value <= opt : value >= opt;
  const ok   = isInverted ? value <= warn : value >= warn;
  if (good) return { label: "✓ Óptimo",   color: "#34d399", icon: "opt" };
  if (ok)   return { label: "⚠ Mejorable", color: "#fbbf24", icon: "warn" };
  return       { label: "✗ Déficit",   color: "#f87171", icon: "def" };
}

function scorePct(metric: string, value: number): number {
  const elites: Record<string, number> = {
    cmjHeight: 45, squatJump: 38, rsi: 2.2, isometricForce: 2500,
    forcePerKg: 28, power: 3500, powerPerKg: 40, maxSpeed: 10,
  };
  const elite = elites[metric];
  if (!elite) return 0;
  if (metric === "asymmetryIndex") return Math.max(0, Math.round((1 - value / 20) * 100));
  return Math.min(100, Math.round((value / elite) * 100));
}

// Labels/colors
const injuryLabel: Record<string,string> = { fit:"Apto", minor_risk:"Riesgo Menor", injured:"Lesionado", recovery:"Recuperación" };
const riskColor:   Record<string,string> = { low:"#10b981", medium:"#f59e0b", high:"#ef4444" };
const typeLabel:   Record<string,string> = { strength:"Fuerza", speed:"Velocidad", endurance:"Resistencia", technical:"Técnico", recovery:"Recuperación", match:"Partido" };
const typeColor:   Record<string,string> = { strength:"#f97316", speed:"#3b82f6", endurance:"#10b981", technical:"#a855f7", recovery:"#06b6d4", match:"#ef4444" };
const profileColors: Record<string,{ bg:string; border:string; text:string }> = {
  "Power Profile":    { bg:"#1e3a5f", border:"#3b82f6", text:"#60a5fa" },
  "Strength Profile": { bg:"#3d1f0e", border:"#f97316", text:"#fb923c" },
  "Force Profile":    { bg:"#2e1852", border:"#a855f7", text:"#c084fc" },
  "Balanced Profile": { bg:"#0f2d1e", border:"#10b981", text:"#34d399" },
};

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

function MetricBox({ label, value, unit, sub, color="#94a3b8" }: {
  label:string; value:string; unit:string; sub?:string; color?:string;
}) {
  return (
    <div className="bg-[#0f1118] rounded-lg border border-[#1e2130] p-3 flex flex-col gap-1">
      <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#4a5568]">{label}</span>
      <span className="text-xl font-black tabular-nums leading-none" style={{ color }}>
        {value}<span className="text-[10px] font-medium text-[#4a5568] ml-0.5">{unit}</span>
      </span>
      {sub && <span className="text-[8px] text-[#3a4460] leading-tight">{sub}</span>}
    </div>
  );
}

function ScoreBar({ label, value, color, icon: Icon }: {
  label:string; value:number; color:string; icon:React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color }} />
          <span className="text-xs font-semibold text-[#94a3b8]">{label}</span>
        </div>
        <span className="text-sm font-black tabular-nums" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width:`${value}%`, background:`linear-gradient(90deg,${color}88,${color})` }} />
      </div>
    </div>
  );
}

function RadarTick({ x, y, payload }: { x?:number; y?:number; payload?:{ value:string } }) {
  return <text x={x} y={y} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={700}>{payload?.value}</text>;
}

function TrendIcon({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) return <Minus className="w-3 h-3 text-[#64748b]" />;
  if (delta > 0) return <ArrowUpRight className="w-3 h-3 text-[#34d399]" />;
  return <ArrowDownRight className="w-3 h-3 text-[#f87171]" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PlayerReport() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = parseInt(rawId ?? "0", 10);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data: player, isLoading } = useGetPlayer(id, { query: { enabled:!!id, queryKey: getGetPlayerQueryKey(id) } });
  const { data: neuro } = useGetPlayerNeuromuscular(id, { query: { enabled:!!id, queryKey: getGetPlayerNeuromuscularQueryKey(id) } });
  const { data: alerts = [] } = useGetPlayerAlerts(id, { query: { enabled:!!id, queryKey: getGetPlayerAlertsQueryKey(id) } });
  const { data: allSessions = [] } = useListSessions();

  const playerSessions = allSessions
    .filter(s => ((s.playerIds as number[]) ?? []).includes(id))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const last8 = playerSessions.slice(-8);
  const loadTrend = last8.map((s, i) => ({
    name: `S${i+1}`, load: calcLoad(s),
    type: typeLabel[s.sessionType] ?? s.sessionType, date: s.date.split("T")[0],
  }));

  const profileCfg = profileColors[neuro?.profileType ?? ""] ?? profileColors["Balanced Profile"];
  const recs = neuro
    ? getRecommendations(neuro.profileType ?? "", n(neuro.load), n(neuro.explode), n(neuro.drive), n(neuro.asymmetryIndex))
    : [];

  const { points: fvPoints, F0, V0, Pmax } = neuro
    ? getFvData(n(neuro.load), n(neuro.explode))
    : { points:[], F0:0, V0:0, Pmax:0 };

  const rfd = neuro ? calcRFD(n(neuro.isometricForce), n(neuro.load)) : 0;

  // Radar: player + ideal 80/80/80
  const radarData = neuro ? [
    { axis:"LOAD",    value: Math.round(n(neuro.load)),    ideal:80 },
    { axis:"EXPLODE", value: Math.round(n(neuro.explode)), ideal:80 },
    { axis:"DRIVE",   value: Math.round(n(neuro.drive)),   ideal:80 },
  ] : [];

  // Unilateral simulation from asymmetryIndex
  const asymm = n(neuro?.asymmetryIndex);
  const dominantLeg = player?.dominantFoot === "left" ? "Izquierda" : "Derecha";
  const nonDominantLeg = player?.dominantFoot === "left" ? "Derecha" : "Izquierda";
  const cmjBase = n(neuro?.cmjHeight);
  const cmjDominant    = cmjBase > 0 ? +(cmjBase * (1 + asymm/200)).toFixed(1) : null;
  const cmjNonDominant = cmjBase > 0 ? +(cmjBase * (1 - asymm/200)).toFixed(1) : null;

  const critAlerts  = alerts.filter(a => a.severity === "critical");
  const warnAlerts  = alerts.filter(a => a.severity === "warning");

  // Excel-style metrics table rows
  const metricsRows = [
    {
      key:"cmjHeight",       label:"CMJ Height",           abbr:"CMJ",
      value: n(neuro?.cmjHeight), unit:"cm",
      ideal:35, format: (v:number) => fmt(v,1),
      desc:"Salto con contra-movimiento",
    },
    {
      key:"squatJump",       label:"SJ Height (Squat Jump)", abbr:"SJ",
      value: n(neuro?.squatJump), unit:"cm",
      ideal:30, format: (v:number) => fmt(v,1),
      desc:"Squat jump sin amortiguación",
    },
    {
      key:"rsi",             label:"RSI (Reactive Strength)", abbr:"RSI",
      value: n(neuro?.rsi),       unit:"",
      ideal:1.8, format: (v:number) => fmt(v,2),
      desc:"Índice de fuerza reactiva",
    },
    {
      key:"isometricForce",  label:"Fuerza Isométrica (Fmax)", abbr:"Fmax",
      value: n(neuro?.isometricForce), unit:"N",
      ideal:2000, format: (v:number) => v>0?Math.round(v).toString():"—",
      desc:"Fuerza máxima isométrica",
    },
    {
      key:"forcePerKg",      label:"Fuerza Relativa (FmaxRel)", abbr:"FmaxRela",
      value: n(neuro?.forcePerKg), unit:"N/kg",
      ideal:24, format: (v:number) => fmt(v,1),
      desc:"Fmax / peso corporal",
    },
    {
      key:"power",           label:"Potencia Media (p)", abbr:"p(W)",
      value: n(neuro?.power), unit:"W",
      ideal:3000, format: (v:number) => v>0?Math.round(v).toString():"—",
      desc:"Potencia media del salto",
    },
    {
      key:"powerPerKg",      label:"Potencia Relativa (PotmedRel)", abbr:"PotRela",
      value: n(neuro?.powerPerKg), unit:"W/kg",
      ideal:35, format: (v:number) => fmt(v,1),
      desc:"Potencia / peso corporal",
    },
    {
      key:"_pmax",           label:"Potencia Pico (Pmax)", abbr:"Pmax",
      value: neuro ? Pmax*(player?.weight??75) : 0, unit:"W",
      ideal:4000, format: (v:number) => v>0?Math.round(v).toString():"—",
      desc:"Potencia máxima estimada F-V",
    },
    {
      key:"maxSpeed",        label:"Velocidad Máxima (vmax)", abbr:"vmax",
      value: n(neuro?.maxSpeed), unit:"m/s",
      ideal:9.5, format: (v:number) => fmt(v,2),
      desc:"Velocidad máxima sin carga",
    },
    {
      key:"tToVmax",         label:"Tiempo a Vmax (t→vmax)", abbr:"t→vmax",
      value: n(neuro?.tToVmax), unit:"ms",
      ideal:280, format: (v:number) => v>0?Math.round(v).toString():"—",
      desc:"Tiempo hasta alcanzar velocidad máxima",
    },
    {
      key:"asymmetryIndex",  label:"Asimetría Bilateral", abbr:"Disb%",
      value: asymm, unit:"%",
      ideal:10, format: (v:number) => fmt(v,1),
      desc:"Déficit bilateral pierna dominante/no dominante",
    },
    {
      key:"_rfd",            label:"Rate of Force Development", abbr:"RFD",
      value: rfd, unit:"N/s",
      ideal:5000, format: (v:number) => v>0?Math.round(v).toString():"—",
      desc:"Tasa de desarrollo de fuerza (estimada)",
    },
  ].filter(r => r.value > 0);

  // ─── Export PDF ─────────────────────────────────────────────────────────────
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
      const pdf  = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
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
        ctx.fillStyle = "#0a0b0f"; ctx.fillRect(0,0,sl.width,sl.height);
        ctx.drawImage(canvas, 0, yPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
        pdf.addImage(sl.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, pageW, sliceHPx * ratio);
        yMM += pageH;
      }
      pdf.save(`${player?.name ?? "Jugador"}_Informe_Rendimiento.pdf`);
    } catch(e) { console.error(e); }
    finally { setExporting(false); }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
  if (!player) return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center text-muted-foreground">Jugador no encontrado</div>
  );

  return (
    <div className="min-h-screen bg-[#06070d]">
      {/* ── Action bar (not exported) ──────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#0a0b0f]/95 backdrop-blur border-b border-[#1e2130] px-6 py-3 flex items-center gap-4 print:hidden">
        <Link href={`/players/${id}`}>
          <button className="flex items-center gap-2 text-sm text-[#64748b] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al perfil
          </button>
        </Link>
        <div className="flex-1" />
        <div className="text-xs text-[#4a5568]">Informe generado el {today}</div>
        <button
          onClick={exportPDF} disabled={exporting}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-all"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {exporting ? "Generando PDF..." : "Descargar PDF"}
        </button>
      </div>

      {/* ═══ REPORT ════════════════════════════════════════════════════════ */}
      <div ref={reportRef} className="max-w-[920px] mx-auto p-8 space-y-5" style={{ backgroundColor:"#0a0b0f" }}>

        {/* ── 1. COVER ────────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-[#1e2130]"
          style={{ background:"linear-gradient(135deg,#0d1117 0%,#0f1422 55%,#0a0e1a 100%)" }}>
          <div className="h-1 w-full" style={{ background:"linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)" }} />
          <div className="p-7">
            <div className="flex items-start gap-7">
              {/* Photo slot */}
              <div className="w-24 h-24 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border border-[#1e2130] gap-1"
                style={{ background:"linear-gradient(135deg,#1e2130,#0d1117)" }}>
                {player.number
                  ? <span className="text-3xl font-black text-primary">{player.number}</span>
                  : <User className="w-10 h-10 text-[#2a3040]" />}
                <span className="text-[8px] text-[#3a4460] uppercase tracking-wider">Dorsal</span>
              </div>

              {/* Player data */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-primary/50 uppercase">Informe Individual de Rendimiento</span>
                  {neuro?.profileType && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                      style={{ color:profileCfg.text, borderColor:profileCfg.border, backgroundColor:profileCfg.bg }}>
                      {neuro.profileType}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-2">{player.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-base text-[#64748b] font-medium">{player.position ?? "—"}</span>
                  {player.team && <span className="text-sm text-primary/60 font-medium">{player.team}</span>}
                  <span className="text-xs font-bold px-2 py-0.5 rounded border"
                    style={{
                      color: player.injuryStatus==="fit"?"#34d399":player.injuryStatus==="injured"?"#f87171":"#fbbf24",
                      borderColor: player.injuryStatus==="fit"?"#10b981":player.injuryStatus==="injured"?"#ef4444":"#f59e0b",
                      backgroundColor: player.injuryStatus==="fit"?"#0f2d1e":player.injuryStatus==="injured"?"#2d0f0f":"#2d1f0a",
                    }}>
                    {injuryLabel[player.injuryStatus ?? "fit"] ?? player.injuryStatus}
                  </span>
                  <span className="text-xs text-[#4a5568]">
                    Riesgo: <span style={{ color: riskColor[player.riskLevel ?? "low"] }}>
                      {player.riskLevel === "low" ? "Bajo" : player.riskLevel === "medium" ? "Medio" : "Alto"}
                    </span>
                  </span>
                  {neuro?.testDate && (
                    <span className="flex items-center gap-1 text-xs text-[#4a5568]">
                      <Clock className="w-3 h-3" /> Test: {neuro.testDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Date block */}
              <div className="text-right flex-shrink-0">
                <div className="text-[8px] text-[#4a5568] uppercase tracking-wider mb-0.5">Fecha informe</div>
                <div className="text-xs font-bold text-[#64748b]">{today}</div>
                <div className="text-[8px] text-[#4a5568] mt-3 uppercase tracking-wider">Temporada</div>
                <div className="text-xs font-bold text-[#64748b]">2025/26</div>
                <div className="text-[8px] text-[#4a5568] mt-3 uppercase tracking-wider">Sesiones</div>
                <div className="text-xs font-bold text-[#64748b]">{playerSessions.length}</div>
              </div>
            </div>

            {/* Personal data strip */}
            <div className="mt-5 pt-4 border-t border-[#1e2130] grid grid-cols-6 gap-3">
              {[
                { label:"Edad",       value: player.age       != null ? `${player.age} años` : "—" },
                { label:"Talla",      value: player.height    != null ? `${player.height} cm` : "—" },
                { label:"Peso",       value: player.weight    != null ? `${player.weight} kg` : "—" },
                { label:"Pie dom.",   value: player.dominantFoot === "right" ? "Derecho" : player.dominantFoot === "left" ? "Izquierdo" : player.dominantFoot === "both" ? "Ambidiestro" : "—" },
                { label:"Posición",   value: player.position ?? "—" },
                { label:"Nac.",       value: player.nationality ?? "—" },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-[8px] uppercase tracking-wider text-[#4a5568] mb-0.5">{item.label}</div>
                  <div className="text-xs font-bold text-[#94a3b8]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. COMPREHENSIVE METRICS TABLE (Excel-style) ──────────────── */}
        {neuro && metricsRows.length > 0 && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={BarChart3} label="Tabla Comparativa de Variables (Datos_Test)" />

            {/* Quick metric boxes — top 6 */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {metricsRows.slice(0,6).map(row => {
                const st = getStatus(row.key, row.value);
                return (
                  <MetricBox
                    key={row.key}
                    label={row.abbr}
                    value={row.value > 0 ? row.format(row.value) : "—"}
                    unit={row.unit}
                    sub={row.desc}
                    color={row.value > 0 ? st.color : "#4a5568"}
                  />
                );
              })}
            </div>

            {/* Full table */}
            <div className="rounded-lg border border-[#1e2130] overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-[#0f1118]">
                    {["Variable", "Abreviatura", "Valor actual", "Puntuación ideal", "Score (%)", "Estado", "Tendencia"].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[#4a5568]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricsRows.map((row, i) => {
                    const st = getStatus(row.key, row.value);
                    const score = row.value > 0 ? scorePct(row.key, row.value) : 0;
                    return (
                      <tr key={row.key} className={`border-t border-[#1e2130] ${i%2===0?"":"bg-[#0f1118]/40"}`}>
                        <td className="px-3 py-2.5 text-[#94a3b8] font-medium">{row.label}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-[#4a5568]">{row.abbr}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-black text-white">{row.value > 0 ? row.format(row.value) : "—"}</span>
                          {row.unit && <span className="text-[#4a5568] ml-1">{row.unit}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[#4a5568]">
                          {row.format(row.ideal)} {row.unit}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.value > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width:`${score}%`, backgroundColor: st.color }} />
                              </div>
                              <span className="font-bold tabular-nums" style={{ color: st.color }}>{score}%</span>
                            </div>
                          ) : <span className="text-[#4a5568]">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold" style={{ color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <TrendIcon delta={row.value > 0 ? (score - 50) : 0} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[8px] text-[#3a4460] mt-2">
              * RFD y Pmax: valores estimados mediante modelo teórico F-V. Score %: porcentaje respecto al óptimo de élite para la posición.
              t→vmax en milisegundos. Disb%: diferencia bilateral (menor = mejor).
            </p>
          </div>
        )}

        {/* ── 3. NEUROMUSCULAR PROFILE (Radar + LED) ────────────────────── */}
        {neuro && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={Activity} label="Perfil Neuromuscular LED" />
            <div className="grid grid-cols-2 gap-7 items-start">
              {/* Radar */}
              <div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke="#1e2130" gridType="polygon" />
                      <PolarAngleAxis dataKey="axis" tick={<RadarTick />} />
                      {/* Ideal 80 reference */}
                      <Radar dataKey="ideal" stroke="#1e2130" strokeDasharray="4 2" fill="#1e2130" fillOpacity={0.2} name="Ideal 80" />
                      {/* Player */}
                      <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.18} strokeWidth={2}
                        dot={{ fill:"#06b6d4", strokeWidth:0, r:4 }} name="Jugador" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 justify-center mt-1">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#06b6d4]" /><span className="text-[9px] text-[#64748b]">Jugador</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#1e2130] border-t border-dashed border-[#3a4460]" /><span className="text-[9px] text-[#64748b]">Referencia ideal (80)</span></div>
                </div>
              </div>

              {/* LED bars + interpretation */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <ScoreBar label="LOAD — Producción de fuerza" value={n(neuro.load)} color="#f97316" icon={Shield} />
                  <ScoreBar label="EXPLODE — Potencia explosiva" value={n(neuro.explode)} color="#06b6d4" icon={Zap} />
                  <ScoreBar label="DRIVE — Transmisión de fuerza" value={n(neuro.drive)} color="#8b5cf6" icon={Target} />
                </div>

                {/* Score summary */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label:"LOAD",    val:n(neuro.load),    color:"#f97316", icon:Shield },
                    { label:"EXPLODE", val:n(neuro.explode), color:"#06b6d4", icon:Zap },
                    { label:"DRIVE",   val:n(neuro.drive),   color:"#8b5cf6", icon:Target },
                  ].map(m => (
                    <div key={m.label} className="bg-[#0f1118] rounded-lg border border-[#1e2130] p-2.5 text-center">
                      <div className="text-xl font-black tabular-nums" style={{ color:m.color }}>{Math.round(m.val)}</div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-[#4a5568] mt-0.5">{m.label}</div>
                      <div className="text-[8px] text-[#3a4460] mt-0.5">
                        {m.val>=80?"Élite":m.val>=65?"Óptimo":m.val>=50?"Mejorable":"Déficit"}
                      </div>
                    </div>
                  ))}
                </div>

                {neuro.interpretation && (
                  <div className="bg-[#0f1420] rounded-lg border border-[#1e2130] p-3">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-primary/60 mb-1">Interpretación automática</div>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">{neuro.interpretation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. FORCE-VELOCITY CURVE ────────────────────────────────────── */}
        {neuro && fvPoints.length > 0 && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={TrendingUp} label="Curva Fuerza-Velocidad — Modelo Teórico" />
            <div className="grid grid-cols-2 gap-6 items-start">
              <div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fvPoints} margin={{ top:4, right:8, bottom:12, left:0 }}>
                      <defs>
                        <linearGradient id="fvG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pvG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e2130" strokeDasharray="3 3" />
                      <XAxis dataKey="v" tick={{ fill:"#4a5568", fontSize:8 }}
                        label={{ value:"Velocidad (m/s)", fill:"#4a5568", fontSize:8, position:"insideBottom", offset:-6 }} />
                      <YAxis tick={{ fill:"#4a5568", fontSize:8 }} />
                      <Tooltip contentStyle={{ backgroundColor:"#0f1118", border:"1px solid #1e2130", borderRadius:"6px", fontSize:"10px" }}
                        labelStyle={{ color:"#94a3b8" }}
                        formatter={(val, name) => [`${val} ${name==="f"?"N/kg":"W/kg"}`, name==="f"?"Fuerza":"Potencia"]}
                        labelFormatter={v => `V: ${v} m/s`} />
                      <Area type="monotone" dataKey="f" stroke="#06b6d4" fill="url(#fvG)" strokeWidth={2} dot={false} name="f" />
                      <Area type="monotone" dataKey="p" stroke="#f97316" fill="url(#pvG)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="p" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-1 justify-center">
                  <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#06b6d4]" /><span className="text-[9px] text-[#64748b]">Curva F-V</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#f97316] border-t-2 border-dashed border-[#f97316]" /><span className="text-[9px] text-[#64748b]">Curva Potencia</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#0f1118] rounded-lg border border-[#1e2130] p-3 space-y-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#4a5568] mb-2">Parámetros del modelo</div>
                  {[
                    { label:"Fuerza isométrica máx. (F₀)", value:`${F0} N/kg`, color:"#06b6d4" },
                    { label:"Velocidad máxima sin carga (V₀)", value:`${V0} m/s`, color:"#f97316" },
                    { label:"Potencia pico estimada (Pmax)", value:`${Pmax} W/kg`, color:"#8b5cf6" },
                    { label:"RFD estimado", value: rfd > 0 ? `${rfd} N/s` : "—", color:"#10b981" },
                  ].map(p => (
                    <div key={p.label} className="flex justify-between items-center text-xs">
                      <span className="text-[#64748b]">{p.label}</span>
                      <span className="font-bold" style={{ color:p.color }}>{p.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0f1118] rounded-lg border border-[#1e2130] p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#4a5568] mb-1.5">Orientación del perfil</div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    {n(neuro.load) > n(neuro.explode)
                      ? "Perfil orientado a la fuerza. Alta capacidad de producción de fuerza a bajas velocidades. Mejora recomendada: cuadrante velocidad-potencia (balísticos, sprints cortos)."
                      : "Perfil orientado a la potencia/velocidad. Alta velocidad de ejecución y potencia explosiva. Mejora recomendada: cuadrante fuerza máxima (cargas superiores al 80% 1RM)."}
                  </p>
                </div>

                {/* Encoder curves placeholder */}
                <div className="bg-[#0f1118] rounded-lg border border-[#1e2130] border-dashed p-3 flex flex-col items-center gap-2">
                  <Activity className="w-5 h-5 text-[#2a3040]" />
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#3a4460] text-center">
                    Curvas Fuerza-Tiempo (Encoder)<br />
                    <span className="text-[8px] font-normal text-[#2a3040]">Preparado para importar datos de encoder lineal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. UNILATERAL / BILATERAL ANALYSIS ────────────────────────── */}
        {neuro && (cmjBase > 0 || asymm > 0) && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={BarChart3} label="Análisis Unilateral y Disbalances" />
            <div className="grid grid-cols-2 gap-6">
              {/* Left - bilateral comparison */}
              <div className="space-y-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#4a5568] mb-3">
                  Estimación bilateral — CMJ
                </div>

                {/* Dominant leg */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                      <span className="text-[#94a3b8] font-medium">Pierna {dominantLeg} (dom.)</span>
                    </div>
                    <span className="font-black text-white">{cmjDominant ?? "—"} cm</span>
                  </div>
                  <div className="h-2 bg-[#1e2130] rounded-full overflow-hidden">
                    <div className="h-full bg-[#06b6d4] rounded-full"
                      style={{ width: cmjDominant ? `${Math.min(100,(cmjDominant/50)*100)}%` : "0%" }} />
                  </div>
                </div>

                {/* Non-dominant leg */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                      <span className="text-[#94a3b8] font-medium">Pierna {nonDominantLeg} (no dom.)</span>
                    </div>
                    <span className="font-black text-white">{cmjNonDominant ?? "—"} cm</span>
                  </div>
                  <div className="h-2 bg-[#1e2130] rounded-full overflow-hidden">
                    <div className="h-full bg-[#8b5cf6] rounded-full"
                      style={{ width: cmjNonDominant ? `${Math.min(100,(cmjNonDominant/50)*100)}%` : "0%" }} />
                  </div>
                </div>

                {/* Asymmetry result */}
                <div className={`rounded-lg border p-3 ${asymm > 15 ? "bg-red-500/8 border-red-500/20" : asymm > 10 ? "bg-yellow-500/8 border-yellow-500/20" : "bg-emerald-500/8 border-emerald-500/20"}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${asymm>15?"text-red-400":asymm>10?"text-yellow-400":"text-emerald-400"}`} />
                    <div>
                      <div className="text-xs font-bold" style={{ color: asymm>15?"#f87171":asymm>10?"#fbbf24":"#34d399" }}>
                        Asimetría bilateral: {fmt(asymm,1)}%
                      </div>
                      <div className="text-[9px] text-[#64748b] mt-0.5">
                        {asymm > 15 ? "Elevada — riesgo de lesión aumentado. Priorizar trabajo unilateral compensatorio."
                          : asymm > 10 ? "Moderada — monitorizar evolución. Incorporar trabajo unilateral preventivo."
                          : "Dentro del rango normal (≤10%). Mantener equilibrio bilateral."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - disbalance table */}
              <div className="rounded-lg border border-[#1e2130] overflow-hidden">
                <div className="bg-[#0f1118] px-3 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#4a5568]">Tabla Disbalances</span>
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-t border-[#1e2130]">
                      {["Métrica", dominantLeg, nonDominantLeg, "Δ%", "Estado"].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-bold text-[#4a5568] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label:"CMJ (cm)", dom: cmjDominant, nodom: cmjNonDominant, delta: asymm },
                      { label:"RSI", dom: neuro.rsi ? +(n(neuro.rsi)*1.03).toFixed(2) : null,
                        nodom: neuro.rsi ? +(n(neuro.rsi)*0.97).toFixed(2) : null, delta: asymm*0.6 },
                      { label:"Asimetría %", dom: null, nodom: null, delta: asymm },
                    ].map((row, i) => (
                      <tr key={i} className="border-t border-[#1e2130]">
                        <td className="px-3 py-2 text-[#94a3b8] font-medium">{row.label}</td>
                        <td className="px-3 py-2 font-bold text-white">{row.dom ?? "—"}</td>
                        <td className="px-3 py-2 font-bold text-white">{row.nodom ?? "—"}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: row.delta>15?"#f87171":row.delta>10?"#fbbf24":"#34d399" }}>
                          {fmt(row.delta,1)}%
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-bold" style={{ color: row.delta>15?"#f87171":row.delta>10?"#fbbf24":"#34d399" }}>
                            {row.delta>15?"✗ Riesgo":row.delta>10?"⚠ Vigilar":"✓ OK"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2 border-t border-[#1e2130]">
                  <p className="text-[8px] text-[#3a4460]">
                    * Valores estimados desde índice global de asimetría. Para datos unilaterales precisos, importar test con encoder bilateral.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. SESSION LOAD TREND ───────────────────────────────────────── */}
        {loadTrend.length > 0 && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={Dumbbell} label="Tendencia de Carga — Últimas Sesiones" />
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loadTrend} margin={{ top:4, right:8, bottom:4, left:0 }}>
                  <defs>
                    <linearGradient id="ltG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e2130" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill:"#4a5568", fontSize:9 }} />
                  <YAxis tick={{ fill:"#4a5568", fontSize:9 }} domain={[0,100]} />
                  <ReferenceLine y={75} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor:"#0f1118", border:"1px solid #1e2130", borderRadius:"6px", fontSize:"10px" }}
                    formatter={(v, _, p) => [`${v}%  (${p.payload.type})`, "Carga estimada"]}
                    labelFormatter={(_,payload) => payload?.[0]?.payload?.date ?? ""} />
                  <Area type="monotone" dataKey="load" stroke="#06b6d4" fill="url(#ltG)" strokeWidth={2} dot={{ fill:"#06b6d4", r:3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-[#1e2130]">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-[#0f1118]">
                    {["Fecha","Sesión","Tipo","Duración","Intensidad","Carga est."].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[#4a5568]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {last8.map((s, i) => {
                    const carga = calcLoad(s);
                    const c = typeColor[s.sessionType] ?? "#64748b";
                    return (
                      <tr key={s.id} className={`border-t border-[#1e2130] ${i%2===0?"":"bg-[#0f1118]/40"}`}>
                        <td className="px-3 py-2 text-[#64748b]">{s.date.split("T")[0]}</td>
                        <td className="px-3 py-2 text-[#94a3b8] font-medium">{s.title}</td>
                        <td className="px-3 py-2">
                          <span className="font-bold text-[8px] uppercase tracking-wider" style={{ color:c }}>{typeLabel[s.sessionType] ?? s.sessionType}</span>
                        </td>
                        <td className="px-3 py-2 text-[#64748b]">{s.duration} min</td>
                        <td className="px-3 py-2 text-[#64748b] capitalize">{s.intensity}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width:`${carga}%`, backgroundColor:c }} />
                            </div>
                            <span className="font-bold tabular-nums" style={{ color:c }}>{carga}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 7. ALERTS ───────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={AlertTriangle} label="Alertas y Señales de Riesgo" />
            <div className="space-y-2">
              {[...critAlerts, ...warnAlerts, ...alerts.filter(a=>a.severity==="info")].map(alert => {
                const isCrit = alert.severity === "critical";
                const isWarn = alert.severity === "warning";
                const bg = isCrit?"bg-red-500/8 border-red-500/20":isWarn?"bg-yellow-500/8 border-yellow-500/20":"bg-blue-500/8 border-blue-500/20";
                const tc = isCrit?"#f87171":isWarn?"#fbbf24":"#60a5fa";
                return (
                  <div key={alert.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${bg}`}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor:tc }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest" style={{ color:tc }}>
                          {isCrit?"CRÍTICO":isWarn?"ATENCIÓN":"INFO"}
                        </span>
                        <span className="text-[11px] font-bold text-[#94a3b8]">{alert.message}</span>
                      </div>
                      {alert.recommendation && (
                        <p className="text-[10px] text-[#64748b] mt-0.5 leading-relaxed">{alert.recommendation}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 8. AUTOMATIC INTERPRETATION ────────────────────────────────── */}
        {neuro && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={Brain} label="Interpretación Automática del Perfil" />
            <div className="space-y-3 text-[11px] text-[#94a3b8] leading-relaxed">
              {/* Strengths */}
              <div className="bg-[#0f2d1e] border border-[#10b981]/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#34d399]">Puntos fuertes</span>
                </div>
                <p>
                  {[
                    n(neuro.load) >= 65 && `Load óptimo (${Math.round(n(neuro.load))}/100) — alta capacidad de producción de fuerza máxima. Perfil adecuado para posiciones de contacto.`,
                    n(neuro.explode) >= 65 && `Explode sólido (${Math.round(n(neuro.explode))}/100) — buena potencia explosiva y capacidad de aceleración. Efectivo en sprints cortos y saltos.`,
                    n(neuro.drive) >= 65 && `Drive eficiente (${Math.round(n(neuro.drive))}/100) — buena transmisión de fuerza al suelo. Tiempos de contacto dentro del rango óptimo.`,
                    n(neuro.rsi) >= 1.5 && `RSI ≥ 1.5 — excelente fuerza reactiva. Capacidad de reutilización del ciclo estiramiento-acortamiento.`,
                    asymm <= 10 && `Simetría bilateral dentro del rango aceptable (${fmt(asymm,1)}%). Bajo riesgo de lesión por desequilibrio muscular.`,
                  ].filter(Boolean).join(" ") || "No se detectan fortalezas significativas en el perfil actual. Se recomienda una evaluación técnica completa."}
                </p>
              </div>

              {/* Areas of improvement */}
              <div className="bg-[#2d1f0a] border border-[#f59e0b]/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24]" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#fbbf24]">Áreas de mejora</span>
                </div>
                <p>
                  {[
                    n(neuro.load) < 65 && `Déficit en Load (${Math.round(n(neuro.load))}/100) — producción de fuerza por debajo del umbral óptimo. Indicativo de déficit en fuerza máxima e hipertrofia funcional.`,
                    n(neuro.explode) < 65 && `Déficit en Explode (${Math.round(n(neuro.explode))}/100) — potencia explosiva limitada. Puede afectar al rendimiento en sprints, saltos y cambios de dirección bruscos.`,
                    n(neuro.drive) < 65 && `Déficit en Drive (${Math.round(n(neuro.drive))}/100) — baja eficiencia en la transmisión de fuerza al suelo. Tiempos de contacto elevados y menor aceleración reactiva.`,
                    n(neuro.rsi) > 0 && n(neuro.rsi) < 1.5 && `RSI bajo (${fmt(neuro.rsi,2)}) — fuerza reactiva insuficiente. Riesgo aumentado de lesiones de tejido blando en acciones de alta velocidad.`,
                    asymm > 10 && `Asimetría bilateral del ${fmt(asymm,1)}% — ${asymm>15?"nivel de riesgo elevado":"nivel moderado a vigilar"}. Puede predisponer a lesiones musculares en el lado dominante.`,
                  ].filter(Boolean).join(" ") || "No se detectan déficits críticos en el perfil actual. Mantener el programa de entrenamiento planificado."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 9. RECOMMENDATIONS ─────────────────────────────────────────── */}
        {recs.length > 0 && (
          <div className="bg-[#0d0e14] rounded-xl border border-[#1e2130] p-5">
            <SectionLabel icon={Target} label="Recomendaciones Metodológicas por Microciclo" />
            <div className="space-y-2.5">
              {recs.map((rec, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black mt-0.5"
                    style={{ background:`linear-gradient(135deg,#06b6d4,#3b82f6)`, color:"#000" }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed flex-1">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 10. FOOTER ──────────────────────────────────────────────────── */}
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
          <div className="text-center">
            <div className="text-[8px] text-[#3a4460] font-bold uppercase tracking-wider">DOCUMENTO CONFIDENCIAL</div>
            <div className="text-[8px] text-[#3a4460]">Club Performance Dept. · Temporada 2025/26</div>
          </div>
          <div className="text-right text-[8px] text-[#3a4460]">
            <div>{today}</div>
            <div className="mt-0.5">Página 1</div>
          </div>
        </div>

      </div>
    </div>
  );
}
