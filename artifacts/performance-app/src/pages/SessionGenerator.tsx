import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPlayers,
  useCreateSession,
  useCreateTemplate,
  useListTemplates,
  useDeleteTemplate,
  getListSessionsQueryKey,
  getListTemplatesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import {
  Zap, ChevronDown, User, Calendar, Clock, AlertTriangle,
  Save, BookTemplate, Trash2, RotateCcw,
  Flame, Activity, Timer, Dumbbell, Wind, Moon,
  CheckCircle, X, Info, Link, ChevronRight, Plus,
  Shield, Target, FileDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getByBlock,
  getById,
  VOLUME_RULES,
  type BlockKey,
  type SessionTypeKey,
} from "@/data/sessionCatalog";
import { generateSessionPdf, type PdfExercise } from "@/utils/sessionPdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionKind = SessionTypeKey;

/** Entry para bloques con selector de ejercicio del catálogo */
interface BlockEntry {
  exerciseId: string;
  sets: number;
  reps: number;
  durationSec?: number;
  restText: string;   // libre: "30\"", "1'", "3-5'"
  loadText: string;   // libre: "20 kg", "PC", "goma media"
  notes: string;
  videoUrl: string;
  isEccentric?: boolean;
}

/** Entry para bloques de texto libre (isométricos, activación) */
interface FreeEntry {
  name: string;
  sets: number;
  reps: number;
  restText: string;
  loadText: string;
  notes: string;
  videoUrl: string;
}

/** Entry para ejercicios de Recuperación Activa (movilidad e isométricos) */
interface RecoveryExEntry {
  name: string;        // free text (movilidad) o desde selector (isométricos)
  sets: number;
  reps: number;
  durationText: string; // libre: "20s", "30\"", "2'"
  restText: string;
  loadText: string;
  notes: string;
  videoUrl: string;
}

function emptyBlock(sets = 3, reps = 6): BlockEntry {
  return { exerciseId: "", sets, reps, durationSec: undefined, restText: "", loadText: "", notes: "", videoUrl: "" };
}

function emptyFree(sets = 2, reps = 6): FreeEntry {
  return { name: "", sets, reps, restText: "", loadText: "", notes: "", videoUrl: "" };
}

function emptyRecoveryEx(): RecoveryExEntry {
  return { name: "", sets: 3, reps: 8, durationText: "", restText: "", loadText: "", notes: "", videoUrl: "" };
}

/** Entry independiente para cada ejercicio PNF */
interface PnfEntry {
  enabled: boolean;
  sets: number;
  reps: number;
  contractionTime: string;  // libre: "6s", "10s"
  restBetweenReps: string;  // libre: "20s"
  restBetweenSets: string;  // libre: "2'"
  notes: string;
  videoUrl: string;
}

