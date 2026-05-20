import Layout from "@/components/Layout";
import { Settings as SettingsIcon, Monitor, Bell, Database, Shield, Info } from "lucide-react";

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <SettingsIcon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Configuración</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Preferencias de la plataforma</p>
          </div>
        </div>

        {/* Platform info */}
        <Section icon={Info} title="Información de la plataforma">
          <SettingRow label="Versión" description="PerformanceIQ Football Analytics">
            <span className="text-xs font-mono bg-secondary border border-border rounded px-2 py-1 text-muted-foreground">v1.0.0</span>
          </SettingRow>
          <SettingRow label="Temporada activa" description="Período de datos actual">
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded px-2 py-1">2025/26</span>
          </SettingRow>
          <SettingRow label="Organización" description="Club Performance Dept.">
            <span className="text-xs text-muted-foreground">Club FC</span>
          </SettingRow>
        </Section>

        <Section icon={Monitor} title="Apariencia">
          <SettingRow label="Modo oscuro" description="Siempre activo — optimizado para entornos de rendimiento">
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">Activo</div>
          </SettingRow>
          <SettingRow label="Idioma de la interfaz" description="Español (ES)">
            <span className="text-xs text-muted-foreground">ES</span>
          </SettingRow>
        </Section>

        <Section icon={Bell} title="Notificaciones">
          <SettingRow label="Alertas de rendimiento" description="Alertas automáticas por déficit neuromuscular">
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">Activo</div>
          </SettingRow>
          <SettingRow label="Alertas de asimetría" description="Notificar si asimetría bilateral supera el 15%">
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">Activo</div>
          </SettingRow>
        </Section>

        <Section icon={Database} title="Datos">
          <SettingRow label="Base de datos" description="PostgreSQL — conexión activa">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-xs text-emerald-400 font-medium">Conectada</span>
            </div>
          </SettingRow>
          <SettingRow label="Importación CSV Chronojump" description="Columnas en español e inglés soportadas">
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">Activo</div>
          </SettingRow>
        </Section>

        <Section icon={Shield} title="Seguridad">
          <SettingRow label="Datos confidenciales" description="Los informes PDF se marcan como documentos confidenciales">
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">Activo</div>
          </SettingRow>
        </Section>
      </div>
    </Layout>
  );
}
