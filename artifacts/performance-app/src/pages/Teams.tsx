import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  Plus, Trash2, Shield, ChevronDown, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Subteam = { id: number; teamId: number; name: string; createdAt: string };
type Team    = { id: number; name: string; createdAt: string; subteams: Subteam[] };

type ConfirmDelete = { type: "team" | "subteam"; id: number; name: string };

// ─── API helpers ─────────────────────────────────────────────────────────────

const TEAMS_KEY = ["teams-managed"] as const;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 204) return null as T;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Teams() {
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [showSubInput, setShowSubInput] = useState<Record<number, boolean>>({});
  const [subNames, setSubNames] = useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: TEAMS_KEY,
    queryFn: () => apiFetch<Team[]>("/api/teams"),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createTeam = useMutation({
    mutationFn: (name: string) =>
      apiFetch<Team>("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: TEAMS_KEY });
      setNewTeamName("");
      setShowNewTeam(false);
      setExpandedTeams(p => new Set([...p, team.id]));
      toast({ title: `Equipo "${team.name}" creado` });
    },
    onError: () => toast({ title: "Error al crear equipo", variant: "destructive" }),
  });

  const deleteTeam = useMutation({
    mutationFn: (id: number) => apiFetch<null>(`/api/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAMS_KEY });
      toast({ title: "Equipo eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar equipo", variant: "destructive" }),
  });

  const createSubteam = useMutation({
    mutationFn: ({ teamId, name }: { teamId: number; name: string }) =>
      apiFetch<Subteam>(`/api/teams/${teamId}/subteams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: (_, { teamId }) => {
      qc.invalidateQueries({ queryKey: TEAMS_KEY });
      setSubNames(p => ({ ...p, [teamId]: "" }));
      setShowSubInput(p => ({ ...p, [teamId]: false }));
      toast({ title: "Subequipo creado" });
    },
    onError: () => toast({ title: "Error al crear subequipo", variant: "destructive" }),
  });

  const deleteSubteam = useMutation({
    mutationFn: (id: number) => apiFetch<null>(`/api/subteams/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAMS_KEY });
      toast({ title: "Subequipo eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar subequipo", variant: "destructive" }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function toggleTeam(id: number) {
    setExpandedTeams(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function openSubInput(teamId: number) {
    setShowSubInput(p => ({ ...p, [teamId]: true }));
    setExpandedTeams(p => new Set([...p, teamId]));
  }

  function closeSubInput(teamId: number) {
    setShowSubInput(p => ({ ...p, [teamId]: false }));
    setSubNames(p => ({ ...p, [teamId]: "" }));
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return;
    if (confirmDelete.type === "team") deleteTeam.mutate(confirmDelete.id);
    else deleteSubteam.mutate(confirmDelete.id);
    setConfirmDelete(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Equipos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Cargando…" : `${teams.length} ${teams.length === 1 ? "equipo" : "equipos"}`}
            </p>
          </div>
          {!showNewTeam && (
            <Button size="sm" onClick={() => setShowNewTeam(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Equipo
            </Button>
          )}
        </div>

        {/* Inline create team */}
        {showNewTeam && (
          <div
            className="flex items-center gap-3 bg-card rounded-lg px-4 py-3"
            style={{ border: "1px solid hsl(184 100% 42% / 0.30)", background: "hsl(184 100% 42% / 0.03)" }}
          >
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <Input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="Nombre del equipo…"
              className="bg-background border-border flex-1"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && newTeamName.trim()) createTeam.mutate(newTeamName.trim());
                if (e.key === "Escape") { setShowNewTeam(false); setNewTeamName(""); }
              }}
            />
            <Button
              size="sm"
              onClick={() => { if (newTeamName.trim()) createTeam.mutate(newTeamName.trim()); }}
              disabled={!newTeamName.trim() || createTeam.isPending}
            >
              {createTeam.isPending ? "Creando…" : "Crear"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowNewTeam(false); setNewTeamName(""); }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Skeleton loader */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-secondary rounded" />
                  <div className="h-4 w-40 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && teams.length === 0 && !showNewTeam && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 bg-card border border-border rounded-lg">
            <div className="w-14 h-14 rounded-xl bg-secondary/60 flex items-center justify-center">
              <Shield className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No hay equipos aún</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crea tu primer equipo para organizar jugadores y subequipos
              </p>
            </div>
            <Button size="sm" onClick={() => setShowNewTeam(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crear primer equipo
            </Button>
          </div>
        )}

        {/* Team list */}
        {!isLoading && teams.length > 0 && (
          <div className="space-y-3">
            {teams.map(team => {
              const expanded  = expandedTeams.has(team.id);
              const subInput  = showSubInput[team.id] ?? false;
              const subName   = subNames[team.id] ?? "";

              return (
                <div key={team.id} className="bg-card border border-border rounded-lg overflow-hidden">

                  {/* ── Team row ──────────────────────────────────────────── */}
                  <div className="flex items-center gap-2 px-4 py-3.5">
                    {/* Left: expand + name */}
                    <button
                      onClick={() => toggleTeam(team.id)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      <Shield className="w-4 h-4 text-primary/70 flex-shrink-0" />
                      <span className="text-sm font-bold text-foreground flex-1 truncate">{team.name}</span>
                      <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                        {team.subteams.length} {team.subteams.length === 1 ? "subequipo" : "subequipos"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Right: actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        onClick={() => openSubInput(team.id)}
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Subequipo</span>
                      </Button>
                      <button
                        onClick={() => setConfirmDelete({ type: "team", id: team.id, name: team.name })}
                        className="p-1.5 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar equipo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded body ─────────────────────────────────────── */}
                  {expanded && (
                    <div className="border-t border-border">

                      {/* Subteams list */}
                      {team.subteams.length > 0 && (
                        <div className="divide-y divide-border/50">
                          {team.subteams.map(sub => (
                            <div
                              key={sub.id}
                              className="group flex items-center gap-3 pl-10 pr-4 py-2.5 hover:bg-secondary/20 transition-colors"
                            >
                              <Users className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                              <span className="text-sm text-foreground flex-1">{sub.name}</span>
                              <button
                                onClick={() => setConfirmDelete({ type: "subteam", id: sub.id, name: sub.name })}
                                className="p-1 rounded text-transparent group-hover:text-muted-foreground/50 hover:!text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Eliminar subequipo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty subteams hint */}
                      {team.subteams.length === 0 && !subInput && (
                        <div className="pl-10 pr-4 py-3 text-xs text-muted-foreground/50">
                          Sin subequipos —{" "}
                          <button
                            onClick={() => openSubInput(team.id)}
                            className="text-primary/70 hover:text-primary transition-colors"
                          >
                            añadir uno
                          </button>
                        </div>
                      )}

                      {/* Inline create subteam */}
                      {subInput && (
                        <div
                          className="flex items-center gap-2 pl-10 pr-4 py-2.5"
                          style={{ borderTop: "1px solid hsl(184 100% 42% / 0.20)", background: "hsl(184 100% 42% / 0.03)" }}
                        >
                          <Users className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
                          <Input
                            value={subName}
                            onChange={e => setSubNames(p => ({ ...p, [team.id]: e.target.value }))}
                            placeholder="Nombre del subequipo…"
                            className="bg-background border-border h-7 text-sm flex-1"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter" && subName.trim())
                                createSubteam.mutate({ teamId: team.id, name: subName.trim() });
                              if (e.key === "Escape") closeSubInput(team.id);
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => { if (subName.trim()) createSubteam.mutate({ teamId: team.id, name: subName.trim() }); }}
                            disabled={!subName.trim() || createSubteam.isPending}
                          >
                            {createSubteam.isPending ? "…" : "Crear"}
                          </Button>
                          <button
                            onClick={() => closeSubInput(team.id)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
        <Dialog open={confirmDelete !== null} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Eliminar {confirmDelete?.type === "team" ? "equipo" : "subequipo"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ¿Seguro que quieres eliminar{" "}
              <span className="font-semibold text-foreground">"{confirmDelete?.name}"</span>?
              {confirmDelete?.type === "team" && (
                <> Se eliminarán también todos sus subequipos.</>
              )}{" "}
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleteTeam.isPending || deleteSubteam.isPending}
              >
                {deleteTeam.isPending || deleteSubteam.isPending ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