function emptyPnf(): PnfEntry {
  return { enabled: false, sets: 3, reps: 6, contractionTime: "", restBetweenReps: "", restBetweenSets: "", notes: "", videoUrl: "" };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KINDS: { value: SessionKind; label: string; desc: string; color: string; border: string; icon: React.ReactNode }[] = [
  { value: "explosive-strength", label: "Fuerza Explosiva",    desc: "Potencia máxima · alta intensidad",    color: "text-orange-400", border: "border-orange-500/40 bg-orange-500/10",   icon: <Zap      className="w-3.5 h-3.5" /> },
  { value: "power-strength",     label: "Fuerza Potencia",     desc: "Ratio F-V · transferencia directa",    color: "text-blue-400",   border: "border-blue-500/40 bg-blue-500/10",      icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { value: "endurance-strength", label: "Fuerza Resistencia",  desc: "Volumen compensatorio · capacidad",    color: "text-emerald-400",border: "border-emerald-500/40 bg-emerald-500/10", icon: <Activity className="w-3.5 h-3.5" /> },
  { value: "active-recovery",    label: "Recuperación Activa", desc: "Bicicleta · movilidad · isométricos",  color: "text-purple-400", border: "border-purple-500/40 bg-purple-500/10",  icon: <Moon     className="w-3.5 h-3.5" /> },
];

/** Ejercicios isométricos disponibles en recuperación activa */
const ISO_RECOVERY_EXERCISES = [
  { id: "iso-push-height",    label: "ISO PUSH con altura" },
  { id: "iso-push-no-height", label: "ISO PUSH sin altura" },
];

const SESSION_TYPE_MAP: Record<SessionKind, "strength" | "endurance" | "recovery"> = {
  "explosive-strength": "strength",
  "power-strength":     "strength",
  "endurance-strength": "endurance",
  "active-recovery":    "recovery",
};

const INTENSITY_MAP: Record<SessionKind, "high" | "max" | "medium" | "low"> = {
  "explosive-strength": "max",
  "power-strength":     "high",
  "endurance-strength": "medium",
  "active-recovery":    "low",
};

// ─── Volume validator ─────────────────────────────────────────────────────────

interface FormState {
  kind: SessionKind;
  isoEntry: FreeEntry;
  activationEntry: FreeEntry;
  plyoSets: number;
  plyoReps: number;
  main: BlockEntry;
  acc1: BlockEntry;
  acc2: BlockEntry;
  acc3: BlockEntry;
  deficit: BlockEntry;
  anterior: BlockEntry;
  posterior: BlockEntry;
  adductor: BlockEntry;
  pnfIsquios: PnfEntry;
  pnfAductores: PnfEntry;
  pnfAbductores: PnfEntry;
  coreEntries: BlockEntry[];
}

function validateVolume(f: FormState): string[] {
  const warns: string[] = [];
  const rules = VOLUME_RULES[f.kind];

  for (const r of rules) {
    if (r.block === "isometric"  && r.maxSets  && f.isoEntry.sets          > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "activation" && r.maxReps  && f.activationEntry.reps   > r.maxReps)  warns.push(r.warningLabel);
    if (r.block === "plyoSeries" && r.maxSets  && f.plyoSets               > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "plyoReps"   && r.maxReps  && f.plyoReps               > r.maxReps)  warns.push(r.warningLabel);
    if (r.block === "main"       && r.maxSets  && f.main.sets              > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "accessory1" && r.maxSets  && f.acc1.sets              > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "accessory2" && r.maxSets  && f.acc2.sets              > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "accessory3" && r.maxSets  && f.acc3.sets              > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "deficit"    && r.maxSets  && f.deficit.sets           > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "anterior"   && r.maxSets  && f.anterior.sets          > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "anterior"   && r.maxReps  && f.anterior.reps          > r.maxReps)  warns.push(r.warningLabel);
    if (r.block === "posterior"  && r.maxSets  && f.posterior.sets         > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "posterior"  && r.maxReps  && f.posterior.reps         > r.maxReps)  warns.push(r.warningLabel);
    if (r.block === "adductor"   && r.maxSets  && f.adductor.sets          > r.maxSets)  warns.push(r.warningLabel);
    if (r.block === "adductor"   && r.maxReps  && f.adductor.reps          > r.maxReps)  warns.push(r.warningLabel);
    if (r.block === "core" && r.maxExercises && f.coreEntries.length > r.maxExercises) warns.push(r.warningLabel);
  }
  return [...new Set(warns)];
}

// ─── Build saved exercises ─────────────────────────────────────────────────────

function restTextToSec(text: string): number {
  if (!text) return 90;
  const m = text.match(/(\d+)/);
  if (!m) return 90;
  const n = parseInt(m[1]);
  if (text.includes("'") && n <= 10) return n * 60;
  return n;
}

function blockToEx(
  block: BlockEntry,
  blockKey: string,
  blockLabel: string,
  idx: number,
): Record<string, unknown> | null {
  if (!block.exerciseId) return null;
  const ex = getById(block.exerciseId);
  return {
    id: `${blockKey}-${idx}`,
    name: ex?.name ?? "",
    section: blockKey,
    phase: "load",
    vector: "vertical",
    contractionType: ex?.regime ?? "con-exc",
    sets: block.sets,
    reps: block.reps,
    duration: block.durationSec ?? null,
    rest: restTextToSec(block.restText),
    intensityLevel: "high",
    coachingCues: ex?.coachingCues ?? [],
    physiologicalObjective: blockLabel,
    transfer: "",
    equipment: "barbell",
    videoUrl: block.videoUrl || null,
    notes: block.notes || null,
    loadText: block.loadText || null,
    restText: block.restText || null,
    isEccentric: block.isEccentric ?? false,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({
  icon, title, limit, warn,
}: {
  icon: React.ReactNode; title: string; limit?: string; warn?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${warn ? "border-yellow-500/30" : "border-border/50"}`}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</span>
      {limit && (
        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-medium ${warn ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-secondary text-muted-foreground"}`}>
          {limit}
        </span>
      )}
    </div>
  );
}

function NumInput({
  label, value, onChange, min = 1, max = 30,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-16 bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function TextInput({
  label, value, onChange, placeholder, icon,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-[100px]">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function ExerciseSelect({
  block, sessionType, value, onChange,
}: {
  block: BlockKey; sessionType: SessionTypeKey; value: string; onChange: (id: string) => void;
}) {
  const exercises = useMemo(() => getByBlock(block, sessionType), [block, sessionType]);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
      >
        <option value="">— Seleccionar ejercicio —</option>
        {exercises.map(ex => (
          <option key={ex.id} value={ex.id}>{ex.name} ({ex.regime})</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

/** Bloque con selector de ejercicio de catálogo + todos los campos siempre visibles */
function BlockEditor({
  block, sessionType, label, icon, entry, onChange, limitLabel, warn,
  showEccentric, every15,
}: {
  block: BlockKey;
  sessionType: SessionTypeKey;
  label: string;
  icon: React.ReactNode;
  entry: BlockEntry;
  onChange: (e: BlockEntry) => void;
  limitLabel?: string;
  warn?: boolean;
  showEccentric?: boolean;
  every15?: boolean;
}) {
  const ex = entry.exerciseId ? getById(entry.exerciseId) : null;

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${warn ? "border-yellow-500/20 bg-yellow-500/3" : "border-border bg-secondary/10"}`}>
      <SectionLabel icon={icon} title={label} limit={limitLabel} warn={warn} />

      {/* Selector ejercicio — sin auto-rellenar descanso */}
      <ExerciseSelect
        block={block}
        sessionType={sessionType}
        value={entry.exerciseId}
        onChange={id => {
          const cat = getById(id);
          onChange({
            ...entry,
            exerciseId: id,
            sets: cat?.defaultSets ?? entry.sets,
            reps: cat?.defaultReps ?? entry.reps,
            durationSec: cat?.defaultDurationSec ?? undefined,
            // descanso NO se auto-rellena — el preparador lo decide
          });
        }}
      />

      {/* Fila 1: Series + Repeticiones */}
      <div className="flex items-end gap-3 flex-wrap">
        <NumInput label="Series" value={entry.sets} onChange={v => onChange({ ...entry, sets: v })} min={1} max={12} />
        <NumInput label="Repeticiones" value={entry.reps} onChange={v => onChange({ ...entry, reps: v })} min={1} max={30} />
      </div>

      {/* Fila 2: Carga + Descanso */}
      <div className="flex items-end gap-3 flex-wrap">
        <TextInput
          label="Peso externo / Carga"
          value={entry.loadText}
          onChange={v => onChange({ ...entry, loadText: v })}
          placeholder='20 kg · PC · goma media'
          icon={<Dumbbell className="w-3 h-3" />}
        />
        <TextInput
          label="Descanso"
          value={entry.restText}
          onChange={v => onChange({ ...entry, restText: v })}
          placeholder='30" · 1&apos; · 3-5&apos;'
          icon={<Timer className="w-3 h-3" />}
        />
      </div>

      {/* Fila 3: Observaciones */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Observaciones</label>
        <textarea
          value={entry.notes}
          onChange={e => onChange({ ...entry, notes: e.target.value })}
          rows={2}
          placeholder="Notas técnicas, adaptaciones..."
          className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Fila 4: URL vídeo */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
          <Link className="w-3 h-3" /> URL de vídeo
        </label>
        <input
          type="url"
          value={entry.videoUrl}
          onChange={e => onChange({ ...entry, videoUrl: e.target.value })}
          placeholder="https://youtube.com/..."
          className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {showEccentric && every15 && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!entry.isEccentric}
            onChange={e => onChange({ ...entry, isEccentric: e.target.checked })}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-[10px] text-muted-foreground">Marcar como excéntrico (cada 15 días)</span>
        </label>
      )}

      {ex?.coachingCues && ex.coachingCues.length > 0 && (
        <div className="bg-secondary/30 rounded p-2 space-y-0.5">
          {ex.coachingCues.slice(0, 2).map((c, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-primary/60 flex-shrink-0 mt-0.5" />
              <span className="text-[10px] text-muted-foreground leading-tight">{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bloque de texto libre (isométricos, activación) con todos los campos visibles */
function FreeEntryBlock({
  icon, title, limit, namePlaceholder, entry, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  limit: string;
  namePlaceholder: string;
  entry: FreeEntry;
  onChange: (e: FreeEntry) => void;
}) {
  const over = (title.includes("Isométrico") && entry.sets > 2)
    || (title.includes("Activación") && entry.reps > 4);

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${over ? "border-yellow-500/20 bg-yellow-500/3" : "border-border bg-secondary/10"}`}>
      <SectionLabel icon={icon} title={title} limit={limit} warn={over} />

      {/* Nombre libre */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Ejercicio (libre)</label>
        <input
          type="text"
          value={entry.name}
          onChange={e => onChange({ ...entry, name: e.target.value })}
          placeholder={namePlaceholder}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Series + Repeticiones */}
      <div className="flex items-end gap-3 flex-wrap">
        <NumInput label="Series" value={entry.sets} onChange={v => onChange({ ...entry, sets: v })} min={1} max={8} />
        <NumInput label="Repeticiones" value={entry.reps} onChange={v => onChange({ ...entry, reps: v })} min={1} max={30} />
        {over && (
          <span className="text-[10px] text-yellow-400 flex items-center gap-1 pb-1">
            <AlertTriangle className="w-3 h-3" /> Excede el máximo
          </span>
        )}
      </div>

      {/* Carga + Descanso */}
      <div className="flex items-end gap-3 flex-wrap">
        <TextInput
          label="Peso externo / Carga"
          value={entry.loadText}
          onChange={v => onChange({ ...entry, loadText: v })}
          placeholder='PC · goma · balón'
          icon={<Dumbbell className="w-3 h-3" />}
        />
        <TextInput
          label="Descanso"
          value={entry.restText}
          onChange={v => onChange({ ...entry, restText: v })}
          placeholder='30" · 1&apos; · 2&apos;'
          icon={<Timer className="w-3 h-3" />}
        />
      </div>

      {/* Observaciones */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Observaciones</label>
        <textarea
          value={entry.notes}
          onChange={e => onChange({ ...entry, notes: e.target.value })}
          rows={2}
          placeholder="Notas técnicas..."
          className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* URL vídeo */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
          <Link className="w-3 h-3" /> URL de vídeo
        </label>
        <input
          type="url"
          value={entry.videoUrl}
          onChange={e => onChange({ ...entry, videoUrl: e.target.value })}
          placeholder="https://youtube.com/..."
          className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

/** Core con BlockEntry por ejercicio — todos los campos visibles */
function CoreSequenceEditor({
  entries, onChange,
}: {
  entries: BlockEntry[];
  onChange: (e: BlockEntry[]) => void;
}) {
  const exercises = useMemo(() => getByBlock("core", "endurance-strength"), []);
  const atMax = entries.length >= 4;

  function addSlot() {
    if (!atMax) onChange([...entries, emptyBlock(3, 10)]);
  }
  function updateEntry(i: number, next: BlockEntry) {
    const arr = [...entries];
    arr[i] = next;
    onChange(arr);
  }
  function removeSlot(i: number) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-secondary/10">
      <SectionLabel
        icon={<Target className="w-3.5 h-3.5" />}
        title="Core — Secuencia"
        limit={`${entries.length}/4 ejercicios`}
        warn={atMax}
      />

      {entries.map((entry, i) => {
        const ex = entry.exerciseId ? exercises.find(e => e.id === entry.exerciseId) : null;
        return (
          <div key={i} className="border border-border/60 rounded-lg p-3 space-y-3 bg-background/30">
            {/* Cabecera slot */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-primary">{i + 1}</span>
              </div>
              <div className="relative flex-1">
                <select
                  value={entry.exerciseId}
                  onChange={e => {
                    const cat = exercises.find(ex => ex.id === e.target.value);
                    updateEntry(i, {
                      ...entry,
                      exerciseId: e.target.value,
                      sets: cat?.defaultSets ?? entry.sets,
                      reps: cat?.defaultReps ?? entry.reps,
                      // descanso NO se auto-rellena
                    });
                  }}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
                >
                  <option value="">— Seleccionar —</option>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={() => removeSlot(i)} className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fila: Series + Reps */}
            <div className="flex items-end gap-3 flex-wrap pl-7">
              <NumInput label="Series" value={entry.sets} onChange={v => updateEntry(i, { ...entry, sets: v })} min={1} max={8} />
              <NumInput label="Repeticiones" value={entry.reps} onChange={v => updateEntry(i, { ...entry, reps: v })} min={1} max={30} />
            </div>

            {/* Fila: Carga + Descanso */}
            <div className="flex items-end gap-3 flex-wrap pl-7">
              <TextInput
                label="Peso externo / Carga"
                value={entry.loadText}
                onChange={v => updateEntry(i, { ...entry, loadText: v })}
                placeholder='PC · goma · sin carga'
                icon={<Dumbbell className="w-3 h-3" />}
              />
              <TextInput
                label="Descanso"
                value={entry.restText}
                onChange={v => updateEntry(i, { ...entry, restText: v })}
                placeholder='30" · 1&apos;'
                icon={<Timer className="w-3 h-3" />}
              />
            </div>

            {/* Observaciones */}
            <div className="pl-7">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Observaciones</label>
              <input
                type="text"
                value={entry.notes}
                onChange={e => updateEntry(i, { ...entry, notes: e.target.value })}
                placeholder="Notas técnicas..."
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* URL vídeo */}
            <div className="pl-7">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
                <Link className="w-3 h-3" /> URL de vídeo
              </label>
              <input
                type="url"
                value={entry.videoUrl}
                onChange={e => updateEntry(i, { ...entry, videoUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {ex?.coachingCues && ex.coachingCues.length > 0 && (
              <div className="bg-secondary/30 rounded p-2 space-y-0.5 ml-7">
                {ex.coachingCues.slice(0, 2).map((c, ci) => (
                  <div key={ci} className="flex items-start gap-1.5">
                    <ChevronRight className="w-3 h-3 text-primary/60 flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-muted-foreground leading-tight">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!atMax && (
        <button
          onClick={addSlot}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-primary transition-colors"
        >
          <Plus className="w-3 h-3" /> Añadir ejercicio de core
        </button>
      )}
      {atMax && (
        <p className="text-[10px] text-yellow-400/80 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Máximo 4 ejercicios en la secuencia de core
        </p>
      )}
    </div>
  );
}

/** Tarjeta de ejercicio dentro de los bloques de Recuperación Activa */
function RecoveryExCard({
  idx, entry, nameType, namePlaceholder, onChange, onRemove,
}: {
  idx: number;
  entry: RecoveryExEntry;
  nameType: "free" | "dropdown";
  namePlaceholder: string;
  onChange: (e: RecoveryExEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-purple-500/20 rounded-lg p-3 space-y-3 bg-background/30">
      {/* Cabecera: número + nombre + eliminar */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-purple-400">{idx + 1}</span>
        </div>

        {nameType === "dropdown" ? (
          <div className="relative flex-1">
            <select
              value={entry.name}
              onChange={e => onChange({ ...entry, name: e.target.value })}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50 appearance-none pr-8"
            >
              <option value="">— Seleccionar ejercicio isométrico —</option>
              {ISO_RECOVERY_EXERCISES.map(opt => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        ) : (
          <input
            type="text"
            value={entry.name}
            onChange={e => onChange({ ...entry, name: e.target.value })}
            placeholder={namePlaceholder}
            className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        )}

        <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fila: Series + Reps */}
      <div className="flex items-end gap-3 flex-wrap pl-7">
        <NumInput label="Series"       value={entry.sets} onChange={v => onChange({ ...entry, sets: v })} min={1} max={20} />
        <NumInput label="Repeticiones" value={entry.reps} onChange={v => onChange({ ...entry, reps: v })} min={1} max={30} />
        <TextInput
          label="Tiempo de trabajo"
          value={entry.durationText}
          onChange={v => onChange({ ...entry, durationText: v })}
          placeholder='20s · 30" · 1&apos;'
          icon={<Timer className="w-3 h-3" />}
        />
      </div>

      {/* Fila: Carga + Descanso */}
      <div className="flex items-end gap-3 flex-wrap pl-7">
        <TextInput
          label="Peso externo / Carga"
          value={entry.loadText}
          onChange={v => onChange({ ...entry, loadText: v })}
          placeholder='PC · goma · sin carga'
          icon={<Dumbbell className="w-3 h-3" />}
        />
        <TextInput
          label="Descanso"
          value={entry.restText}
          onChange={v => onChange({ ...entry, restText: v })}
          placeholder='30" · 1&apos; · 3&apos;'
          icon={<Timer className="w-3 h-3" />}
        />
      </div>

      {/* Observaciones */}
      <div className="pl-7">
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Observaciones</label>
        <input
          type="text"
          value={entry.notes}
          onChange={e => onChange({ ...entry, notes: e.target.value })}
          placeholder="Notas técnicas, posición, adaptaciones..."
          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
        />
      </div>

      {/* URL vídeo */}
      <div className="pl-7">
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
          <Link className="w-3 h-3" /> URL de vídeo
        </label>
        <input
          type="url"
          value={entry.videoUrl}
          onChange={e => onChange({ ...entry, videoUrl: e.target.value })}
          placeholder="https://youtube.com/..."
          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
        />
      </div>
    </div>
  );
}

function PnfBlockEditor({
  label, entry, onChange,
}: {
  label: string;
  entry: PnfEntry;
  onChange: (e: PnfEntry) => void;
}) {
  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${entry.enabled ? "border-purple-500/30" : "border-border"}`}>
      <button
        onClick={() => onChange({ ...entry, enabled: !entry.enabled })}
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-secondary/10 hover:bg-secondary/20 transition-colors"
      >
        <Activity className={`w-3.5 h-3.5 flex-shrink-0 ${entry.enabled ? "text-purple-400" : "text-muted-foreground"}`} />
        <span className={`text-sm font-semibold flex-1 ${entry.enabled ? "text-purple-300" : "text-muted-foreground"}`}>{label}</span>
        {entry.enabled
          ? <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
          : <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
        }
      </button>
      {entry.enabled && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-purple-500/5">
          <div className="flex items-end gap-3 flex-wrap">
            <NumInput label="Series"       value={entry.sets} onChange={v => onChange({ ...entry, sets: v })} min={1} max={10} />
            <NumInput label="Repeticiones" value={entry.reps} onChange={v => onChange({ ...entry, reps: v })} min={1} max={20} />
            <TextInput
              label='Tiempo contracción'
              value={entry.contractionTime}
              onChange={v => onChange({ ...entry, contractionTime: v })}
              placeholder='6s · 10s · 30"'
              icon={<Timer className="w-3 h-3" />}
            />
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <TextInput
              label='Descanso entre reps'
              value={entry.restBetweenReps}
              onChange={v => onChange({ ...entry, restBetweenReps: v })}
              placeholder='20s · 30s'
              icon={<Timer className="w-3 h-3" />}
            />
            <TextInput
              label='Descanso entre series'
              value={entry.restBetweenSets}
              onChange={v => onChange({ ...entry, restBetweenSets: v })}
              placeholder="1' · 2'"
              icon={<Timer className="w-3 h-3" />}
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Observaciones</label>
            <input
              type="text"
              value={entry.notes}
              onChange={e => onChange({ ...entry, notes: e.target.value })}
              placeholder="Notas técnicas, posición, ángulo..."
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
              <Link className="w-3 h-3" /> URL de vídeo
            </label>
            <input
              type="url"
              value={entry.videoUrl}
              onChange={e => onChange({ ...entry, videoUrl: e.target.value })}
              placeholder="https://youtube.com/..."
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  t, onDelete,
}: {
  t: { id: number; name: string; mdType?: string | null; sessionType: string; duration: number; createdAt: string };
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-secondary/40 rounded px-3 py-2.5 border border-border group">
      <BookTemplate className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
        <div className="text-xs text-muted-foreground">{t.mdType ?? t.sessionType} · {t.duration}min</div>
      </div>
      <button
        onClick={() => onDelete(t.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionGenerator() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Core form state
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [kind, setKind] = useState<SessionKind>("explosive-strength");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sessionObjective, setSessionObjective] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  // ── Isométricos + Activación (texto libre, todos los campos)
  const [isoEntry,        setIsoEntry]        = useState<FreeEntry>(emptyFree(2, 6));
  const [activationEntry, setActivationEntry] = useState<FreeEntry>(emptyFree(2, 4));

  // ── Pliometría / Técnica carrera (explosive + power)
  const [plyoId,      setPlyoId]      = useState("");
  const [plyoSets,    setPlyoSets]    = useState(2);
  const [plyoReps,    setPlyoReps]    = useState(5);
  const [plyoRestText, setPlyoRestText] = useState("");
  const [plyoLoadText, setPlyoLoadText] = useState("");
  const [plyoNotes,   setPlyoNotes]   = useState("");
  const [plyoVideoUrl, setPlyoVideoUrl] = useState("");

  // ── Explosive + Power blocks
  const [main,    setMain]    = useState<BlockEntry>(emptyBlock(4, 5));
  const [acc1,    setAcc1]    = useState<BlockEntry>(emptyBlock(3, 8));
  const [acc2,    setAcc2]    = useState<BlockEntry>(emptyBlock(3, 8));
  const [acc3,    setAcc3]    = useState<BlockEntry>(emptyBlock(3, 8));
  const [deficit, setDeficit] = useState<BlockEntry>(emptyBlock(3, 12));

  // ── Endurance blocks
  const [anterior,     setAnterior]     = useState<BlockEntry>(emptyBlock(3, 8));
  const [posterior,    setPosterior]    = useState<BlockEntry>(emptyBlock(3, 8));
  const [adductor,     setAdductor]     = useState<BlockEntry>(emptyBlock(3, 12));
  const [pnfIsquios,    setPnfIsquios]    = useState<PnfEntry>(emptyPnf());
  const [pnfAductores,  setPnfAductores]  = useState<PnfEntry>(emptyPnf());
  const [pnfAbductores, setPnfAbductores] = useState<PnfEntry>(emptyPnf());
  const [coreEntries,  setCoreEntries]  = useState<BlockEntry[]>([]);
  const [eccentricMark, setEccentricMark] = useState(false);

  // ── Recovery (multi-bloque)
  const [recoveryRest,        setRecoveryRest]        = useState(false);
  const [recoveryBike,        setRecoveryBike]        = useState(false);
  const [mobilityEntries,     setMobilityEntries]     = useState<RecoveryExEntry[]>([]);
  const [isoRecoveryEntries,  setIsoRecoveryEntries]  = useState<RecoveryExEntry[]>([]);

  // ── UI
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // ── Data
  const { data: players = [] } = useListPlayers({});
  const { data: templates = [] } = useListTemplates();

  const selectedPlayerData = players.find(p => p.id === selectedPlayer);

  // ── Validation
  const formState: FormState = {
    kind, isoEntry, activationEntry, plyoSets, plyoReps,
    main, acc1, acc2, acc3, deficit,
    anterior, posterior, adductor, pnfIsquios, pnfAductores, pnfAbductores, coreEntries,
  };
  const warnings = useMemo(
    () => kind !== "active-recovery" ? validateVolume(formState) : [],
    [kind, isoEntry, activationEntry, plyoSets, plyoReps, main, acc1, acc2, acc3, deficit, anterior, posterior, adductor, pnfIsquios, pnfAductores, pnfAbductores, coreEntries],
  );

  // ── Build exercises for save
  function buildExercises(): unknown[] {
    const exs: (Record<string, unknown> | null)[] = [];

    if (kind !== "active-recovery") {
      if (isoEntry.name) exs.push({
        id: "iso-0", name: isoEntry.name, section: "isometric", phase: "load",
        contractionType: "iso", sets: isoEntry.sets, reps: isoEntry.reps, duration: null,
        rest: restTextToSec(isoEntry.restText), intensityLevel: "low", coachingCues: [],
        physiologicalObjective: "Isométricos", transfer: "", equipment: "none",
        loadText: isoEntry.loadText || null, restText: isoEntry.restText || null,
        notes: isoEntry.notes || null, videoUrl: isoEntry.videoUrl || null,
      });
      if (activationEntry.name) exs.push({
        id: "act-0", name: activationEntry.name, section: "activation", phase: "load",
        contractionType: "con", sets: activationEntry.sets, reps: activationEntry.reps, duration: null,
        rest: restTextToSec(activationEntry.restText), intensityLevel: "low", coachingCues: [],
        physiologicalObjective: "Activación", transfer: "", equipment: "none",
        loadText: activationEntry.loadText || null, restText: activationEntry.restText || null,
        notes: activationEntry.notes || null, videoUrl: activationEntry.videoUrl || null,
      });
    }

    if (kind === "explosive-strength" || kind === "power-strength") {
      if (plyoId) {
        const ex = getById(plyoId);
        exs.push({
          id: "plyo-0", name: ex?.name ?? "", section: "plyometrics", phase: "explode",
          contractionType: "con-exc", sets: plyoSets, reps: plyoReps, duration: null,
          rest: restTextToSec(plyoRestText), intensityLevel: "high",
          coachingCues: ex?.coachingCues ?? [],
          physiologicalObjective: "Pliometría / Técnica carrera", transfer: "", equipment: "none",
          videoUrl: plyoVideoUrl || null, notes: plyoNotes || null,
          loadText: plyoLoadText || null, restText: plyoRestText || null,
        });
      }
      exs.push(blockToEx(main,    "main",       "Ejercicio principal",    0));
      exs.push(blockToEx(acc1,    "accessory1", "Accesorio 1",            0));
      if (kind === "explosive-strength") {
        exs.push(blockToEx(acc2,  "accessory2", "Accesorio 2",            0));
        exs.push(blockToEx(acc3,  "accessory3", "Accesorio 3",            0));
      }
      exs.push(blockToEx(deficit, "deficit",    "Déficits particulares",  0));
    }

    if (kind === "endurance-strength") {
      exs.push(blockToEx(anterior,  "anterior",  "Cadena anterior",  0));
      exs.push(blockToEx(posterior, "posterior", "Cadena posterior", 0));
      exs.push(blockToEx(adductor,  "adductor",  "Aductor",          0));
      [
        { entry: pnfIsquios,    id: "pnf-isquios",    name: "PNF Isquiotibiales" },
        { entry: pnfAductores,  id: "pnf-aductores",  name: "PNF Aductores"      },
        { entry: pnfAbductores, id: "pnf-abductores", name: "PNF Abductores"     },
      ].forEach(({ entry, id, name }) => {
        if (!entry.enabled) return;
        const noteParts = [
          entry.contractionTime ? `Tiempo contracción: ${entry.contractionTime}` : "",
          entry.restBetweenReps ? `Descanso entre reps: ${entry.restBetweenReps}` : "",
          entry.notes,
        ].filter(Boolean);
        exs.push({ id, name, section: "pnf", phase: "drive", contractionType: "iso", sets: entry.sets, reps: entry.reps, duration: null, rest: restTextToSec(entry.restBetweenSets), intensityLevel: "medium", coachingCues: [], physiologicalObjective: "PNF", transfer: "", equipment: "none", loadText: null, restText: entry.restBetweenSets || null, notes: noteParts.join(" · ") || null, videoUrl: entry.videoUrl || null });
      });
      coreEntries.forEach((entry, i) => {
        if (!entry.exerciseId) return;
        const ex = getById(entry.exerciseId);
        if (!ex) return;
        exs.push({
          id: `core-${i}`, name: ex.name, section: "core", phase: "drive",
          contractionType: ex.regime,
          sets: entry.sets, reps: entry.reps, duration: entry.durationSec ?? null,
          rest: restTextToSec(entry.restText), intensityLevel: "low",
          coachingCues: ex.coachingCues ?? [],
          physiologicalObjective: "Core", transfer: "", equipment: "none",
          loadText: entry.loadText || null, restText: entry.restText || null,
          notes: entry.notes || null, videoUrl: entry.videoUrl || null,
        });
      });
    }

    if (kind === "active-recovery") {
      if (recoveryRest) exs.push({ id: "rec-rest", name: "Descanso total / no entrenar", section: "recovery", phase: "balanced", contractionType: "iso", sets: 1, reps: null, duration: null, rest: 0, intensityLevel: "low", coachingCues: [], physiologicalObjective: "Descanso", transfer: "", equipment: "none" });
      if (recoveryBike) exs.push({ id: "rec-bike", name: "Bicicleta", section: "recovery", phase: "balanced", contractionType: "con", sets: 1, reps: null, duration: null, rest: 0, intensityLevel: "low", coachingCues: [], physiologicalObjective: "Bicicleta", transfer: "", equipment: "bike" });
      mobilityEntries.forEach((e, i) => {
        if (!e.name) return;
        exs.push({ id: `rec-mob-${i}`, name: e.name, section: "recovery-mobility", phase: "balanced", contractionType: "con-exc", sets: e.sets, reps: e.reps, duration: null, durationText: e.durationText || null, rest: restTextToSec(e.restText), restText: e.restText || null, loadText: e.loadText || null, notes: e.notes || null, videoUrl: e.videoUrl || null, intensityLevel: "low", coachingCues: [], physiologicalObjective: "Movilidad", transfer: "", equipment: "none" });
      });
      isoRecoveryEntries.forEach((e, i) => {
        if (!e.name) return;
        exs.push({ id: `rec-iso-${i}`, name: e.name, section: "recovery-isometric", phase: "balanced", contractionType: "iso", sets: e.sets, reps: e.reps, duration: null, durationText: e.durationText || null, rest: restTextToSec(e.restText), restText: e.restText || null, loadText: e.loadText || null, notes: e.notes || null, videoUrl: e.videoUrl || null, intensityLevel: "low", coachingCues: [], physiologicalObjective: "Isométricos", transfer: "", equipment: "none" });
      });
    }

    return exs.filter(Boolean);
  }

  // ── Build PDF exercises
  function buildPdfExercises(): PdfExercise[] {
    const result: PdfExercise[] = [];

    if (kind !== "active-recovery") {
      if (isoEntry.name) result.push({ blockLabel: "Isométricos", name: isoEntry.name, sets: isoEntry.sets, reps: isoEntry.reps, restText: isoEntry.restText, loadText: isoEntry.loadText, notes: isoEntry.notes, videoUrl: isoEntry.videoUrl });
      if (activationEntry.name) result.push({ blockLabel: "Activación", name: activationEntry.name, sets: activationEntry.sets, reps: activationEntry.reps, restText: activationEntry.restText, loadText: activationEntry.loadText, notes: activationEntry.notes, videoUrl: activationEntry.videoUrl });
    }

    if (kind === "explosive-strength" || kind === "power-strength") {
      if (plyoId) {
        const ex = getById(plyoId);
        result.push({ blockLabel: "Pliometría / Técnica carrera", name: ex?.name ?? plyoId, sets: plyoSets, reps: plyoReps, restText: plyoRestText, loadText: plyoLoadText, notes: plyoNotes, videoUrl: plyoVideoUrl });
      }
      const addBlock = (b: BlockEntry, lbl: string) => {
        if (!b.exerciseId) return;
        const ex = getById(b.exerciseId);
        result.push({ blockLabel: lbl, name: ex?.name ?? b.exerciseId, sets: b.sets, reps: b.reps, durationSec: b.durationSec, restText: b.restText, loadText: b.loadText, notes: b.notes, videoUrl: b.videoUrl, regime: ex?.regime });
      };
      addBlock(main,   "Ejercicio Principal");
      addBlock(acc1,   "Accesorio 1");
      if (kind === "explosive-strength") { addBlock(acc2, "Accesorio 2"); addBlock(acc3, "Accesorio 3"); }
      addBlock(deficit, "Déficits Particulares");
    }

    if (kind === "endurance-strength") {
      const addBlock = (b: BlockEntry, lbl: string) => {
        if (!b.exerciseId) return;
        const ex = getById(b.exerciseId);
        result.push({ blockLabel: lbl, name: ex?.name ?? b.exerciseId, sets: b.sets, reps: b.reps, durationSec: b.durationSec, restText: b.restText, loadText: b.loadText, notes: b.notes, videoUrl: b.videoUrl, regime: ex?.regime });
      };
      addBlock(anterior,  "Cadena Anterior");
      addBlock(posterior, "Cadena Posterior");
      addBlock(adductor,  "Aductor");
      [
        { p: pnfIsquios,    label: "PNF Isquiotibiales" },
        { p: pnfAductores,  label: "PNF Aductores"      },
        { p: pnfAbductores, label: "PNF Abductores"     },
      ].forEach(({ p, label }) => {
        if (!p.enabled) return;
        const details = [p.contractionTime ? `Contracción: ${p.contractionTime}` : "", p.restBetweenReps ? `D.reps: ${p.restBetweenReps}` : ""].filter(Boolean).join(" · ");
        result.push({ blockLabel: "PNF", name: label, sets: p.sets, reps: p.reps, restText: p.restBetweenSets || "—", loadText: "—", notes: details ? `${details}${p.notes ? " · " + p.notes : ""}` : p.notes, videoUrl: p.videoUrl });
      });
      coreEntries.forEach(entry => {
        if (!entry.exerciseId) return;
        const ex = getById(entry.exerciseId);
        if (!ex) return;
        result.push({ blockLabel: "Core", name: ex.name, sets: entry.sets, reps: entry.reps, durationSec: entry.durationSec, restText: entry.restText, loadText: entry.loadText, notes: entry.notes, videoUrl: entry.videoUrl, regime: ex.regime });
      });
    }

    if (kind === "active-recovery") {
      if (recoveryRest) result.push({ blockLabel: "Descanso", name: "Descanso total / no entrenar", sets: 1, restText: "—", loadText: "—", notes: "", videoUrl: "" });
      if (recoveryBike) result.push({ blockLabel: "Bicicleta", name: "Bicicleta", sets: 1, restText: "—", loadText: "—", notes: "", videoUrl: "" });
      mobilityEntries.forEach(e => {
        if (!e.name) return;
        result.push({ blockLabel: "Movilidad", name: e.name, sets: e.sets, reps: e.reps, durationText: e.durationText, restText: e.restText, loadText: e.loadText, notes: e.notes, videoUrl: e.videoUrl });
      });
      isoRecoveryEntries.forEach(e => {
        if (!e.name) return;
        result.push({ blockLabel: "Isométricos", name: e.name, sets: e.sets, reps: e.reps, durationText: e.durationText, restText: e.restText, loadText: e.loadText, notes: e.notes, videoUrl: e.videoUrl });
      });
    }

    return result;
  }

  function handleGeneratePdf() {
    const kindLabel = SESSION_KINDS.find(k => k.value === kind)?.label ?? kind;
    const playerName = selectedPlayerData?.name ?? "Equipo";
    const pdfExs = buildPdfExercises();
    if (pdfExs.length === 0) {
      toast({ title: "Sin contenido", description: "Añade al menos un ejercicio antes de generar el PDF", variant: "destructive" });
      return;
    }
    generateSessionPdf({
      sessionTitle: `${kindLabel} · ${playerName}`,
      sessionType: kindLabel,
      playerName,
      date: sessionDate,
      objective: sessionObjective,
      notes: sessionNotes,
      exercises: pdfExs,
    });
    toast({ title: "PDF generado", description: "El archivo se ha descargado automáticamente" });
  }

  // ── Mutations
  const saveMutation = useCreateSession({
    mutation: {
      onSuccess: (saved) => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Sesión guardada", description: "La sesión ha sido guardada correctamente" });
        navigate(`/sessions/${saved.id}`);
      },
      onError: () => toast({ title: "Error", description: "No se pudo guardar la sesión", variant: "destructive" }),
    },
  });

  const templateMutation = useCreateTemplate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        toast({ title: "Plantilla guardada", description: `Plantilla "${templateName}" creada` });
        setShowTemplateSave(false);
        setTemplateName("");
      },
    },
  });

  const deleteMutation = useDeleteTemplate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        toast({ title: "Plantilla eliminada" });
      },
    },
  });

  function handleSave() {
    if (!selectedPlayer) { toast({ title: "Selecciona un jugador", variant: "destructive" }); return; }
    const exs = buildExercises();
    const kindLabel = SESSION_KINDS.find(k => k.value === kind)?.label ?? kind;
    saveMutation.mutate({
      data: {
        title: `${kindLabel} · ${selectedPlayerData?.name ?? "Equipo"}`,
        sessionType: SESSION_TYPE_MAP[kind] as "strength" | "endurance" | "recovery" | "speed" | "technical" | "match",
        mdType: kind,
        date: sessionDate,
        duration: kind === "active-recovery" ? 30 : kind === "endurance-strength" ? 70 : 75,
        intensity: INTENSITY_MAP[kind] as "low" | "medium" | "high" | "max",
        generatedFor: selectedPlayer,
        playerIds: [selectedPlayer],
        exercises: exs as never,
        rationale: sessionObjective || `Sesión de ${kindLabel}`,
        notes: sessionNotes || undefined,
      },
    });
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    const exs = buildExercises();
    templateMutation.mutate({
      data: {
        name: templateName.trim(),
        mdType: kind,
        sessionType: SESSION_TYPE_MAP[kind] as "strength" | "endurance" | "recovery" | "speed" | "technical" | "match",
        duration: 75,
        intensity: INTENSITY_MAP[kind] as "low" | "medium" | "high" | "max",
        exercises: exs as never,
      },
    });
  }

  const hasContent = kind === "active-recovery"
    ? (recoveryRest || recoveryBike || mobilityEntries.some(e => e.name) || isoRecoveryEntries.some(e => e.name))
    : !!(isoEntry.name || activationEntry.name || plyoId || main.exerciseId || anterior.exerciseId || coreEntries.some(e => e.exerciseId));

  // ── Render
  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Editor de Sesiones</h1>
            <p className="text-sm text-muted-foreground">Prescripción manual basada en metodología PerformanceIQ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Left Panel ─────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Player */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" /> Jugador
              </h2>
              <div className="relative">
                <select
                  value={selectedPlayer ?? ""}
                  onChange={e => setSelectedPlayer(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
                >
                  <option value="">Seleccionar jugador...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name} — {p.position}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
              {selectedPlayerData && (
                <div className="flex items-center gap-2 bg-secondary/40 rounded px-3 py-2 border border-border">
                  <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {selectedPlayerData.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{selectedPlayerData.name}</div>
                    <div className="text-[10px] text-muted-foreground">{selectedPlayerData.position} · {selectedPlayerData.riskLevel}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${selectedPlayerData.injuryStatus === "fit" ? "bg-emerald-400" : selectedPlayerData.injuryStatus === "recovery" ? "bg-yellow-400" : "bg-red-400"}`} />
                </div>
              )}
            </div>

            {/* Session type */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Tipo de sesión
              </h2>
              <div className="space-y-2">
                {SESSION_KINDS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setKind(opt.value)}
                    className={`w-full border rounded-lg px-3 py-2.5 text-left transition-all flex items-center gap-3 ${kind === opt.value ? opt.border + " " + opt.color : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"}`}
                  >
                    <span className="flex-shrink-0">{opt.icon}</span>
                    <div>
                      <div className="text-xs font-bold tracking-wider">{opt.label}</div>
                      <div className="text-[10px] opacity-80">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Details */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" /> Detalles
              </h2>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Fecha</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Objetivo de sesión</label>
                <input
                  type="text"
                  value={sessionObjective}
                  onChange={e => setSessionObjective(e.target.value)}
                  placeholder="Ej: Mejorar RFD excéntrico..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Notas (opcional)</label>
                <textarea
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  rows={2}
                  placeholder="Condiciones, observaciones..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Templates */}
            {(templates as unknown[]).length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <BookTemplate className="w-3.5 h-3.5 text-primary" /> Plantillas guardadas
                </h2>
                <div className="space-y-2">
                  {(templates as unknown as { id: number; name: string; mdType?: string | null; sessionType: string; duration: number; createdAt: string }[]).map(t => (
                    <TemplateCard key={t.id} t={t} onDelete={id => deleteMutation.mutate({ id })} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel: Block Builder ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── RECUPERACIÓN ACTIVA ── */}
            {kind === "active-recovery" && (
              <div className="bg-card border border-border rounded-lg p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Recuperación Activa</h2>
                </div>

                {/* ── Descanso total ── */}
                <div className={`border rounded-lg p-4 transition-all ${recoveryRest ? "border-purple-500/40 bg-purple-500/5" : "border-border bg-secondary/10"}`}>
                  <button
                    onClick={() => setRecoveryRest(v => !v)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <Moon className={`w-4 h-4 flex-shrink-0 ${recoveryRest ? "text-purple-400" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold flex-1 ${recoveryRest ? "text-purple-300" : "text-muted-foreground"}`}>
                      Descanso total / no entrenar
                    </span>
                    {recoveryRest
                      ? <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                    }
                  </button>
                </div>

                {/* ── Bicicleta ── */}
                <div className={`border rounded-lg p-4 transition-all ${recoveryBike ? "border-purple-500/40 bg-purple-500/5" : "border-border bg-secondary/10"}`}>
                  <button
                    onClick={() => setRecoveryBike(v => !v)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <Wind className={`w-4 h-4 flex-shrink-0 ${recoveryBike ? "text-purple-400" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold flex-1 ${recoveryBike ? "text-purple-300" : "text-muted-foreground"}`}>
                      Bicicleta
                    </span>
                    {recoveryBike
                      ? <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                    }
                  </button>
                </div>

                {/* ── Movilidad ── */}
                <div className={`border rounded-lg overflow-hidden transition-all ${mobilityEntries.length > 0 ? "border-purple-500/30" : "border-border"}`}>
                  {/* Header toggle */}
                  <button
                    onClick={() => { if (mobilityEntries.length === 0) setMobilityEntries([emptyRecoveryEx()]); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <Target className={`w-4 h-4 flex-shrink-0 ${mobilityEntries.length > 0 ? "text-purple-400" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold flex-1 ${mobilityEntries.length > 0 ? "text-purple-300" : "text-muted-foreground"}`}>
                      Movilidad
                    </span>
                    <span className="text-[10px] text-muted-foreground">{mobilityEntries.length} ejercicio{mobilityEntries.length !== 1 ? "s" : ""}</span>
                  </button>

                  {/* Exercise list */}
                  {mobilityEntries.length > 0 && (
                    <div className="px-4 pb-4 pt-2 space-y-4 bg-purple-500/3">
                      {mobilityEntries.map((entry, i) => (
                        <RecoveryExCard
                          key={i}
                          idx={i}
                          entry={entry}
                          nameType="free"
                          namePlaceholder="Ej: Hip flexor stretch, círculos de cadera..."
                          onChange={next => {
                            const arr = [...mobilityEntries];
                            arr[i] = next;
                            setMobilityEntries(arr);
                          }}
                          onRemove={() => setMobilityEntries(mobilityEntries.filter((_, j) => j !== i))}
                        />
                      ))}
                      <button
                        onClick={() => setMobilityEntries([...mobilityEntries, emptyRecoveryEx()])}
                        className="flex items-center gap-1.5 text-xs text-purple-400/70 hover:text-purple-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir ejercicio de movilidad
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Isométricos ── */}
                <div className={`border rounded-lg overflow-hidden transition-all ${isoRecoveryEntries.length > 0 ? "border-purple-500/30" : "border-border"}`}>
                  {/* Header toggle */}
                  <button
                    onClick={() => { if (isoRecoveryEntries.length === 0) setIsoRecoveryEntries([emptyRecoveryEx()]); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <Shield className={`w-4 h-4 flex-shrink-0 ${isoRecoveryEntries.length > 0 ? "text-purple-400" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold flex-1 ${isoRecoveryEntries.length > 0 ? "text-purple-300" : "text-muted-foreground"}`}>
                      Isométricos
                    </span>
                    <span className="text-[10px] text-muted-foreground">{isoRecoveryEntries.length} ejercicio{isoRecoveryEntries.length !== 1 ? "s" : ""}</span>
                  </button>

                  {/* Exercise list */}
                  {isoRecoveryEntries.length > 0 && (
                    <div className="px-4 pb-4 pt-2 space-y-4 bg-purple-500/3">
                      {isoRecoveryEntries.map((entry, i) => (
                        <RecoveryExCard
                          key={i}
                          idx={i}
                          entry={entry}
                          nameType="dropdown"
                          namePlaceholder=""
                          onChange={next => {
                            const arr = [...isoRecoveryEntries];
                            arr[i] = next;
                            setIsoRecoveryEntries(arr);
                          }}
                          onRemove={() => setIsoRecoveryEntries(isoRecoveryEntries.filter((_, j) => j !== i))}
                        />
                      ))}
                      <button
                        onClick={() => setIsoRecoveryEntries([...isoRecoveryEntries, emptyRecoveryEx()])}
                        className="flex items-center gap-1.5 text-xs text-purple-400/70 hover:text-purple-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir ejercicio isométrico
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FUERZA EXPLOSIVA / POTENCIA ── */}
            {(kind === "explosive-strength" || kind === "power-strength") && (
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  {kind === "explosive-strength"
                    ? <Zap className="w-4 h-4 text-orange-400" />
                    : <Dumbbell className="w-4 h-4 text-blue-400" />
                  }
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {kind === "explosive-strength" ? "Fuerza Explosiva" : "Fuerza Potencia"}
                  </h2>
                </div>

                {/* Isométricos */}
                <FreeEntryBlock
                  icon={<Shield className="w-3.5 h-3.5" />}
                  title="Isométricos"
                  limit="máx 2 series"
                  namePlaceholder="Describe el ejercicio isométrico..."
                  entry={isoEntry}
                  onChange={setIsoEntry}
                />

                {/* Activación */}
                <FreeEntryBlock
                  icon={<Flame className="w-3.5 h-3.5" />}
                  title="Activación"
                  limit="máx 4 reps"
                  namePlaceholder="Describe el ejercicio de activación..."
                  entry={activationEntry}
                  onChange={setActivationEntry}
                />

                {/* Pliometría / Técnica carrera */}
                <div className={`border rounded-lg p-4 space-y-3 ${(plyoSets > 2 || plyoReps > 5) ? "border-yellow-500/20 bg-yellow-500/3" : "border-border bg-secondary/10"}`}>
                  <SectionLabel
                    icon={<Zap className="w-3.5 h-3.5" />}
                    title="Pliometría / Técnica carrera"
                    limit="máx 2 series · 5 reps"
                    warn={plyoSets > 2 || plyoReps > 5}
                  />
                  <ExerciseSelect
                    block="plyometrics"
                    sessionType={kind}
                    value={plyoId}
                    onChange={id => {
                      const ex = getById(id);
                      setPlyoId(id);
                      if (ex) { setPlyoReps(ex.defaultReps ?? plyoReps); }
                      // descanso NO se auto-rellena
                    }}
                  />
                  {/* Campos siempre visibles */}
                  <div className="flex items-end gap-3 flex-wrap">
                    <NumInput label="Series"       value={plyoSets} onChange={setPlyoSets} min={1} max={4} />
                    <NumInput label="Repeticiones" value={plyoReps} onChange={setPlyoReps} min={1} max={10} />
                  </div>
                  <div className="flex items-end gap-3 flex-wrap">
                    <TextInput label="Peso externo / Carga" value={plyoLoadText} onChange={setPlyoLoadText} placeholder="PC · altura 40 cm" icon={<Dumbbell className="w-3 h-3" />} />
                    <TextInput label="Descanso"             value={plyoRestText} onChange={setPlyoRestText} placeholder="2' · 3'"            icon={<Timer    className="w-3 h-3" />} />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Observaciones</label>
                    <textarea value={plyoNotes} onChange={e => setPlyoNotes(e.target.value)} rows={2} placeholder="Notas técnicas..." className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1"><Link className="w-3 h-3" /> URL vídeo</label>
                    <input type="url" value={plyoVideoUrl} onChange={e => setPlyoVideoUrl(e.target.value)} placeholder="https://..." className="w-full bg-background border border-border rounded px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>

                {/* Ejercicio Principal */}
                <BlockEditor
                  block="main" sessionType={kind}
                  label="Ejercicio Principal"
                  icon={<Dumbbell className="w-3.5 h-3.5" />}
                  entry={main} onChange={setMain}
                  limitLabel={kind === "explosive-strength" ? "máx 4 series" : "máx 6 series"}
                  warn={kind === "explosive-strength" ? main.sets > 4 : main.sets > 6}
                />

                {/* Accesorio 1 */}
                <BlockEditor
                  block="accessory1" sessionType={kind}
                  label="Accesorio 1"
                  icon={<Activity className="w-3.5 h-3.5" />}
                  entry={acc1} onChange={setAcc1}
                  limitLabel="máx 3 series"
                  warn={acc1.sets > 3}
                />

                {/* Accesorios 2 y 3 solo en explosiva */}
                {kind === "explosive-strength" && (
                  <>
                    <BlockEditor
                      block="accessory2" sessionType={kind}
                      label="Accesorio 2"
                      icon={<Activity className="w-3.5 h-3.5" />}
                      entry={acc2} onChange={setAcc2}
                      limitLabel="máx 3 series"
                      warn={acc2.sets > 3}
                    />
                    <BlockEditor
                      block="accessory3" sessionType={kind}
                      label="Accesorio 3"
                      icon={<Activity className="w-3.5 h-3.5" />}
                      entry={acc3} onChange={setAcc3}
                      limitLabel="máx 3 series"
                      warn={acc3.sets > 3}
                    />
                  </>
                )}

                {kind === "power-strength" && (
                  <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded p-2.5">
                    <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-400/80">Fuerza Potencia: solo 1 accesorio permitido. Accesorios 2 y 3 no disponibles.</p>
                  </div>
                )}

                {/* Déficits */}
                <BlockEditor
                  block="deficit" sessionType={kind}
                  label="Déficits Particulares"
                  icon={<Target className="w-3.5 h-3.5" />}
                  entry={deficit} onChange={setDeficit}
                  limitLabel="máx 3 series"
                  warn={deficit.sets > 3}
                />
              </div>
            )}

            {/* ── FUERZA RESISTENCIA / COMPENSATORIA ── */}
            {kind === "endurance-strength" && (
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Fuerza Resistencia / Compensatoria</h2>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400/90">Los ejercicios deben variar durante 4 semanas seguidas para respetar la periodización metodológica.</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="eccentric"
                    checked={eccentricMark}
                    onChange={e => setEccentricMark(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="eccentric" className="text-xs text-muted-foreground cursor-pointer">
                    Marcar sesión como <span className="text-orange-400 font-semibold">carácter excéntrico</span> (aplicar cada 15 días)
                  </label>
                </div>

                {/* Isométricos */}
                <FreeEntryBlock
                  icon={<Shield className="w-3.5 h-3.5" />}
                  title="Isométricos"
                  limit="máx 2 series"
                  namePlaceholder="Describe el ejercicio isométrico..."
                  entry={isoEntry}
                  onChange={setIsoEntry}
                />

                {/* Activación */}
                <FreeEntryBlock
                  icon={<Flame className="w-3.5 h-3.5" />}
                  title="Activación"
                  limit="máx 4 reps"
                  namePlaceholder="Describe el ejercicio de activación..."
                  entry={activationEntry}
                  onChange={setActivationEntry}
                />

                {/* Cadena anterior */}
                <BlockEditor
                  block="anterior" sessionType={kind}
                  label="Cadena Anterior"
                  icon={<Zap className="w-3.5 h-3.5" />}
                  entry={anterior} onChange={setAnterior}
                  limitLabel="máx 3 series · 8 reps"
                  warn={anterior.sets > 3 || anterior.reps > 8}
                />

                {/* Cadena posterior */}
                <BlockEditor
                  block="posterior" sessionType={kind}
                  label="Cadena Posterior"
                  icon={<Shield className="w-3.5 h-3.5" />}
                  entry={posterior} onChange={setPosterior}
                  limitLabel="máx 3 series · 8 reps"
                  warn={posterior.sets > 3 || posterior.reps > 8}
                  showEccentric
                  every15={eccentricMark}
                />

                {/* Aductor */}
                <BlockEditor
                  block="adductor" sessionType={kind}
                  label="Aductor"
                  icon={<Wind className="w-3.5 h-3.5" />}
                  entry={adductor} onChange={setAdductor}
                  limitLabel="máx 3 series · 8 reps"
                  warn={adductor.sets > 3 || adductor.reps > 8}
                />

                {/* PNF — 3 ejercicios independientes */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">PNF</h2>
                    <span className="text-[10px] text-muted-foreground ml-1">· antes de la parte principal</span>
                  </div>
                  <PnfBlockEditor label="PNF Isquiotibiales" entry={pnfIsquios}    onChange={setPnfIsquios}    />
                  <PnfBlockEditor label="PNF Aductores"       entry={pnfAductores}  onChange={setPnfAductores}  />
                  <PnfBlockEditor label="PNF Abductores"      entry={pnfAbductores} onChange={setPnfAbductores} />
                </div>

                {/* Core */}
                <CoreSequenceEditor entries={coreEntries} onChange={setCoreEntries} />
              </div>
            )}

            {/* ── Validation warnings ── */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-yellow-400/90">{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Actions ── */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={!selectedPlayer || !hasContent || saveMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-semibold text-sm px-4 py-2.5 rounded-lg transition-all"
                >
                  {saveMutation.isPending
                    ? <><RotateCcw className="w-4 h-4 animate-spin" /> Guardando...</>
                    : <><Save className="w-4 h-4" /> Guardar sesión</>
                  }
                </button>
                <button
                  onClick={() => setShowTemplateSave(true)}
                  disabled={!hasContent}
                  className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed text-foreground text-sm px-4 py-2.5 rounded-lg transition-all"
                >
                  <BookTemplate className="w-4 h-4 text-muted-foreground" />
                  Guardar como plantilla
                </button>
              </div>

              <button
                onClick={handleGeneratePdf}
                className="w-full flex items-center justify-center gap-2 border border-primary/40 hover:border-primary/70 hover:bg-primary/5 text-primary text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
              >
                <FileDown className="w-4 h-4" />
                Generar PDF de sesión
              </button>
            </div>

            {!hasContent && (
              <p className="text-center text-xs text-muted-foreground/60">
                Completa al menos un bloque para poder guardar la sesión
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Template name modal */}
      {showTemplateSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Guardar como plantilla</h3>
              <button onClick={() => setShowTemplateSave(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Ej: Fuerza Potencia Centrales"
              autoFocus
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplateSave(false)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || templateMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold text-sm px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {templateMutation.isPending ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
