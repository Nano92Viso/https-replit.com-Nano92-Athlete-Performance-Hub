import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import { db, playersTable, neuromuscularTable } from "@workspace/db";
import {
  ListPlayersQueryParams,
  ListPlayersResponse,
  CreatePlayerBody,
  GetPlayerParams,
  GetPlayerResponse,
  UpdatePlayerParams,
  UpdatePlayerBody,
  UpdatePlayerResponse,
  DeletePlayerParams,
  ImportPlayersCsvBody,
  ImportPlayersCsvResponse,
} from "@workspace/api-zod";
import { computeProfile } from "./neuromuscular.js";

const router: IRouter = Router();

/** Normalise numeric Drizzle fields to JS numbers for serialisation */
function serializePlayer(p: typeof playersTable.$inferSelect) {
  return {
    ...p,
    height: p.height != null ? Number(p.height) : null,
    weight: p.weight != null ? Number(p.weight) : null,
    injuryHistory: (p.injuryHistory as unknown[]) ?? [],
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Column name aliases ────────────────────────────────────────────────────
// Maps normalised header → canonical field name used in import logic
const COL_ALIASES: Record<string, string> = {
  // Player identity
  nombre: "name", jugador: "name", player: "name", name: "name",
  posicion: "position", posición: "position", position: "position", pos: "position",
  numero: "number", número: "number", number: "number", dorsal: "number", "#": "number",
  edad: "age", age: "age",
  equipo: "team", team: "team", club: "team",
  nacionalidad: "nationality", nationality: "nationality",
  altura: "height", height: "height", talla: "height",
  peso: "weight", weight: "weight",
  pieDominante: "dominantFoot", pie_dominante: "dominantFoot", foot: "dominantFoot", "pie dominante": "dominantFoot",
  estado: "injuryStatus", injury_status: "injuryStatus",

  // Neuromuscular scores
  load: "load", carga: "load",
  explode: "explode", explosion: "explode", explosión: "explode",
  drive: "drive", traccion: "drive", tracción: "drive",

  // Jump metrics
  cmj: "cmjHeight", "cmj height": "cmjHeight", cmj_height: "cmjHeight", altura_cmj: "cmjHeight", "cmj (cm)": "cmjHeight",
  sj: "squatJump", "squat jump": "squatJump", squat_jump: "squatJump", "sj (cm)": "squatJump",

  // Force & power
  fuerza_isometrica: "isometricForce", "fuerza isométrica": "isometricForce",
  isometric_force: "isometricForce", fuerza: "isometricForce",
  fuerza_relativa: "forcePerKg", "fuerza relativa": "forcePerKg", force_per_kg: "forcePerKg", "fuerza/kg": "forcePerKg",
  potencia: "power", power: "power",
  potencia_relativa: "powerPerKg", "potencia relativa": "powerPerKg", power_per_kg: "powerPerKg", "potencia/kg": "powerPerKg",

  // Speed
  velocidad_maxima: "maxSpeed", "velocidad maxima": "maxSpeed", "velocidad máxima": "maxSpeed", vmax: "maxSpeed", max_speed: "maxSpeed", "vmax (km/h)": "maxSpeed",
  t_vmax: "tToVmax", "t->vmax": "tToVmax", "tiempo a vmax": "tToVmax", t_to_vmax: "tToVmax", "t vmax (s)": "tToVmax",

  // Indices
  asimetria: "asymmetryIndex", asimetría: "asymmetryIndex", asymmetry: "asymmetryIndex", asymmetry_index: "asymmetryIndex", "asi (%)": "asymmetryIndex",
  rsi: "rsi",
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\s+/g, " ");           // collapse spaces
}

/** Parse a CSV line respecting quoted fields */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function autoDetectDelimiter(line: string): string {
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseNum(v: string | undefined): number | undefined {
  if (!v || v.trim() === "" || v.trim() === "-") return undefined;
  const n = Number(v.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get("/players", async (req, res): Promise<void> => {
  const query = ListPlayersQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions: SQL[] = [];
  if (query.data.position) conditions.push(eq(playersTable.position, query.data.position));
  if (query.data.search) conditions.push(ilike(playersTable.name, `%${query.data.search}%`));
  if (query.data.team) conditions.push(eq(playersTable.team!, query.data.team));
  if (query.data.playerType) conditions.push(eq(playersTable.playerType, query.data.playerType));
  if (query.data.teamId) conditions.push(eq(playersTable.teamId!, query.data.teamId));
  if (query.data.groupId) conditions.push(eq(playersTable.groupId!, query.data.groupId));

  const players = await db
    .select()
    .from(playersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(playersTable.name);

  res.json(ListPlayersResponse.parse(players.map(serializePlayer)));
});

// ── CSV Import (must be before /:id route) ───────────────────────────────────
router.post("/players/import-csv", async (req, res): Promise<void> => {
  const parsed = ImportPlayersCsvBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const rawLines = parsed.data.csvContent.trim().split(/\r?\n/).filter(l => l.trim());
  if (rawLines.length < 2) {
    res.json(ImportPlayersCsvResponse.parse({ imported: 0, updated: 0, errors: ["CSV vacío o sin datos"], mappedColumns: [], players: [] }));
    return;
  }

  const delimiter = parsed.data.delimiter ?? autoDetectDelimiter(rawLines[0]);
  const rawHeaders = parseCsvLine(rawLines[0], delimiter);
  const mappedColumns: string[] = [];
  const headerMap: Array<string | null> = rawHeaders.map(h => {
    const norm = normalizeHeader(h);
    const canonical = COL_ALIASES[norm] ?? null;
    if (canonical) mappedColumns.push(`${h} → ${canonical}`);
    return canonical;
  });

  const errors: string[] = [];
  const importedPlayers: ReturnType<typeof serializePlayer>[] = [];
  let updated = 0;

  for (let i = 1; i < rawLines.length; i++) {
    const values = parseCsvLine(rawLines[i], delimiter);
    const row: Record<string, string> = {};
    headerMap.forEach((canonical, idx) => {
      if (canonical) row[canonical] = values[idx] ?? "";
    });

    const name = row["name"]?.trim();
    if (!name) { errors.push(`Fila ${i + 1}: nombre requerido`); continue; }

    const number = parseInt(row["number"] ?? "0", 10);
    const age = parseInt(row["age"] ?? "22", 10);
    const position = row["position"]?.trim() || "Medio Centro";
    const team = row["team"]?.trim() || null;
    const nationality = row["nationality"]?.trim() || null;
    const height = parseNum(row["height"]);
    const weight = parseNum(row["weight"]);
    const dominantFoot = row["dominantFoot"]?.trim() || null;
    const injuryStatus = (row["injuryStatus"] as "fit" | "minor_risk" | "injured" | "recovery" | undefined) ?? "fit";

    try {
      // Upsert player by name (Chronojump re-exports same athletes)
      const [existingPlayer] = await db
        .select()
        .from(playersTable)
        .where(ilike(playersTable.name, name))
        .limit(1);

      let player: typeof playersTable.$inferSelect;
      if (existingPlayer) {
        [player] = await db
          .update(playersTable)
          .set({
            position,
            number: isNaN(number) ? existingPlayer.number : number,
            age: isNaN(age) ? existingPlayer.age : age,
            team,
            nationality,
            height: height?.toString(),
            weight: weight?.toString(),
            dominantFoot,
            lastTestDate: new Date().toISOString().split("T")[0],
          })
          .where(eq(playersTable.id, existingPlayer.id))
          .returning();
        updated++;
      } else {
        [player] = await db
          .insert(playersTable)
          .values({
            name,
            position,
            number: isNaN(number) ? 0 : number,
            age: isNaN(age) ? 22 : age,
            team,
            nationality,
            height: height?.toString(),
            weight: weight?.toString(),
            dominantFoot,
            injuryStatus,
            riskLevel: "low",
            lastTestDate: new Date().toISOString().split("T")[0],
          })
          .returning();
      }

      // Upsert neuromuscular data if any neuro columns were present
      const load = parseNum(row["load"]);
      const explode = parseNum(row["explode"]);
      const drive = parseNum(row["drive"]);

      if (load != null && explode != null && drive != null) {
        const { profileType, interpretation } = computeProfile(load, explode, drive);
        const neuroValues = {
          load: load.toString(),
          explode: explode.toString(),
          drive: drive.toString(),
          cmjHeight: parseNum(row["cmjHeight"])?.toString(),
          squatJump: parseNum(row["squatJump"])?.toString(),
          isometricForce: parseNum(row["isometricForce"])?.toString(),
          forcePerKg: parseNum(row["forcePerKg"])?.toString(),
          power: parseNum(row["power"])?.toString(),
          powerPerKg: parseNum(row["powerPerKg"])?.toString(),
          maxSpeed: parseNum(row["maxSpeed"])?.toString(),
          tToVmax: parseNum(row["tToVmax"])?.toString(),
          asymmetryIndex: parseNum(row["asymmetryIndex"])?.toString(),
          rsi: parseNum(row["rsi"])?.toString(),
          profileType,
          interpretation,
          testDate: new Date().toISOString().split("T")[0],
        };

        const [existingNeuro] = await db
          .select()
          .from(neuromuscularTable)
          .where(eq(neuromuscularTable.playerId, player.id))
          .limit(1);

        if (existingNeuro) {
          await db.update(neuromuscularTable).set(neuroValues).where(eq(neuromuscularTable.id, existingNeuro.id));
        } else {
          await db.insert(neuromuscularTable).values({ playerId: player.id, ...neuroValues });
        }

        // Update risk level based on asymmetry and neuro deficit
        const asymmetry = parseNum(row["asymmetryIndex"]);
        const rsiVal = parseNum(row["rsi"]);
        let riskLevel = "low";
        if ((asymmetry != null && asymmetry > 10) || (rsiVal != null && rsiVal < 1.0)) {
          riskLevel = "high";
        } else if ((asymmetry != null && asymmetry >= 7) || (rsiVal != null && rsiVal < 1.5)) {
          riskLevel = "medium";
        }
        await db.update(playersTable).set({ riskLevel, lastTestDate: new Date().toISOString().split("T")[0] }).where(eq(playersTable.id, player.id));
        player = { ...player, riskLevel };
      }

      importedPlayers.push(serializePlayer(player));
    } catch (err) {
      req.log.error({ err }, `Error importando fila ${i + 1}: ${name}`);
      errors.push(`Fila ${i + 1}: error al importar ${name}`);
    }
  }

  res.json(ImportPlayersCsvResponse.parse({
    imported: importedPlayers.length - updated,
    updated,
    errors,
    mappedColumns,
    players: importedPlayers,
  }));
});

router.post("/players", async (req, res): Promise<void> => {
  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [player] = await db.insert(playersTable).values({
    name: parsed.data.name,
    position: parsed.data.position,
    number: parsed.data.number,
    age: parsed.data.age,
    team: parsed.data.team,
    height: parsed.data.height?.toString(),
    weight: parsed.data.weight?.toString(),
    dominantFoot: parsed.data.dominantFoot,
    nationality: parsed.data.nationality,
    injuryStatus: parsed.data.injuryStatus ?? "fit",
    riskLevel: "low",
    // ── Campos extendidos (antes no se guardaban al crear) ────────────────
    playerType: parsed.data.playerType ?? "team",
    teamId: parsed.data.teamId ?? null,
    subteamId: parsed.data.subteamId ?? null,
    groupId: parsed.data.groupId ?? null,
    category: parsed.data.category ?? null,
    photoUrl: parsed.data.photoUrl ?? null,
    observations: parsed.data.observations ?? null,
    physicalStatus: parsed.data.physicalStatus ?? "available",
    birthDate: parsed.data.birthDate ?? null,
    birthPlace: parsed.data.birthPlace ?? null,
    preferredFoot: parsed.data.preferredFoot ?? null,
    contractEnd: parsed.data.contractEnd ?? null,
  }).returning();

  res.status(201).json(GetPlayerResponse.parse(serializePlayer(player)));
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!player) { res.status(404).json({ error: "Jugador no encontrado" }); return; }

  res.json(GetPlayerResponse.parse(serializePlayer(player)));
});

// ── PATCH /players/:id/status — registrado ANTES que /players/:id ───────────
router.patch("/players/:id/status", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const VALID_STATUSES = ["available", "injured", "doubt", "sanctioned", "recovery"];
  const { physicalStatus } = req.body as { physicalStatus?: string };
  if (!physicalStatus || !VALID_STATUSES.includes(physicalStatus)) {
    res.status(400).json({ error: `physicalStatus debe ser uno de: ${VALID_STATUSES.join(", ")}` });
    return;
  }

  const [player] = await db
    .update(playersTable)
    .set({ physicalStatus })
    .where(eq(playersTable.id, id))
    .returning();
  if (!player) { res.status(404).json({ error: "Jugador no encontrado" }); return; }

  // Devolver el jugador actualizado sin pasar por GetPlayerResponse.parse()
  // para evitar errores de validación en datos históricos con campos fuera de enum
  res.json(serializePlayer(player));
});

router.patch("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Partial<typeof playersTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.position !== undefined) updateData.position = parsed.data.position;
  if (parsed.data.number !== undefined) updateData.number = parsed.data.number;
  if (parsed.data.age !== undefined) updateData.age = parsed.data.age;
  if (parsed.data.team !== undefined) updateData.team = parsed.data.team;
  if (parsed.data.height !== undefined) updateData.height = parsed.data.height?.toString();
  if (parsed.data.weight !== undefined) updateData.weight = parsed.data.weight?.toString();
  if (parsed.data.dominantFoot !== undefined) updateData.dominantFoot = parsed.data.dominantFoot;
  if (parsed.data.nationality !== undefined) updateData.nationality = parsed.data.nationality;
  if (parsed.data.injuryStatus !== undefined) updateData.injuryStatus = parsed.data.injuryStatus;
  // ── Campos extendidos (antes no se actualizaban) ──────────────────────────
  if (parsed.data.physicalStatus !== undefined) updateData.physicalStatus = parsed.data.physicalStatus;
  if (parsed.data.playerType !== undefined) updateData.playerType = parsed.data.playerType;
  if (parsed.data.teamId !== undefined) updateData.teamId = parsed.data.teamId ?? null;
  if (parsed.data.subteamId !== undefined) updateData.subteamId = parsed.data.subteamId ?? null;
  if (parsed.data.groupId !== undefined) updateData.groupId = parsed.data.groupId ?? null;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category ?? null;
  if (parsed.data.photoUrl !== undefined) updateData.photoUrl = parsed.data.photoUrl ?? null;
  if (parsed.data.observations !== undefined) updateData.observations = parsed.data.observations ?? null;
  if (parsed.data.birthDate !== undefined) updateData.birthDate = parsed.data.birthDate ?? null;
  if (parsed.data.birthPlace !== undefined) updateData.birthPlace = parsed.data.birthPlace ?? null;
  if (parsed.data.preferredFoot !== undefined) updateData.preferredFoot = parsed.data.preferredFoot ?? null;
  if (parsed.data.contractEnd !== undefined) updateData.contractEnd = parsed.data.contractEnd ?? null;

  const [player] = await db.update(playersTable).set(updateData).where(eq(playersTable.id, params.data.id)).returning();
  if (!player) { res.status(404).json({ error: "Jugador no encontrado" }); return; }

  res.json(UpdatePlayerResponse.parse(serializePlayer(player)));
});

router.delete("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [player] = await db.delete(playersTable).where(eq(playersTable.id, params.data.id)).returning();
  if (!player) { res.status(404).json({ error: "Jugador no encontrado" }); return; }

  res.sendStatus(204);
});

export default router;
