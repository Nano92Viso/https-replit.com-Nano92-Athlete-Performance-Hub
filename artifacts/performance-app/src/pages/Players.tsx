import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useListPlayers,
  useCreatePlayer,
  useImportPlayersCsv,
  getListPlayersQueryKey,
  useListTeams,
  useCreateTeam,
  getListTeamsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  Search, Plus, Upload, ChevronRight, UserX, Users, User,
  FolderOpen, Folder, ChevronDown, Shield,
} from "lucide-react";
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

const POSITIONS = [
  "Portero", "Defensa Central", "Lateral Derecho", "Lateral Izquierdo",
  "Medio Defensivo", "Medio Centro", "Medio Ofensivo",
  "Extremo Derecho", "Extremo Izquierdo", "Delantero Centro",
];


const injuryBadge: Record<string, string> = {
  fit: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  minor_risk: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  injured: "bg-red-500/15 text-red-400 border-red-500/30",
  recovery: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
const injuryLabel: Record<string, string> = {
  fit: "Apto",
  minor_risk: "Riesgo Menor",
  injured: "Lesionado",
  recovery: "Recuperación",
};
const riskBadge: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};
const riskLabel: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

const physicalBadge: Record<string, string> = {
  available:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  doubt:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  recovery:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  injured:    "bg-red-500/15 text-red-400 border-red-500/30",
  sanctioned: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};
const physicalLabel: Record<string, string> = {
  available:  "Disponible",
  doubt:      "Duda",
  recovery:   "Recuperación",
  injured:    "Lesionado",
  sanctioned: "Sancionado",
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const playerSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  position: z.string().min(1, "Posición requerida"),
  number: z.coerce.number().min(1).max(99),
  age: z.coerce.number().min(14).max(45),
  height: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  dominantFoot: z.string().optional(),
  nationality: z.string().optional(),
  playerType: z.enum(["team", "individual"]).default("team"),
  teamId: z.coerce.number().int().optional(),
  subteamId: z.coerce.number().int().optional(),
  category: z.string().optional(),
  team: z.string().optional(),
  observations: z.string().optional(),
  physicalStatus: z.enum(["available", "injured", "doubt", "sanctioned", "recovery"]).optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  preferredFoot: z.enum(["left", "right", "both"]).optional(),
});
type PlayerForm = z.infer<typeof playerSchema>;

const teamSchema = z.object({
  club: z.string().min(1, "Club requerido"),
  category: z.string().min(1, "Categoría requerida"),
  season: z.string().optional(),
});
type TeamForm = z.infer<typeof teamSchema>;

type PlayerTypeFilter = "all" | "team" | "individual";


