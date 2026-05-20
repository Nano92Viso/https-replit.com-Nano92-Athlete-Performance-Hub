import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListSessions,
  useCreateSession,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Plus, Dumbbell, Clock, ChevronRight, CalendarDays, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const typeLabel: Record<string, string> = {
  strength: "Fuerza", speed: "Velocidad", endurance: "Resistencia",
  technical: "Técnico", recovery: "Recuperación", match: "Partido",
};
const typeColor: Record<string, string> = {
  strength: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  speed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  endurance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  technical: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  recovery: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  match: "bg-red-500/15 text-red-400 border-red-500/30",
};
const intensityLabel: Record<string, string> = {
  low: "Baja", medium: "Media", high: "Alta", max: "Máxima",
};
const intensityColor: Record<string, string> = {
  low: "text-emerald-400", medium: "text-yellow-400", high: "text-orange-400", max: "text-red-400",
};

const sessionSchema = z.object({
  title: z.string().min(2, "Título requerido"),
  sessionType: z.enum(["strength", "speed", "endurance", "technical", "recovery", "match"]),
  date: z.string().min(1, "Fecha requerida"),
  duration: z.coerce.number().min(1),
  intensity: z.enum(["low", "medium", "high", "max"]),
  notes: z.string().optional(),
});
type SessionForm = z.infer<typeof sessionSchema>;

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

export default function Sessions() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useListSessions({});
  const createMutation = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Sesión creada" });
      },
      onError: () => toast({ title: "Error", description: "No se pudo crear la sesión", variant: "destructive" }),
    },
  });

  const form = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "",
      sessionType: "strength",
      date: new Date().toISOString().split("T")[0],
      duration: 60,
      intensity: "medium",
      notes: "",
    },
  });

  function onSubmit(data: SessionForm) {
    createMutation.mutate({
      data: {
        title: data.title,
        sessionType: data.sessionType,
        date: data.date,
        duration: data.duration,
        intensity: data.intensity,
        notes: data.notes,
        playerIds: [],
        exercises: [],
      },
    });
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Sesiones</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{sessions.length} sesiones registradas</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sessions/generate">
              <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                <Zap className="w-4 h-4" />
                Generar sesión
              </button>
            </Link>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 border border-border hover:bg-secondary text-foreground text-sm px-3 py-2.5 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              Manual
            </button>
          </div>
        </div>

        {/* Sessions list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-primary/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No hay sesiones aún</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Usa el generador automático para crear tu primera sesión prescrita</p>
            </div>
            <Link href="/sessions/generate">
              <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-lg transition-all mt-1">
                <Zap className="w-4 h-4" />
                Generar primera sesión
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {[...sessions].reverse().map(s => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="bg-card border border-border rounded-lg px-4 py-4 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.mdType && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/20 bg-primary/10 text-[9px] font-bold text-primary uppercase tracking-widest">
                            {s.mdType}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${typeColor[s.sessionType] ?? "bg-secondary border-border text-muted-foreground"}`}>
                          {typeLabel[s.sessionType] ?? s.sessionType}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mt-1">{s.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {formatDate(s.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {s.duration}min
                        </span>
                        <span className={`font-medium ${intensityColor[s.intensity] ?? "text-muted-foreground"}`}>
                          {intensityLabel[s.intensity] ?? s.intensity}
                        </span>
                        {(s.exercises as unknown[]).length > 0 && (
                          <span className="text-muted-foreground/60">{(s.exercises as unknown[]).length} ejercicios</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Manual session dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Nueva sesión manual</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Título</FormLabel>
                  <FormControl><Input placeholder="Ej: Sesión fuerza máxima" {...field} className="bg-background border-border text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="sessionType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(typeLabel).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="intensity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Intensidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(intensityLabel).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-background border-border text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Duración (min)</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} className="bg-background border-border text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Notas</FormLabel>
                  <FormControl><Textarea placeholder="Observaciones..." {...field} className="bg-background border-border text-sm resize-none" rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-border">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-primary-foreground">
                  {createMutation.isPending ? "Creando..." : "Crear sesión"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
