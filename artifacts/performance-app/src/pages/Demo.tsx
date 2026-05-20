import { Link } from "wouter";
import Layout from "@/components/Layout";
import {
  Zap, Users, CalendarDays, FileText, BookOpen, Activity,
  ArrowRight, ChevronRight, Upload, Brain, Bell, Dumbbell,
  Download, Shield, Target, TrendingUp, Clock, AlertTriangle,
  BarChart3, Layers, CheckCircle2, XCircle, Sparkles,
  Play, ExternalLink,
} from "lucide-react";

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-16 px-8 ${className}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-primary" />
      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-primary/70">{children}</span>
    </div>
  );
}

// ─── Problem card ─────────────────────────────────────────────────────────────
function ProblemCard({ icon: Icon, title, desc }: {
  icon: React.ElementType; title: string; desc: string;
}) {
  return (
    <div className="flex gap-4 p-5 rounded-xl border border-red-500/10 bg-red-500/5 hover:border-red-500/20 hover:bg-red-500/8 transition-all">
      <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-red-400" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Flow step ────────────────────────────────────────────────────────────────
function FlowStep({ n, icon: Icon, title, desc, color, last = false }: {
  n: number; icon: React.ElementType; title: string; desc: string;
  color: string; last?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 flex-1 relative">
      <div className="flex flex-col items-center gap-0 flex-shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border font-black text-sm"
          style={{ background: `${color}18`, borderColor: `${color}35`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {!last && (
          <div className="hidden lg:block absolute top-5 left-10 right-0 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-black tabular-nums" style={{ color }}>{String(n).padStart(2, "0")}</span>
          <h3 className="text-xs font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Module card ─────────────────────────────────────────────────────────────
function ModuleCard({ icon: Icon, title, desc, href, color, features }: {
  icon: React.ElementType; title: string; desc: string;
  href: string; color: string; features: string[];
}) {
  return (
    <div className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/25 transition-all duration-200 card-hover">
      {/* Top accent */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(to right, ${color}, ${color}50)` }} />

      <div className="p-5 flex-1">
        {/* Icon + title */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <Link href={href}>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground">
              Abrir <ExternalLink className="w-3 h-3" />
            </button>
          </Link>
        </div>

        <h3 className="text-sm font-bold text-foreground mb-1.5">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{desc}</p>

        {/* Features */}
        <ul className="space-y-1.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color }} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Link href={href}>
          <button
            className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border transition-all"
            style={{
              background: `${color}12`,
              borderColor: `${color}30`,
              color,
            }}
          >
            Ver módulo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Impact KPI ───────────────────────────────────────────────────────────────
function ImpactKPI({ value, unit, label, color = "hsl(184 100% 42%)" }: {
  value: string; unit?: string; label: string; color?: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-1 mb-1">
        <span className="text-5xl font-black tabular-nums leading-none" style={{ color }}>{value}</span>
        {unit && <span className="text-xl font-black mb-1" style={{ color: `${color}90` }}>{unit}</span>}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-28 mx-auto">{label}</p>
    </div>
  );
}

// ─── Mockup preview ───────────────────────────────────────────────────────────
function MockupScreen({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Fake browser bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60" style={{ background: "hsl(230 20% 4%)" }}>
        <div className="w-2 h-2 rounded-full bg-red-500/60" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
        <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
        <div className="flex-1 mx-3 h-4 bg-secondary rounded text-[9px] flex items-center px-2 text-muted-foreground/40">
          performanceiq.app/{label.toLowerCase()}
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Demo() {
  return (
    <Layout>
      <div className="overflow-x-hidden">

        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <div
          className="relative border-b border-border/50 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #060812 0%, #0b1025 40%, #070a14 70%, #06080f 100%)" }}
        >
          {/* Decorative glow blobs */}
          <div className="absolute top-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, hsl(184 100% 50%), transparent 70%)" }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }} />

          <div className="relative max-w-6xl mx-auto px-8 pt-16 pb-14">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold tracking-wider text-primary">Vista Comercial · Demo Club</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Left: Text */}
              <div>
                <h1
                  className="text-5xl font-black leading-[1.05] tracking-tight mb-5"
                  style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #06d6f0 50%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  De los datos al rendimiento, en segundos.
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  <strong className="text-foreground">PerformanceIQ</strong> es la plataforma de rendimiento deportivo que convierte tus datos de test en decisiones de entrenamiento individualizadas, alertas de riesgo y informes profesionales — de forma automática.
                </p>

                {/* CTAs */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href="/players">
                    <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
                      <Play className="w-4 h-4" /> Explorar la plataforma
                    </button>
                  </Link>
                  <Link href="/players/1">
                    <button className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:border-primary/30 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                      Ver perfil de jugador <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/players/1/report">
                    <button className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:border-primary/30 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                      Informe PDF <Download className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Right: Dashboard mockup preview */}
              <div className="hidden lg:block">
                <MockupScreen label="dashboard">
                  <div className="space-y-2">
                    {/* KPI row */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "Plantel", val: "16", color: "#06b6d4" },
                        { label: "Aptos", val: "12", color: "#10b981" },
                        { label: "Riesgo", val: "2",  color: "#f59e0b" },
                        { label: "Sesiones", val: "4", color: "#f97316" },
                      ].map(k => (
                        <div key={k.label} className="bg-secondary/60 rounded-lg p-2 text-center">
                          <div className="text-base font-black" style={{ color: k.color }}>{k.val}</div>
                          <div className="text-[8px] text-muted-foreground/50">{k.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* LED bars */}
                    <div className="bg-secondary/30 rounded-lg p-2.5 space-y-2">
                      {[
                        { label: "LOAD", pct: 69, color: "#f97316" },
                        { label: "EXPLODE", pct: 75, color: "#06b6d4" },
                        { label: "DRIVE", pct: 70, color: "#8b5cf6" },
                      ].map(b => (
                        <div key={b.label}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[8px] font-bold text-muted-foreground">{b.label}</span>
                            <span className="text-[8px] font-black" style={{ color: b.color }}>{b.pct}</span>
                          </div>
                          <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Alert */}
                    <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/15 rounded-lg px-2.5 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[9px] font-bold text-red-400">CRÍTICO</span>
                      <span className="text-[9px] text-muted-foreground">Raúl Jiménez · RSI bajo — seguimiento médico inmediato</span>
                    </div>
                  </div>
                </MockupScreen>
              </div>
            </div>
          </div>
          <div className="gradient-sep" />
        </div>

        {/* ══ IMPACT KPIs ═══════════════════════════════════════════════════ */}
        <div className="border-b border-border/40" style={{ background: "hsl(230 18% 4%)" }}>
          <div className="max-w-6xl mx-auto px-8 py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <ImpactKPI value="44" label="Ejercicios clasificados por perfil LED" color="#06b6d4" />
              <ImpactKPI value="3" label="Perfiles neuromusculares detectados automáticamente" color="#8b5cf6" />
              <ImpactKPI value="< 30" unit="s" label="Para generar una sesión individualizada" color="#10b981" />
              <ImpactKPI value="1" label="Clic para exportar informe PDF profesional" color="#f97316" />
            </div>
          </div>
          <div className="gradient-sep" />
        </div>

        {/* ══ PROBLEMS ══════════════════════════════════════════════════════ */}
        <Section>
          <SectionLabel>El problema</SectionLabel>
          <h2 className="text-3xl font-black text-foreground mb-2">¿Por qué los clubes pierden datos valiosos?</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
            La mayoría de los equipos hacen los tests. Pocos los interpretan. Casi ninguno conecta ese dato con el entrenamiento del lunes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ProblemCard
              icon={BarChart3}
              title="Demasiados datos, poca interpretación"
              desc="Los preparadores reciben CSV de Chronojump o Excel con decenas de columnas. Nadie sabe qué significa cada número ni qué hacer con él."
            />
            <ProblemCard
              icon={Clock}
              title="Informes manuales que tardan horas"
              desc="Preparar un informe individual profesional para presentar al cuerpo técnico requiere horas de trabajo en Word o PowerPoint."
            />
            <ProblemCard
              icon={Users}
              title="Entrenamientos genéricos, no individualizados"
              desc="Se entrena igual a todos. Un jugador explosivo y uno de fuerza hacen la misma sesión, con el mismo volumen y los mismos ejercicios."
            />
            <ProblemCard
              icon={AlertTriangle}
              title="Alertas de riesgo invisibles"
              desc="Las asimetrías bilaterales, los RSI bajos o los déficits en Drive pasan desapercibidos hasta que hay una lesión."
            />
            <ProblemCard
              icon={Layers}
              title="Sin conexión entre test y sesión"
              desc="El resultado del test del viernes no influye en la planificación del lunes. Los datos quedan archivados sin impactar el proceso de entrenamiento."
            />
            <ProblemCard
              icon={XCircle}
              title="Sin control de carga semanal"
              desc="No existe visibilidad de la carga acumulada por posición o por perfil a lo largo de los microciclos, y mucho menos cerca del día de partido."
            />
          </div>
        </Section>

        {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
        <div className="border-y border-border/50" style={{ background: "linear-gradient(135deg, hsl(230 20% 3.5%) 0%, hsl(220 18% 4.5%) 100%)" }}>
          <Section>
            <SectionLabel>El flujo</SectionLabel>
            <h2 className="text-3xl font-black text-foreground mb-2">Cómo funciona PerformanceIQ</h2>
            <p className="text-sm text-muted-foreground mb-10 max-w-2xl">
              Cinco pasos que transforman un CSV de test en una sesión individualizada, una alerta de riesgo y un informe listo para el cuerpo técnico.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative">
              <FlowStep
                n={1} icon={Upload} title="Importa datos"
                desc="Carga tu CSV de Chronojump o añade jugadores manualmente. Columnas en español e inglés."
                color="#06b6d4"
              />
              <FlowStep
                n={2} icon={Brain} title="Perfil LED automático"
                desc="El motor calcula Load, Explode y Drive y detecta el perfil neuromuscular (Power, Strength, Force, Balanced)."
                color="#8b5cf6"
              />
              <FlowStep
                n={3} icon={Bell} title="Alertas de riesgo"
                desc="Si RSI < 1.5, asimetría > 15% o Drive < 50, se genera una alerta automática priorizada por severidad."
                color="#f59e0b"
              />
              <FlowStep
                n={4} icon={Zap} title="Sesión individualizada"
                desc="El generador selecciona ejercicios según el perfil LED, el día de microciclo y los jugadores disponibles."
                color="#10b981"
              />
              <FlowStep
                n={5} icon={Download} title="Informe PDF" last
                desc="Informe profesional con perfil neuromuscular, curva F-V, métricas, alertas y recomendaciones metodológicas."
                color="#f97316"
              />
            </div>

            {/* Flow arrows visual */}
            <div className="hidden lg:flex items-center justify-center gap-0 mt-6">
              {["Datos CSV", "Perfil LED", "Alertas", "Sesión", "Informe PDF"].map((label, i, arr) => (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center gap-1 px-4">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: ["#06b6d4","#8b5cf6","#f59e0b","#10b981","#f97316"][i] }}
                    />
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/20 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ══ MODULES ═══════════════════════════════════════════════════════ */}
        <Section>
          <SectionLabel>Módulos</SectionLabel>
          <h2 className="text-3xl font-black text-foreground mb-2">Todo en una plataforma</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
            Seis módulos integrados que cubren el ciclo completo del rendimiento deportivo, desde el test hasta el informe.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ModuleCard
              icon={Users} title="Gestión de Jugadores" href="/players" color="#06b6d4"
              desc="Fichas individuales completas con historial médico, datos físicos, tests registrados y estado de disponibilidad."
              features={[
                "Importación CSV desde Chronojump",
                "Estado físico y nivel de riesgo",
                "Búsqueda y filtrado por posición",
              ]}
            />
            <ModuleCard
              icon={Activity} title="Perfil Neuromuscular LED" href="/players/1" color="#8b5cf6"
              desc="Radar Load/Explode/Drive con interpretación automática del perfil, benchmarks elite y métricas de salto y fuerza."
              features={[
                "Radar chart con media del equipo",
                "CMJ, SJ, RSI, fuerza isométrica",
                "Curva fuerza-velocidad teórica",
              ]}
            />
            <ModuleCard
              icon={Zap} title="Generador de Sesiones" href="/sessions/generate" color="#10b981"
              desc="Genera sesiones de entrenamiento individualizadas en segundos basándose en el perfil LED y el día de microciclo."
              features={[
                "44 ejercicios clasificados por fase",
                "Selección por perfil y microciclo",
                "Control de carga y fatiga acumulada",
              ]}
            />
            <ModuleCard
              icon={CalendarDays} title="Planner Semanal" href="/planner" color="#f59e0b"
              desc="Vista de microciclo de 7 días con drag & drop, análisis de carga, alertas de sobrecarga y etiquetas MD."
              features={[
                "Drag & drop entre sesiones",
                "Carga acumulada visual",
                "Alertas MD-1 y MD-2 automáticas",
              ]}
            />
            <ModuleCard
              icon={FileText} title="Informes PDF Profesionales" href="/reports" color="#f97316"
              desc="Informes individuales listos para presentar al cuerpo técnico o al propio jugador, exportables en un clic."
              features={[
                "Portada, radar y métricas",
                "Recomendaciones metodológicas",
                "Diseño A4 con branding de club",
              ]}
            />
            <ModuleCard
              icon={BookOpen} title="Biblioteca de Ejercicios" href="/library" color="#ec4899"
              desc="Catálogo de 44 ejercicios clasificados por sección, fase LED, carga neuromuscular y cues de coaching."
              features={[
                "Filtrado por fase y sección",
                "Puntos de carga y fatiga",
                "Indicador de seguridad para lesionados",
              ]}
            />
          </div>
        </Section>

        {/* ══ TESTIMONIAL / VISUAL ════════════════════════════════════════ */}
        <div className="border-y border-border/50" style={{ background: "linear-gradient(to bottom right, #08090f, #0c1020, #080a12)" }}>
          <Section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <SectionLabel>Para quién</SectionLabel>
                <h2 className="text-3xl font-black text-foreground mb-4">
                  Diseñado para preparadores físicos de élite
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  PerformanceIQ está pensado para el profesional que ya usa tests —
                  Chronojump, VALD, Hawkin Dynamics, encoder lineal — pero necesita
                  una plataforma que convierta esos datos en <strong className="text-foreground">decisiones de entrenamiento
                  inmediatas</strong> y en informes que el cuerpo técnico entienda.
                </p>
                <ul className="space-y-3">
                  {[
                    { icon: Target, text: "Preparadores físicos de fútbol profesional y semiprofesional" },
                    { icon: Shield, text: "Coordinadores de rendimiento y metodología" },
                    { icon: TrendingUp, text: "Clubes con 15–100 jugadores en plantilla" },
                    { icon: BarChart3, text: "Academias con seguimiento de cantera" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Player mockup */}
              <div className="space-y-3">
                <MockupScreen label="players/9">
                  <div className="space-y-3">
                    {/* Player header */}
                    <div className="flex items-center gap-3 p-2 bg-secondary/40 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                        <span className="text-sm font-black text-primary">9</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Raúl Jiménez</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">LESIONADO</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">STRENGTH</span>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-[8px] text-muted-foreground/50">Último test</div>
                        <div className="text-[9px] font-bold text-muted-foreground">14 may 2026</div>
                      </div>
                    </div>
                    {/* LED mini */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[["LOAD","80","#f97316"],["EXPLODE","52","#06b6d4"],["DRIVE","61","#8b5cf6"]].map(([l,v,c]) => (
                        <div key={l} className="bg-secondary/50 rounded p-2 text-center">
                          <div className="text-sm font-black" style={{ color: c }}>{v}</div>
                          <div className="text-[7px] text-muted-foreground/50">{l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Alert */}
                    <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/15 rounded px-2 py-1.5">
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <span className="text-[9px] text-red-400 font-medium">RSI bajo: 1.18 (ref. ≥1.50) — Alto riesgo de lesión</span>
                    </div>
                  </div>
                </MockupScreen>

                <MockupScreen label="sessions/generate">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Sesión generada · MD-3 · Fuerza</span>
                      <span className="text-[8px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">85 min</span>
                    </div>
                    {[
                      { name: "Footing progresivo", section: "Calentamiento", load: 1 },
                      { name: "Sentadilla búlgara", section: "Fuerza", load: 4 },
                      { name: "CMJ con pausa", section: "Pliometría", load: 3 },
                      { name: "RDL excéntrico unilateral", section: "Fuerza", load: 4 },
                    ].map(ex => (
                      <div key={ex.name} className="flex items-center gap-2 px-2 py-1.5 bg-secondary/40 rounded">
                        <div className="flex-1">
                          <div className="text-[9px] font-semibold text-foreground">{ex.name}</div>
                          <div className="text-[8px] text-muted-foreground/50">{ex.section}</div>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({length: 5}).map((_,i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < ex.load ? "#f97316" : "#1e2a3a" }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </MockupScreen>
              </div>
            </div>
          </Section>
        </div>

        {/* ══ CTA ══════════════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #07090f 0%, #0d1428 50%, #060810 100%)" }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[200px] rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(ellipse, hsl(184 100% 50%), transparent 70%)" }} />
          </div>
          <div className="relative max-w-3xl mx-auto px-8 py-16 text-center">
            <div className="gradient-sep mb-10" />
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold tracking-wider text-primary">Empieza ahora · Sin configuración</span>
            </div>
            <h2
              className="text-4xl font-black mb-4 leading-tight"
              style={{ background: "linear-gradient(135deg, #f0f4ff, #06d6f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Enseña la plataforma a tu club hoy mismo
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto">
              Todos los datos de demo están disponibles en tiempo real. Navega por los perfiles, genera una sesión, exporta un informe y ve el resultado en minutos.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
                  <BarChart3 className="w-4 h-4" /> Ver Dashboard
                </button>
              </Link>
              <Link href="/players">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:border-primary/30 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  <Users className="w-4 h-4" /> Ver Jugadores
                </button>
              </Link>
              <Link href="/sessions/generate">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:border-primary/30 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  <Zap className="w-4 h-4" /> Generar Sesión
                </button>
              </Link>
              <Link href="/players/1/report">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/20 bg-primary/8 text-primary text-sm font-semibold hover:bg-primary/12 transition-all">
                  <Download className="w-4 h-4" /> Exportar PDF
                </button>
              </Link>
            </div>

            {/* Feature badges */}
            <div className="flex items-center justify-center gap-4 flex-wrap mt-8">
              {["Datos en tiempo real", "Sin configuración", "PDF profesional", "Perfil LED automático", "16 jugadores de demo"].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