type AnyPlayer = {
  id: number;
  name: string;
  position: string;
  number: number;
  age: number;
  nationality?: string | null;
  injuryStatus: string;
  riskLevel: string;
  lastTestDate?: string | null;
  teamId?: number | null;
  playerType?: string | null;
  category?: string | null;
  physicalStatus?: string | null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerRow({ player, teamLabel }: { player: AnyPlayer; teamLabel?: string }) {
  const subtitle = teamLabel
    ? teamLabel
    : player.playerType === "individual"
    ? "Atleta individual"
    : player.teamId
    ? "Sin nombre de equipo"
    : "Sin equipo";
  const statusKey = player.physicalStatus ?? player.injuryStatus;
  const statusBadgeClass = physicalBadge[statusKey] ?? injuryBadge[statusKey] ?? "";
  const statusText = physicalLabel[statusKey] ?? injuryLabel[statusKey] ?? statusKey;

  return (
    <Link href={`/players/${player.id}`}>
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_32px] gap-x-4 items-center px-4 py-3.5 hover:bg-secondary/40 cursor-pointer transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(184 100% 42% / 0.20), hsl(184 100% 42% / 0.06))", border: "1.5px solid hsl(184 100% 42% / 0.35)" }}
            >
              <span className="text-[11px] font-black text-primary/90 tracking-tight select-none">
                {player.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center border border-card">
              <span className="text-[7px] font-black text-primary-foreground leading-none">{player.number}</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">{player.name}</span>
              {player.playerType === "individual" && (
                <span className="text-[9px] bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium flex-shrink-0">Ind.</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
          </div>
        </div>
        <span className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">{player.position}</span>
        <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${statusBadgeClass}`}>
          {statusText}
        </span>
        <span className={`hidden lg:block text-xs font-medium ${riskBadge[player.riskLevel] ?? "text-muted-foreground"}`}>
          {riskLabel[player.riskLevel] ?? player.riskLevel}
        </span>
        <span className="hidden lg:block text-xs text-muted-foreground">{player.lastTestDate ?? "—"}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function PlayerTableHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_32px] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
      <span>Jugador</span>
      <span className="hidden sm:block">Pos.</span>
      <span className="hidden md:block">Estado</span>
      <span className="hidden lg:block">Riesgo</span>
      <span className="hidden lg:block">Último Test</span>
      <span />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Players() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [playerTypeFilter, setPlayerTypeFilter] = useState<PlayerTypeFilter>("all");
  const [expandedTeams, setExpandedTeams] = useState<Set<number | string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedClubFilter, setSelectedClubFilter] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: players = [], isLoading } = useListPlayers({
    search: search || undefined,
    playerType: playerTypeFilter !== "all" ? playerTypeFilter : undefined,
  });
  const { data: teams = [] } = useListTeams();
  // teams incluye subteams anidados (TeamWithSubteams[]) — ver api.schemas.ts
  const createPlayer = useCreatePlayer();
  const createTeam = useCreateTeam();
  const importCsv = useImportPlayersCsv();

  // ── Player form ──────────────────────────────────────────────────────────────
  const playerForm = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: { name: "", position: "", number: 1, age: 22, playerType: "team" },
  });
  const watchedPlayerType = playerForm.watch("playerType");
  const watchedTeamId     = playerForm.watch("teamId");
  const watchedHeight     = playerForm.watch("height");
  const watchedWeight     = playerForm.watch("weight");

  // IMC calculation
  const imc = watchedHeight && watchedWeight && watchedHeight > 0
    ? watchedWeight / Math.pow(watchedHeight / 100, 2)
    : null;
  const imcLabel = imc === null ? null
    : imc < 18.5  ? { text: "Bajo peso",  color: "text-yellow-400" }
    : imc < 25    ? { text: "Normopeso",  color: "text-emerald-400" }
    : imc < 30    ? { text: "Sobrepeso",  color: "text-orange-400" }
    :               { text: "Obesidad",   color: "text-red-400" };

  // Unique clubs from teams
  const uniqueClubs = [...new Set(teams.map(t => t.club).filter(Boolean))] as string[];
  // Teams filtered by selected club (for player form)
  const teamsForClub = selectedClubFilter
    ? teams.filter(t => t.club === selectedClubFilter)
    : [];
  // Season of currently selected team
  const selectedTeamData = teams.find(t => t.id === watchedTeamId);

  // Map teamId → display label "Club · Categoría" for flat list
  const teamLabelMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const t of teams) {
      if (t.club && t.category) map[t.id] = `${t.club} · ${t.category}`;
      else if (t.club) map[t.id] = t.club;
      else if (t.category) map[t.id] = t.category;
      else map[t.id] = t.name;
    }
    return map;
  }, [teams]);

  // Count duplicate teams (same club+category, case-insensitive)
  const duplicateTeamsCount = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of teams) {
      const key = `${(t.club ?? "").toLowerCase().trim()}|${(t.category ?? "").toLowerCase().trim()}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen.values()].filter(c => c > 1).reduce((acc, c) => acc + c - 1, 0);
  }, [teams]);

  // ── Team form ────────────────────────────────────────────────────────────────
  const teamForm = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: { club: "", category: "", season: "2025/26" },
  });

  // ── Group players by teamId ──────────────────────────────────────────────────
  const playersByTeam = useMemo(() => {
    const map: Record<number | string, AnyPlayer[]> = { unassigned: [], individual: [] };
    for (const p of players as AnyPlayer[]) {
      if (p.playerType === "individual") {
        map["individual"].push(p);
      } else {
        const key = p.teamId ?? "unassigned";
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    }
    return map;
  }, [players]);

  function toggleTeam(id: number | string) {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function onSubmitPlayer(data: PlayerForm) {
    const isTeam = data.playerType === "team";
    createPlayer.mutate(
      { data: { ...data, playerType: data.playerType ?? "team", teamId: isTeam ? data.teamId : undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
          setShowAdd(false);
          playerForm.reset();
          toast({ title: "Jugador añadido correctamente" });
        },
        onError: () => toast({ title: "Error al añadir jugador", variant: "destructive" }),
      }
    );
  }

  function onSubmitTeam(data: TeamForm) {
    const club = data.club.trim();
    const category = data.category.trim();
    const teamName = `${club} - ${category}`;
    const alreadyInList = teams.some(
      t => t.club?.toLowerCase().trim() === club.toLowerCase() &&
           t.category?.toLowerCase().trim() === category.toLowerCase()
    );
    createTeam.mutate(
      { data: { name: teamName, club, category, season: data.season?.trim() || undefined } },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          setShowNewTeam(false);
          teamForm.reset({ club: "", category: "", season: "2025/26" });
          toast({
            title: alreadyInList
              ? `"${created.name}" ya existe — seleccionando el existente`
              : `Equipo "${created.name}" creado`,
          });
          setExpandedTeams(prev => new Set([...prev, `club_${club}`]));
          setPlayerTypeFilter("team");
        },
        onError: () => toast({ title: "Error al crear equipo", variant: "destructive" }),
      }
    );
  }

  const [csvResult, setCsvResult] = useState<{ imported: number; updated?: number; errors: string[]; mappedColumns: string[] } | null>(null);
  function onImportCsv() {
    importCsv.mutate(
      { data: { csvContent } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
          setCsvResult({ imported: result.imported, updated: result.updated, errors: result.errors, mappedColumns: result.mappedColumns });
          if (result.errors.length === 0) {
            setShowCsv(false);
            setCsvContent("");
            const msg = result.updated
              ? `${result.imported} nuevos · ${result.updated} actualizados`
              : `${result.imported} jugadores importados`;
            toast({ title: "Importación completada", description: msg });
          }
        },
        onError: () => toast({ title: "Error en importación CSV", variant: "destructive" }),
      }
    );
  }

  const filterTabs: { value: PlayerTypeFilter; label: string; icon: React.ReactNode }[] = [
    { value: "all",        label: "Todos",        icon: <UserX  className="w-3.5 h-3.5" /> },
    { value: "team",       label: "Equipos",      icon: <Users  className="w-3.5 h-3.5" /> },
    { value: "individual", label: "Individuales", icon: <User   className="w-3.5 h-3.5" /> },
  ];

  // ─── Helper: render players of a team grouped by player.category ─────────────
  const renderTeamPlayers = (teamId: number, teamPlayers: AnyPlayer[]) => {
    if (teamPlayers.length === 0) return null;
    const catMap = new Map<string, AnyPlayer[]>();
    const uncategorized: AnyPlayer[] = [];
    for (const p of teamPlayers) {
      if (p.category) {
        if (!catMap.has(p.category)) catMap.set(p.category, []);
        catMap.get(p.category)!.push(p);
      } else {
        uncategorized.push(p);
      }
    }
    const hasCategories = catMap.size > 0;
    return (
      <>
        {[...catMap.entries()].map(([cat, catPlayers]) => {
          const catKey = `${teamId}_${cat}`;
          const catOpen = expandedCategories.has(catKey);
          return (
            <div key={cat} className="border-b border-border/60 last:border-0">
              <button onClick={() => toggleCategory(catKey)} className="w-full flex items-center gap-2.5 pl-8 pr-4 py-2.5 text-left hover:bg-secondary/20 transition-colors">
                {catOpen ? <FolderOpen className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />}
                <span className="text-xs font-semibold text-muted-foreground flex-1">{cat}</span>
                <span className="text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded-full">{catPlayers.length} {catPlayers.length === 1 ? "jugador" : "jugadores"}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
              </button>
              {catOpen && (<div className="border-t border-border/40"><PlayerTableHeader /><div className="divide-y divide-border/60">{catPlayers.map(p => <PlayerRow key={p.id} player={p} />)}</div></div>)}
            </div>
          );
        })}
        {uncategorized.length > 0 && (hasCategories ? (
          <div className="border-b border-border/60 last:border-0">
            <button onClick={() => toggleCategory(`${teamId}_uncategorized`)} className="w-full flex items-center gap-2.5 pl-8 pr-4 py-2.5 text-left hover:bg-secondary/20 transition-colors">
              {expandedCategories.has(`${teamId}_uncategorized`) ? <FolderOpen className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
              <span className="text-xs font-semibold text-muted-foreground/60 flex-1">Sin categoría</span>
              <span className="text-[10px] text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded-full">{uncategorized.length}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200 ${expandedCategories.has(`${teamId}_uncategorized`) ? "rotate-180" : ""}`} />
            </button>
            {expandedCategories.has(`${teamId}_uncategorized`) && (<div className="border-t border-border/40"><PlayerTableHeader /><div className="divide-y divide-border/60">{uncategorized.map(p => <PlayerRow key={p.id} player={p} />)}</div></div>)}
          </div>
        ) : (<><PlayerTableHeader /><div className="divide-y divide-border">{uncategorized.map(p => <PlayerRow key={p.id} player={p} />)}</div></>))}
      </>
    );
  };

  // ─── Team folder view ────────────────────────────────────────────────────────
  const renderTeamFolders = () => {
    // Group teams by club field
    const clubNames = [...new Set(teams.map(t => t.club).filter(Boolean))] as string[];
    const teamsByClubMap = new Map<string, typeof teams>();
    const teamsWithoutClub: typeof teams = [];
    for (const t of teams) {
      if (t.club) {
        if (!teamsByClubMap.has(t.club)) teamsByClubMap.set(t.club, []);
        teamsByClubMap.get(t.club)!.push(t);
      } else {
        teamsWithoutClub.push(t);
      }
    }

    const unassigned = playersByTeam["unassigned"] ?? [];
    const individuals = playersByTeam["individual"] ?? [];
    const hasAny = teams.length > 0 || unassigned.length > 0 || individuals.length > 0;

    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-secondary rounded" />
                <div className="h-4 w-40 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!hasAny) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-card border border-border rounded-lg">
          <div className="w-14 h-14 rounded-xl bg-secondary/60 flex items-center justify-center">
            <Shield className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No hay equipos aún</p>
            <p className="text-xs text-muted-foreground mt-1">Crea un equipo y añade jugadores para empezar</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowNewTeam(true)}>
              <Shield className="w-4 h-4 mr-2" /> Crear equipo
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Añadir jugador
            </Button>
          </div>
        </div>
      );
    }

    const renderTeamRow = (team: typeof teams[0], indent = false) => {
      const teamPlayers = playersByTeam[team.id] ?? [];
      const teamOpen = expandedTeams.has(team.id);
      const isEmpty = teamPlayers.length === 0;
      return (
        <div key={team.id} className={`border-b border-border/60 last:border-0 ${indent ? "" : ""}`}>
          <button
            onClick={() => !isEmpty && toggleTeam(team.id)}
            className={`w-full flex items-center gap-2.5 ${indent ? "pl-8" : "pl-4"} pr-4 py-2.5 text-left transition-colors ${isEmpty ? "cursor-default opacity-60" : "hover:bg-secondary/20"}`}
          >
            {teamOpen
              ? <FolderOpen className="w-3.5 h-3.5 text-primary/80 flex-shrink-0" />
              : <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${isEmpty ? "text-muted-foreground/40" : "text-primary/40"}`} />
            }
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground">{team.category ?? team.name}</span>
              {team.season && <span className="text-[10px] text-muted-foreground ml-2">{team.season}</span>}
            </div>
            <span className="text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
              {teamPlayers.length} {teamPlayers.length === 1 ? "jugador" : "jugadores"}
            </span>
            {!isEmpty && <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 transition-transform duration-200 ${teamOpen ? "rotate-180" : ""}`} />}
          </button>
          {teamOpen && (
            <div className="border-t border-border/40 pl-4">
              {renderTeamPlayers(team.id, teamPlayers)}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {/* Club folders */}
        {clubNames.map(clubName => {
          const clubTeams = teamsByClubMap.get(clubName) ?? [];
          const clubKey = `club_${clubName}`;
          const open = expandedTeams.has(clubKey);
          const totalPlayers = clubTeams.reduce((acc, t) => acc + (playersByTeam[t.id]?.length ?? 0), 0);

          return (
            <div key={clubName} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTeam(clubKey)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
              >
                {open ? <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" /> : <Folder className="w-4 h-4 text-primary/60 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-foreground">{clubName}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-2">{clubTeams.length} {clubTeams.length === 1 ? "equipo" : "equipos"}</span>
                </div>
                <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                  {totalPlayers} {totalPlayers === 1 ? "jugador" : "jugadores"}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="border-t border-border">
                  {clubTeams.map(t => renderTeamRow(t, true))}
                </div>
              )}
            </div>
          );
        })}

        {/* Teams without club */}
        {teamsWithoutClub.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-lg overflow-hidden">
            {renderTeamRow(t, false)}
          </div>
        ))}

        {/* Unassigned players */}
        {unassigned.length > 0 && (
          <div className="bg-card border border-border/60 border-dashed rounded-lg overflow-hidden">
            <button
              onClick={() => toggleTeam("unassigned")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/20 transition-colors"
            >
              {expandedTeams.has("unassigned")
                ? <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                : <Folder     className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              }
              <span className="text-sm font-medium text-muted-foreground flex-1">Sin equipo asignado</span>
              <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                {unassigned.length} {unassigned.length === 1 ? "jugador" : "jugadores"}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expandedTeams.has("unassigned") ? "rotate-180" : ""}`} />
            </button>
            {expandedTeams.has("unassigned") && (
              <div className="border-t border-border/60">
                <PlayerTableHeader />
                <div className="divide-y divide-border">
                  {unassigned.map(p => <PlayerRow key={p.id} player={p} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Individual athletes */}
        {individuals.length > 0 && (
          <div className="bg-card border border-violet-500/20 border-dashed rounded-lg overflow-hidden">
            <button
              onClick={() => toggleTeam("individual")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/20 transition-colors"
            >
              {expandedTeams.has("individual")
                ? <FolderOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
                : <Folder     className="w-4 h-4 text-violet-400/60 flex-shrink-0" />
              }
              <span className="text-sm font-medium text-muted-foreground flex-1">Atletas individuales</span>
              <span className="text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                {individuals.length} {individuals.length === 1 ? "atleta" : "atletas"}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expandedTeams.has("individual") ? "rotate-180" : ""}`} />
            </button>
            {expandedTeams.has("individual") && (
              <div className="border-t border-border/60">
                <PlayerTableHeader />
                <div className="divide-y divide-border">
                  {individuals.map(p => <PlayerRow key={p.id} player={p} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Flat list ────────────────────────────────────────────────────────────────
  const renderFlatList = () => (
    <div className="bg-card border border-border rounded overflow-hidden">
      <PlayerTableHeader />
      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 animate-pulse flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-secondary" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-secondary rounded" />
                <div className="h-2.5 w-20 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (players as AnyPlayer[]).length > 0 ? (
        <div className="divide-y divide-border">
          {(players as AnyPlayer[]).map(p => (
            <PlayerRow
              key={p.id}
              player={p}
              teamLabel={p.teamId ? teamLabelMap[p.teamId] : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <UserX className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {search ? "No se encontraron jugadores" : "No hay jugadores en el plantel"}
          </p>
          {!search && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Añadir primer jugador
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Jugadores</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Cargando..." : `${(players as AnyPlayer[]).length} jugadores en el plantel`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCsv(true)}>
              <Upload className="w-4 h-4 mr-2" /> Importar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNewTeam(true)}>
              <Shield className="w-4 h-4 mr-2" /> Nuevo Equipo
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Añadir Jugador
            </Button>
          </div>
        </div>

        {/* Filter tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-secondary/40 border border-border rounded-lg p-0.5 gap-0.5 flex-shrink-0">
            {filterTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setPlayerTypeFilter(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  playerTypeFilter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar jugador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded px-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Content */}
        {playerTypeFilter === "team" && duplicateTeamsCount > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <span className="text-xs text-yellow-400/80">
              {duplicateTeamsCount} {duplicateTeamsCount === 1 ? "equipo duplicado detectado" : "equipos duplicados detectados"} (mismo club + categoría)
            </span>
            <button
              onClick={() => {
                const dupes: string[] = [];
                const seen = new Map<string, string[]>();
                for (const t of teams) {
                  const key = `${(t.club ?? "").toLowerCase().trim()}|${(t.category ?? "").toLowerCase().trim()}`;
                  if (!seen.has(key)) seen.set(key, []);
                  seen.get(key)!.push(t.name);
                }
                for (const [, names] of seen) {
                  if (names.length > 1) dupes.push(`"${names.join('" y "')}" (${names.length} duplicados)`);
                }
                alert(`Equipos duplicados encontrados:\n\n${dupes.join("\n")}\n\nElimina los duplicados desde tu panel de base de datos.`);
              }}
              className="text-[11px] font-semibold text-yellow-400 border border-yellow-500/30 rounded px-2.5 py-1 hover:bg-yellow-500/10 transition-colors"
            >
              Ver duplicados
            </button>
          </div>
        )}
        {playerTypeFilter === "team" ? renderTeamFolders() : renderFlatList()}

        {/* ── New Team Modal ─────────────────────────────────────────────────────── */}
        <Dialog open={showNewTeam} onOpenChange={(v) => { setShowNewTeam(v); if (!v) teamForm.reset({ club: "", category: "", season: "2025/26" }); }}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Nuevo Equipo
              </DialogTitle>
            </DialogHeader>
            <Form {...teamForm}>
              <form onSubmit={teamForm.handleSubmit(onSubmitTeam)} className="space-y-4">
                <FormField control={teamForm.control} name="club" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Club *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Vallecas CF" className="bg-background border-border" autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={teamForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Categoría *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Juvenil A, Sub-18…" className="bg-background border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={teamForm.control} name="season" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Temporada</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2025/26" className="bg-background border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {teamForm.watch("club") && teamForm.watch("category") && (
                  <p className="text-[11px] text-muted-foreground bg-secondary/40 px-3 py-2 rounded border border-border/60">
                    Se creará:{" "}
                    <span className="font-semibold text-foreground">
                      {teamForm.watch("club")} › {teamForm.watch("category")}
                      {teamForm.watch("season") && <span className="text-muted-foreground font-normal"> · {teamForm.watch("season")}</span>}
                    </span>
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setShowNewTeam(false); teamForm.reset({ club: "", category: "", season: "2025/26" }); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createTeam.isPending}>
                    {createTeam.isPending ? "Creando…" : "Crear Equipo"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* ── Add Player Modal ───────────────────────────────────────────────────── */}
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) { playerForm.reset(); setSelectedClubFilter(null); } }}>
          <DialogContent className="bg-card border-border max-w-xl flex flex-col max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nuevo Jugador</DialogTitle>
            </DialogHeader>
            <Form {...playerForm}>
              <form onSubmit={playerForm.handleSubmit(onSubmitPlayer)} className="flex flex-col min-h-0 flex-1">

                {/* Scrollable fields */}
                <div className="overflow-y-auto flex-1 space-y-3 pr-0.5">

                  {/* Tipo */}
                  <FormField control={playerForm.control} name="playerType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</FormLabel>
                      <div className="flex bg-secondary/40 border border-border rounded-lg p-0.5 gap-0.5">
                        {[
                          { value: "team",       label: "Jugador de equipo", icon: <Users className="w-3.5 h-3.5" /> },
                          { value: "individual", label: "Atleta individual", icon: <User  className="w-3.5 h-3.5" /> },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded text-xs font-medium transition-colors ${
                              field.value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )} />

                  {/* Grid compacto 4 columnas → 2 columnas efectivas por par */}
                  <div className="grid grid-cols-4 gap-3">

                    <FormField control={playerForm.control} name="name" render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Nombre</FormLabel>
                        <FormControl><Input {...field} placeholder="Nombre completo" className="bg-background border-border" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="position" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Posición</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border">
                              <SelectValue placeholder="Posición" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="number" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Dorsal</FormLabel>
                        <FormControl><Input {...field} type="number" min={1} max={99} className="bg-background border-border" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="age" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Edad</FormLabel>
                        <FormControl><Input {...field} type="number" className="bg-background border-border" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="nationality" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Nacionalidad</FormLabel>
                        <FormControl><Input {...field} placeholder="País" className="bg-background border-border" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="physicalStatus" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Estado Físico</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border">
                              <SelectValue placeholder="Seleccionar…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="doubt">Duda</SelectItem>
                            <SelectItem value="recovery">Recuperación</SelectItem>
                            <SelectItem value="injured">Lesionado</SelectItem>
                            <SelectItem value="sanctioned">Sancionado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Equipo section (solo para jugadores de equipo) */}
                    {watchedPlayerType === "team" && (
                      <>
                        {/* ── CLUB dropdown (unique clubs from teams) ── */}
                        <div className="col-span-4 space-y-1.5">
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Club</label>
                          {uniqueClubs.length > 0 ? (
                            <Select
                              onValueChange={v => {
                                setSelectedClubFilter(v === "none" ? null : v);
                                playerForm.setValue("teamId", undefined);
                              }}
                              value={selectedClubFilter ?? "none"}
                            >
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Sin club" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Sin club</SelectItem>
                                {uniqueClubs.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border border-border/50 rounded text-xs text-muted-foreground">
                              <Shield className="w-3.5 h-3.5 flex-shrink-0 text-primary/50" />
                              <span className="flex-1">Primero crea un equipo desde</span>
                              <button
                                type="button"
                                onClick={() => { setShowAdd(false); setShowNewTeam(true); }}
                                className="text-primary hover:underline font-semibold whitespace-nowrap"
                              >
                                + Nuevo Equipo
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ── EQUIPO: teams filtered by selected club ── */}
                        {selectedClubFilter && teamsForClub.length > 0 && (
                          <FormField control={playerForm.control} name="teamId" render={({ field }) => (
                            <FormItem className="col-span-4">
                              <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Equipo</FormLabel>
                              <Select
                                onValueChange={v => field.onChange(v === "none" ? undefined : Number(v))}
                                value={field.value?.toString() ?? "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Sin equipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="none">Sin equipo</SelectItem>
                                  {teamsForClub.map(t => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                      {t.category ?? t.name}{t.season ? ` · ${t.season}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}

                        {/* ── TEMPORADA: display only from selected team ── */}
                        {selectedTeamData?.season && (
                          <div className="col-span-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Temporada</p>
                            <p className="text-sm text-foreground px-3 py-2 bg-secondary/30 border border-border/50 rounded">{selectedTeamData.season}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Atleta individual section */}
                    {watchedPlayerType === "individual" && (
                      <>
                        <FormField control={playerForm.control} name="category" render={({ field }) => (
                          <FormItem className="col-span-4">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Categoría personalizada</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ej: Velocidad, Fuerza…" className="bg-background border-border" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={playerForm.control} name="team" render={({ field }) => (
                          <FormItem className="col-span-4">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Club</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nombre del club (opcional)" className="bg-background border-border" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </>
                    )}

                    <FormField control={playerForm.control} name="preferredFoot" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Lateralidad dominante</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border">
                              <SelectValue placeholder="Seleccionar…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="right">Derecho</SelectItem>
                            <SelectItem value="left">Izquierdo</SelectItem>
                            <SelectItem value="both">Ambos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="birthDate" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Fecha de nacimiento</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="birthPlace" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Lugar de nacimiento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ciudad, País" className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="height" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Altura (cm)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={140} max={220} placeholder="180" className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={playerForm.control} name="weight" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Peso (kg)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={40} max={150} placeholder="75" className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* IMC */}
                    {imc !== null && (
                      <div className="col-span-4 flex items-center gap-3 px-3 py-2 bg-secondary/30 border border-border/50 rounded">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">IMC</span>
                        <span className="text-sm font-semibold text-foreground">{imc.toFixed(1)}</span>
                        {imcLabel && <span className={`text-xs font-medium ${imcLabel.color}`}>{imcLabel.text}</span>}
                      </div>
                    )}

                    <FormField control={playerForm.control} name="observations" render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">Observaciones</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Notas sobre el jugador…" className="bg-background border-border text-sm" rows={1} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                  </div>
                </div>

                {/* Botones siempre visibles fuera del área scrollable */}
                <div className="flex justify-end gap-2 pt-3 mt-1 border-t border-border flex-shrink-0">
                  <Button type="button" variant="outline" onClick={() => { setShowAdd(false); playerForm.reset(); setSelectedClubFilter(null); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPlayer.isPending}>
                    {createPlayer.isPending ? "Guardando…" : "Guardar Jugador"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* ── CSV Import Modal ───────────────────────────────────────────────────── */}
        <Dialog open={showCsv} onOpenChange={(open) => { setShowCsv(open); if (!open) { setCsvContent(""); setCsvResult(null); } }}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Importar desde Chronojump CSV</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-secondary/40 border border-border rounded p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Columnas soportadas (detección automática)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-primary">Jugador:</span> nombre/name, posicion, numero/dorsal, edad, equipo, altura, peso, pie_dominante, nacionalidad
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-primary">Neuromuscular:</span> load/carga, explode/explosion, drive/traccion, CMJ, SJ, fuerza, fuerza_relativa, potencia, potencia_relativa
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-primary">Velocidad:</span> velocidad_maxima/vmax, t_vmax, rsi, asimetria
                </p>
              </div>

              <Textarea
                value={csvContent}
                onChange={e => { setCsvContent(e.target.value); setCsvResult(null); }}
                placeholder={"nombre;posicion;numero;edad;load;explode;drive;CMJ;rsi\nCristiano Ronaldo;Delantero Centro;7;39;72;91;65;45.2;1.85"}
                rows={7}
                className="bg-background border-border font-mono text-xs"
              />

              {csvResult && (
                <div className="space-y-2">
                  {csvResult.mappedColumns.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded p-3">
                      <p className="text-[11px] font-medium text-primary mb-1.5">Columnas detectadas</p>
                      <div className="flex flex-wrap gap-1">
                        {csvResult.mappedColumns.map((col, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded font-mono">{col}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {csvResult.errors.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded p-3">
                      <p className="text-[11px] font-medium text-red-400 mb-1">Errores</p>
                      {csvResult.errors.map((e, i) => (
                        <p key={i} className="text-[11px] text-red-400/80">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowCsv(false); setCsvContent(""); setCsvResult(null); }}>Cancelar</Button>
                <Button onClick={onImportCsv} disabled={!csvContent.trim() || importCsv.isPending}>
                  {importCsv.isPending ? "Importando…" : "Importar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
