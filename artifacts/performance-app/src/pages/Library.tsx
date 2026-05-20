import { useState } from "react";
import { useListExercises } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { BookOpen, Search, Filter, Zap, Shield, Target, Activity, X } from "lucide-react";

const SECTION_COLORS: Record<string, string> = {
  "Calentamiento":          "#06b6d4",
  "Activación neuromuscular": "#8b5cf6",
  "Fuerza":                 "#f97316",
  "Pliometría":             "#ef4444",
  "Velocidad":              "#3b82f6",
  "Preventivo":             "#10b981",
  "Vuelta a la calma":      "#64748b",
};
const PHASE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  load:     { color: "#f97316", icon: Shield, label: "Load" },
  explode:  { color: "#06b6d4", icon: Zap,    label: "Explode" },
  drive:    { color: "#8b5cf6", icon: Target,  label: "Drive" },
  balanced: { color: "#10b981", icon: Activity,label: "Balanced" },
};

const LOAD_COLORS = ["", "#10b981", "#84cc16", "#f59e0b", "#ef4444", "#dc2626"];

const ALL_SECTIONS = ["Calentamiento", "Activación neuromuscular", "Fuerza", "Pliometría", "Velocidad", "Preventivo", "Vuelta a la calma"];
const ALL_PHASES   = ["load", "explode", "drive", "balanced"];

interface Exercise {
  id: string; name: string; section: string; phase: string;
  neuromuscularLoad?: number | null; fatigueGenerated?: number | null;
  objective?: string | null; safeForInjured?: boolean | null;
  coachingCues?: string[] | null;
}

function ExerciseCard({ ex }: { ex: Exercise }) {
  const [expanded, setExpanded] = useState(false);
  const sectionColor = SECTION_COLORS[ex.section] ?? "#64748b";
  const phaseCfg = PHASE_CONFIG[ex.phase] ?? PHASE_CONFIG.balanced;
  const PIcon = phaseCfg.icon;
  const load = ex.neuromuscularLoad ?? 1;

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all cursor-pointer"
      onClick={() => setExpanded(v => !v)}
    >
      {/* Top accent */}
      <div className="h-[2px]" style={{ background: sectionColor }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${phaseCfg.color}18` }}
          >
            <PIcon className="w-4 h-4" style={{ color: phaseCfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-snug">{ex.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: sectionColor }}>
                {ex.section}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: phaseCfg.color }}>
                {phaseCfg.label}
              </span>
              {ex.safeForInjured && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">✓ Seguro lesión</span>
              )}
            </div>
          </div>
          {/* Load dots */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ backgroundColor: i < load ? LOAD_COLORS[load] : "#1e2a3a" }}
              />
            ))}
          </div>
        </div>

        {/* Objective */}
        {ex.objective && (
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
            {ex.objective}
          </p>
        )}

        {/* Coaching cues (expanded) */}
        {expanded && ex.coachingCues && ex.coachingCues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Cues de coaching</div>
            {ex.coachingCues.map((cue, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                {cue}
              </div>
            ))}
          </div>
        )}

        {/* Fatigue */}
        {ex.fatigueGenerated != null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground/50">Fatiga:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: i < (ex.fatigueGenerated ?? 0) ? "#ef4444" : "#1e2a3a" }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Library() {
  const { data: exercises = [], isLoading } = useListExercises({});
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [filterPhase, setFilterPhase] = useState<string | null>(null);

  const filtered = (exercises as Exercise[]).filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.objective?.toLowerCase().includes(search.toLowerCase());
    const matchSection = !filterSection || ex.section === filterSection;
    const matchPhase = !filterPhase || ex.phase === filterPhase;
    return matchSearch && matchSection && matchPhase;
  });

  const hasFilters = !!filterSection || !!filterPhase || !!search;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Biblioteca de Ejercicios</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {exercises.length} ejercicios · clasificados por sección, fase LED y carga neuromuscular
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Section filter */}
          <div className="flex gap-1.5 flex-wrap">
            {ALL_SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => setFilterSection(filterSection === s ? null : s)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${
                  filterSection === s
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
                style={filterSection === s ? {} : {}}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Phase filter */}
          <div className="flex gap-1.5">
            {ALL_PHASES.map(p => {
              const cfg = PHASE_CONFIG[p];
              const Icon = cfg.icon;
              return (
                <button
                  key={p}
                  onClick={() => setFilterPhase(filterPhase === p ? null : p)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all"
                  style={filterPhase === p
                    ? { borderColor: `${cfg.color}60`, background: `${cfg.color}18`, color: cfg.color }
                    : { borderColor: "hsl(230 14% 11%)", background: "hsl(230 18% 5%)", color: "hsl(220 10% 52%)" }}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterSection(null); setFilterPhase(null); }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}

          <span className="text-xs text-muted-foreground/60 ml-auto">
            {filtered.length} resultados
          </span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
            {filtered.map(ex => <ExerciseCard key={ex.id} ex={ex} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Filter className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">Sin resultados para ese filtro</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
