import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard, Users, Dumbbell, Menu, X, Activity,
  Zap, CalendarDays, FileText, BookOpen, Settings, ChevronRight,
  Gauge, Presentation, Shield,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/players", label: "Jugadores", icon: Users },
      { href: "/teams", label: "Equipos", icon: Shield },
    ],
  },
  {
    label: "Entrenamiento",
    items: [
      { href: "/sessions", label: "Sesiones", icon: Dumbbell },
      { href: "/sessions/generate", label: "Generador", icon: Zap },
      { href: "/planner", label: "Planificación", icon: CalendarDays },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/reports", label: "Informes", icon: FileText },
      { href: "/library", label: "Biblioteca", icon: BookOpen },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Configuración", icon: Settings },
];

function NavItem({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid={`nav-${label.toLowerCase()}`}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group select-none
        ${active
          ? "bg-primary/10 text-primary nav-active-glow"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
        }`}
    >
      {active && (
        <div className="absolute left-0 inset-y-2 w-[3px] bg-primary rounded-full" />
      )}
      <Icon
        className={`w-4 h-4 flex-shrink-0 transition-colors duration-150
          ${active ? "text-primary" : "text-muted-foreground/70 group-hover:text-muted-foreground"}`}
      />
      <span className="flex-1 truncate">{label}</span>
      {active && <ChevronRight className="w-3 h-3 text-primary/40" />}
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? location === "/" : location.startsWith(href);
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-auto`}
        style={{ background: "hsl(230 20% 4%)", borderRight: "1px solid hsl(230 14% 9%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(184 100% 35%), hsl(200 100% 40%))" }}
          >
            <Gauge className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black tracking-[0.2em] text-foreground uppercase truncate">PerformanceIQ</div>
            <div className="text-[9px] text-muted-foreground/60 tracking-[0.15em] uppercase mt-0.5">Football Analytics</div>
          </div>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Separator */}
        <div className="gradient-sep mx-5 mb-3" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-1 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5">
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/40 select-none">
                  {group.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItem
                    key={item.href}
                    {...item}
                    active={isActive(item.href)}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="flex-shrink-0 px-3 pb-3 space-y-0.5">
          <div className="gradient-sep mx-3 mb-3" />

          {/* Demo Club — highlighted CTA */}
          <Link href="/demo" onClick={() => setMobileOpen(false)}>
            <button
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all mb-1
                ${isActive("/demo")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
              style={isActive("/demo")
                ? { background: "linear-gradient(135deg, hsl(184 100% 42% / 0.12), hsl(200 100% 40% / 0.08))", border: "1px solid hsl(184 100% 42% / 0.25)" }
                : { background: "linear-gradient(135deg, hsl(184 100% 42% / 0.06), hsl(200 100% 40% / 0.04))", border: "1px solid hsl(184 100% 42% / 0.12)" }}
            >
              <Presentation className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Demo Club</span>
              <span className="ml-auto text-[8px] font-black tracking-wider text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded-full">LIVE</span>
            </button>
          </Link>

          {BOTTOM_ITEMS.map(item => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <div>
                <div className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Temporada 2025/26</div>
                <div className="text-[9px] text-muted-foreground/40 mt-0.5">Club Performance Dept.</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0"
          style={{ background: "hsl(230 20% 4%)" }}>
          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            onClick={() => setMobileOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold tracking-widest text-foreground uppercase">PerformanceIQ</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
