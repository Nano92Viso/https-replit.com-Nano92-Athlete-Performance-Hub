export type Regime = "con-exc" | "con" | "iso";

export type BlockKey =
  | "main"
  | "accessory1" | "accessory2" | "accessory3"
  | "plyometrics"
  | "anterior" | "posterior" | "adductor"
  | "pnf" | "core"
  | "deficit";

export type SessionTypeKey =
  | "explosive-strength"
  | "power-strength"
  | "endurance-strength"
  | "active-recovery";

export interface CatalogExercise {
  id: string;
  name: string;
  regime: Regime;
  blocks: BlockKey[];
  sessionTypes: SessionTypeKey[];
  defaultSets: number;
  defaultReps?: number;
  defaultDurationSec?: number;
  defaultRestSec: number;
  observations?: string;
  coachingCues?: string[];
  videoUrl?: string;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO — Solo ejercicios de Ejercicios.pdf
// ─────────────────────────────────────────────────────────────────────────────

export const EXERCISE_CATALOG: CatalogExercise[] = [

  // ── EJERCICIO PRINCIPAL ──────────────────────────────────────────────────

  {
    id: "sentadilla-salto",
    name: "Sentadilla con salto",
    regime: "con-exc",
    blocks: ["main", "plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 4, defaultReps: 5, defaultRestSec: 180,
    coachingCues: ["Descenso controlado", "Extensión máxima en el salto", "Aterrizaje suave sobre antepié"],
    active: true,
  },
  {
    id: "media-sentadilla-salto",
    name: "1/2 sentadilla con salto",
    regime: "con-exc",
    blocks: ["main", "plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 4, defaultReps: 5, defaultRestSec: 180,
    coachingCues: ["Flexión de rodilla hasta 90°", "Extensión explosiva hacia arriba", "Core activo en el salto"],
    active: true,
  },
  {
    id: "sentadilla-salto-1p",
    name: "Sentadilla con salto a 1 pierna",
    regime: "con-exc",
    blocks: ["main", "plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 3, defaultReps: 5, defaultRestSec: 180,
    coachingCues: ["Equilibrio sobre pierna de trabajo", "Extensión máxima en el despegue", "Aterrizaje controlado"],
    active: true,
  },
  {
    id: "tiron-mas-salto",
    name: "Tirón más salto",
    regime: "con-exc",
    blocks: ["main", "plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 4, defaultReps: 4, defaultRestSec: 180,
    coachingCues: ["Triple extensión explosiva", "Tirón sincronizado con extensión de cadera", "Alta demanda de coordinación"],
    active: true,
  },
  {
    id: "sentadilla",
    name: "Sentadilla",
    regime: "con-exc",
    blocks: ["main", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 4, defaultReps: 6, defaultRestSec: 150,
    coachingCues: ["Profundidad mínima paralela", "Rodillas alineadas con punta del pie", "Pecho arriba, core activo"],
    active: true,
  },
  {
    id: "media-sentadilla",
    name: "1/2 sentadilla",
    regime: "con-exc",
    blocks: ["main", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 4, defaultReps: 6, defaultRestSec: 150,
    coachingCues: ["Flexión hasta 90°", "Rodillas sobre punta del pie", "Sin compensación de tronco"],
    active: true,
  },
  {
    id: "sentadilla-concentrica",
    name: "Sentadilla concéntrica",
    regime: "con",
    blocks: ["main"],
    sessionTypes: ["power-strength"],
    defaultSets: 4, defaultReps: 4, defaultRestSec: 180,
    coachingCues: ["Bajada excéntrica asistida o desde cajón", "Fase concéntrica máxima explosividad", "Alta carga relativa"],
    observations: "Solo fase concéntrica — útil para estímulo de alta potencia",
    active: true,
  },
  {
    id: "hip-thrust",
    name: "Hip thrust",
    regime: "con-exc",
    blocks: ["main"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 4, defaultReps: 6, defaultRestSec: 150,
    coachingCues: ["Empuje de talones", "Pelvis neutra en punto alto", "No hiperextender lumbar"],
    active: true,
  },
  {
    id: "split-bulgaro",
    name: "Split búlgaro",
    regime: "con-exc",
    blocks: ["main", "accessory1", "accessory2", "accessory3"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 3, defaultReps: 6, defaultRestSec: 150,
    coachingCues: ["Pie trasero en elevación 40-50 cm", "Rodilla delantera no sobrepasa punta", "Torso vertical"],
    active: true,
  },
  {
    id: "clean-from-hang",
    name: "Clean (from hang)",
    regime: "con-exc",
    blocks: ["main"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 4, defaultReps: 3, defaultRestSec: 180,
    coachingCues: ["Extensión triple desde la cadera", "Codos altos en la recepción", "Alta demanda técnica — supervisión necesaria"],
    observations: "Alta demanda técnica. Requiere supervisión específica",
    active: true,
  },
  {
    id: "peso-muerto",
    name: "Peso muerto",
    regime: "con-exc",
    blocks: ["main"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 4, defaultReps: 4, defaultRestSec: 180,
    coachingCues: ["Barra pegada al cuerpo", "Extensión simultánea rodilla-cadera", "Escápulas retraídas"],
    active: true,
  },
  {
    id: "peso-muerto-1p",
    name: "Peso muerto 1 pierna",
    regime: "con-exc",
    blocks: ["main", "accessory1", "accessory2", "accessory3", "posterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 6, defaultRestSec: 120,
    coachingCues: ["Pelvis horizontal en todo momento", "Pierna posterior alineada con torso", "Control excéntrico 2-3 seg"],
    active: true,
  },

  // ── ACCESORIOS ────────────────────────────────────────────────────────────

  {
    id: "zancada-saltada",
    name: "Zancada saltada",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 3, defaultReps: 6, defaultRestSec: 120,
    coachingCues: ["Salto alternado de pierna", "Core activo para estabilizar el vuelo", "Aterrizaje suave"],
    active: true,
  },
  {
    id: "subida-banco-1p",
    name: "Subida a banco 1 pierna",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Altura 40-50 cm", "Empuje de talón de la pierna de trabajo", "No impulso con pierna trasera"],
    active: true,
  },
  {
    id: "sentadilla-1p",
    name: "Sentadilla a 1 pierna",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 6, defaultRestSec: 120,
    coachingCues: ["Equilibrio sobre pierna de apoyo", "Rodilla alineada sobre punta del pie", "Profundidad controlada"],
    active: true,
  },
  {
    id: "zancadas",
    name: "Zancadas",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Paso largo hacia adelante", "Rodilla trasera cerca del suelo sin tocarlo", "Torso vertical"],
    active: true,
  },
  {
    id: "zancadas-arriba-isquio",
    name: "Zancadas arriba isquio",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "posterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Énfasis en fase excéntrica de isquio", "Paso amplio", "Carga en cadena posterior"],
    active: true,
  },
  {
    id: "tijeras-isquio",
    name: "Tijeras de isquio",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "posterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Movimiento de tijera alternado", "Activación preferente de isquiotibiales", "Control excéntrico"],
    active: true,
  },
  {
    id: "isquio-tumbado-1p",
    name: "Isquio tumbado a 1 pierna dinámico",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "posterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Tumbado boca abajo", "Curl de isquio unilateral", "Pelvis en contacto con banco"],
    active: true,
  },
  {
    id: "split",
    name: "Split",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Posición fija delantera-trasera", "Descenso controlado de rodilla trasera", "Torso erguido"],
    active: true,
  },
  {
    id: "split-diagonal",
    name: "Split diagonal",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "anterior"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 90,
    coachingCues: ["Variante con orientación diagonal", "Mayor demanda de estabilizadores de cadera", "Control de la rodilla en todo el rango"],
    active: true,
  },
  {
    id: "alcances-1p",
    name: "Alcances 1 pierna",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 75,
    coachingCues: ["Pierna de apoyo semi-flexionada", "Alcanzar en múltiples direcciones", "Control de pelvis"],
    active: true,
  },
  {
    id: "gluten-con-goma",
    name: "Glúteo con goma",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 12, defaultRestSec: 75,
    coachingCues: ["Goma en rodillas o tobillo", "Abducción o extensión de cadera", "Pelvis estable"],
    active: true,
  },
  {
    id: "saltabilidad-gemelo",
    name: "Saltabilidad gemelo",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "deficit"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 75,
    coachingCues: ["Saltos de tobillo a baja altura", "Ciclo rápido de contacto", "Mínimo tiempo de suelo"],
    active: true,
  },
  {
    id: "gemelo-1p",
    name: "Gemelo a 1 pierna",
    regime: "con-exc",
    blocks: ["accessory1", "accessory2", "accessory3", "deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 12, defaultRestSec: 75,
    coachingCues: ["Rango completo de tobillo", "Fase excéntrica controlada 3 seg", "Puede hacerse con déficit en escalón"],
    active: true,
  },
  {
    id: "caida-banco-amortiguar",
    name: "Caída desde banco y amortiguar",
    regime: "con-exc",
    blocks: ["accessory1", "plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 3, defaultReps: 5, defaultRestSec: 120,
    coachingCues: ["Caída controlada sobre antepié", "Absorción de impacto con rodillas y cadera", "Posición atlética al finalizar"],
    active: true,
  },

  // ── PLIOMETRÍA / TÉCNICA CARRERA ──────────────────────────────────────────

  {
    id: "carrera-saltada",
    name: "Carrera saltada",
    regime: "con-exc",
    blocks: ["plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 2, defaultReps: 5, defaultRestSec: 120,
    coachingCues: ["Pasos exagerados con vuelo", "Extensión completa de cadera en cada zancada", "Brazos activos"],
    active: true,
  },
  {
    id: "drop-jump",
    name: "Drop jump",
    regime: "con-exc",
    blocks: ["plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 2, defaultReps: 5, defaultRestSec: 120,
    coachingCues: ["Caída sobre antepié", "Tiempo de contacto mínimo", "Extensión máxima vertical"],
    observations: "Alta demanda tendinosa. Progresión obligatoria",
    active: true,
  },
  {
    id: "split-saltado",
    name: "Split saltado",
    regime: "con-exc",
    blocks: ["plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 2, defaultReps: 5, defaultRestSec: 120,
    coachingCues: ["Alternancia explosiva de piernas en el aire", "Core activo para estabilizar", "Extensión completa en cada salto"],
    active: true,
  },
  {
    id: "atacar-cajon",
    name: "Atacar el cajón",
    regime: "con-exc",
    blocks: ["plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 2, defaultReps: 5, defaultRestSec: 120,
    coachingCues: ["Golpeo rápido del pie sobre el cajón", "Mínimo tiempo de contacto", "Tobillo rígido"],
    active: true,
  },
  {
    id: "acelerar-frenar",
    name: "Acelerar y frenar de golpe",
    regime: "con-exc",
    blocks: ["plyometrics"],
    sessionTypes: ["explosive-strength", "power-strength"],
    defaultSets: 2, defaultReps: 4, defaultRestSec: 150,
    coachingCues: ["Aceleración máxima 10-15 m", "Freno brusco en 1-2 pasos", "Centro de gravedad bajo en la frenada"],
    active: true,
  },

  // ── CADENA ANTERIOR (Fuerza Resistencia) ──────────────────────────────────

  // (subida-banco-1p, sentadilla-1p, zancadas, split, split-diagonal ya asignadas arriba con anterior)

  // ── CADENA POSTERIOR (Fuerza Resistencia) ─────────────────────────────────

  // (tijeras-isquio, isquio-tumbado-1p, peso-muerto-1p, zancadas-arriba-isquio ya asignadas)

  // ── ADUCTOR ───────────────────────────────────────────────────────────────

  {
    id: "aductor-balon",
    name: "Aductor con balón",
    regime: "iso",
    blocks: ["adductor"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 20, defaultRestSec: 75,
    coachingCues: ["Balón medicinal entre rodillas", "Compresión sostenida isométrica", "Pelvis neutra"],
    active: true,
  },
  {
    id: "aductor-manos-rodillas",
    name: "Aductor manos entre rodillas",
    regime: "con-exc",
    blocks: ["adductor"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 12, defaultRestSec: 75,
    coachingCues: ["Manos ofrecen resistencia manual", "Rango completo de aducción", "Control en la apertura"],
    active: true,
  },
  {
    id: "aductor-gomas",
    name: "Aductor gomas",
    regime: "con-exc",
    blocks: ["adductor"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 12, defaultRestSec: 75,
    coachingCues: ["Goma elástica en tobillo", "Aducción hacia la línea media", "Control excéntrico en la apertura"],
    active: true,
  },

  // ── PNF ───────────────────────────────────────────────────────────────────

  {
    id: "pnf-isquio",
    name: "PNF isquio",
    regime: "iso",
    blocks: ["pnf"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 8, defaultRestSec: 60,
    coachingCues: ["Tensión isométrica 6-8 seg", "Relajación 2 seg", "Ampliar rango en cada ciclo"],
    active: true,
  },
  {
    id: "pnf-aductores",
    name: "PNF aductores",
    regime: "iso",
    blocks: ["pnf"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 8, defaultRestSec: 60,
    coachingCues: ["Contracción isométrica en posición de apertura", "Relajar y avanzar el rango", "Progresión gradual"],
    active: true,
  },
  {
    id: "pnf-abductores",
    name: "PNF abductores",
    regime: "iso",
    blocks: ["pnf"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 8, defaultRestSec: 60,
    coachingCues: ["Tensión en posición de abducción", "Relajar y ampliar en cada serie", "Patrón diagonal si es posible"],
    active: true,
  },

  // ── CORE ──────────────────────────────────────────────────────────────────

  {
    id: "press-pallof-anterior",
    name: "Press pallof anterior",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 60,
    coachingCues: ["Cuerpo perpendicular a la polea", "Resistir la rotación en extensión de brazos", "Extensión lenta y controlada"],
    active: true,
  },
  {
    id: "press-pallof-posterior",
    name: "Press pallof posterior",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 60,
    coachingCues: ["Variante posterior — polea por encima", "Resistir la rotación en la extensión", "Core máximo activado"],
    active: true,
  },
  {
    id: "press-pallof-lateral",
    name: "Press pallof lateral",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 60,
    coachingCues: ["Extensión lateral de brazos", "Resistir la tracción lateral", "Hombros y cadera alineados"],
    active: true,
  },
  {
    id: "plancha-4-apoyos",
    name: "Plancha 4 apoyos",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 40, defaultRestSec: 60,
    coachingCues: ["Cuerpo recto como tabla", "Core activado sin aguantar la respiración", "Mirada al suelo, cuello neutro"],
    active: true,
  },
  {
    id: "plancha-2-apoyos",
    name: "Plancha 2 apoyos",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 30, defaultRestSec: 60,
    coachingCues: ["Progresión de plancha — 2 puntos de apoyo", "Mayor demanda de anti-rotación", "Cuerpo en línea recta"],
    active: true,
  },
  {
    id: "plancha-lateral",
    name: "Plancha lateral",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 30, defaultRestSec: 60,
    coachingCues: ["Cuerpo en línea recta lateral", "Cadera elevada sin rotación", "Respiración continua"],
    active: true,
  },
  {
    id: "plancha-lateral-golpeo",
    name: "Plancha lateral + golpeo",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 60,
    coachingCues: ["Plancha lateral estable", "Golpeo rítmico con el brazo libre", "Pelvis no oscila"],
    active: true,
  },
  {
    id: "plancha-boca-arriba",
    name: "Plancha boca arriba",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 30, defaultRestSec: 60,
    coachingCues: ["Posición supina, caderas elevadas", "Core contraído, glúteos activos", "Cuerpo en línea"],
    active: true,
  },
  {
    id: "plancha-boca-arriba-1p",
    name: "Plancha boca arriba 1 pierna",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultDurationSec: 20, defaultRestSec: 60,
    coachingCues: ["Una pierna elevada, pelvis horizontal", "Mayor demanda de glúteo y core", "No dejar caer la cadera del lado elevado"],
    active: true,
  },
  {
    id: "abdominales-excentrico",
    name: "Abdominales en excéntrico",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 8, defaultRestSec: 60,
    coachingCues: ["Descenso excéntrico lento 3-4 seg", "Control total de la columna", "Sin rebote en la posición baja"],
    observations: "Carácter excéntrico marcable cada 15 días",
    active: true,
  },
  {
    id: "dead-bug",
    name: "Dead bug",
    regime: "iso",
    blocks: ["core"],
    sessionTypes: ["endurance-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 60,
    coachingCues: ["Lumbar en contacto con el suelo en todo momento", "Extensión simultánea brazo-pierna opuestos", "Espiración en la extensión"],
    active: true,
  },

  // ── DÉFICITS PARTICULARES ─────────────────────────────────────────────────

  {
    id: "caminar-puntillas",
    name: "Caminar de puntillas",
    regime: "con-exc",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 20, defaultRestSec: 60,
    coachingCues: ["Elevación máxima de talones", "Paso lento y controlado", "Core activo"],
    active: true,
  },
  {
    id: "puente-gluteos",
    name: "Puente glúteos",
    regime: "iso",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultDurationSec: 20, defaultRestSec: 60,
    coachingCues: ["Pies planos en suelo", "Pelvis neutra en punto alto", "Isométrico sostenido"],
    active: true,
  },
  {
    id: "puente-gluteos-1p",
    name: "Puente glúteos a 1 pierna",
    regime: "iso",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultDurationSec: 15, defaultRestSec: 60,
    coachingCues: ["Una pierna elevada", "Pelvis horizontal sin rotación", "Glúteo máxima contracción"],
    active: true,
  },
  {
    id: "sentadilla-lateral",
    name: "Sentadilla lateral",
    regime: "iso",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultDurationSec: 20, defaultRestSec: 60,
    coachingCues: ["Apertura lateral de una pierna", "Isométrico en posición de squat lateral", "Rodilla alineada con punta del pie"],
    active: true,
  },
  {
    id: "sentadilla-diagonal",
    name: "Sentadilla diagonal",
    regime: "iso",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultDurationSec: 20, defaultRestSec: 60,
    coachingCues: ["Variante diagonal de la sentadilla lateral", "Mayor demanda de aductor", "Pelvis estable"],
    active: true,
  },
  {
    id: "movilidad-cadera-tobillo",
    name: "Movilidad de cadera y tobillo",
    regime: "con-exc",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultReps: 10, defaultRestSec: 60,
    coachingCues: ["Rango completo de movimiento", "Movilidad articular activa", "Sin compensaciones de columna"],
    active: true,
  },
  {
    id: "sentadilla-pared",
    name: "Sentadilla en pared",
    regime: "iso",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultDurationSec: 30, defaultRestSec: 60,
    coachingCues: ["Espalda totalmente apoyada en la pared", "Rodillas a 90°", "Isométrico mantenido"],
    active: true,
  },
  {
    id: "sentadilla-pared-1p",
    name: "Sentadilla en pared a 1 pierna",
    regime: "iso",
    blocks: ["deficit"],
    sessionTypes: ["explosive-strength", "power-strength", "endurance-strength"],
    defaultSets: 3, defaultDurationSec: 20, defaultRestSec: 75,
    coachingCues: ["Una pierna en isométrico", "Mayor demanda de cuádriceps y glúteo", "Progresión de sentadilla en pared"],
    active: true,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getByBlock(block: BlockKey, sessionType?: SessionTypeKey): CatalogExercise[] {
  return EXERCISE_CATALOG.filter(
    ex =>
      ex.active &&
      ex.blocks.includes(block) &&
      (!sessionType || ex.sessionTypes.includes(sessionType))
  );
}

export function getById(id: string): CatalogExercise | undefined {
  return EXERCISE_CATALOG.find(ex => ex.id === id);
}

// ── Volume rules ────────────────────────────────────────────────────────────

export interface VolumeRule {
  block: BlockKey | "isometric" | "activation" | "plyoSeries" | "plyoReps";
  maxSets?: number;
  maxReps?: number;
  maxExercises?: number;
  warningLabel: string;
}

export const VOLUME_RULES: Record<SessionTypeKey, VolumeRule[]> = {
  "explosive-strength": [
    { block: "isometric",   maxSets: 2,  warningLabel: "Isométricos: máximo 2 series" },
    { block: "activation",  maxReps: 4,  warningLabel: "Activación: máximo 4 repeticiones" },
    { block: "plyoSeries",  maxSets: 2,  warningLabel: "Pliometría/TC: máximo 2 series" },
    { block: "plyoReps",    maxReps: 5,  warningLabel: "Pliometría/TC: máximo 5 repeticiones" },
    { block: "main",        maxSets: 4,  warningLabel: "Ejercicio principal: máximo 4 series" },
    { block: "accessory1",  maxSets: 3,  warningLabel: "Accesorio 1: máximo 3 series" },
    { block: "accessory2",  maxSets: 3,  warningLabel: "Accesorio 2: máximo 3 series" },
    { block: "accessory3",  maxSets: 3,  warningLabel: "Accesorio 3: máximo 3 series" },
    { block: "deficit",     maxSets: 3,  warningLabel: "Déficits: máximo 3 series" },
  ],
  "power-strength": [
    { block: "isometric",   maxSets: 2,  warningLabel: "Isométricos: máximo 2 series" },
    { block: "activation",  maxReps: 4,  warningLabel: "Activación: máximo 4 repeticiones" },
    { block: "plyoSeries",  maxSets: 2,  warningLabel: "Pliometría/TC: máximo 2 series" },
    { block: "plyoReps",    maxReps: 5,  warningLabel: "Pliometría/TC: máximo 5 repeticiones" },
    { block: "main",        maxSets: 6,  warningLabel: "Ejercicio principal: máximo 6 series (Potencia)" },
    { block: "accessory1",  maxSets: 3,  warningLabel: "Accesorio: máximo 3 series (solo 1 accesorio en Potencia)" },
    { block: "deficit",     maxSets: 3,  warningLabel: "Déficits: máximo 3 series" },
  ],
  "endurance-strength": [
    { block: "isometric",   maxSets: 2,  warningLabel: "Isométricos: máximo 2 series" },
    { block: "activation",  maxReps: 4,  warningLabel: "Activación: máximo 4 repeticiones" },
    { block: "anterior",    maxSets: 3,  warningLabel: "Cadena anterior: máximo 3 series" },
    { block: "anterior",    maxReps: 8,  warningLabel: "Cadena anterior: máximo 8 repeticiones" },
    { block: "posterior",   maxSets: 3,  warningLabel: "Cadena posterior: máximo 3 series" },
    { block: "posterior",   maxReps: 8,  warningLabel: "Cadena posterior: máximo 8 repeticiones" },
    { block: "adductor",    maxSets: 3,  warningLabel: "Aductor: máximo 3 series" },
    { block: "adductor",    maxReps: 8,  warningLabel: "Aductor: máximo 8 repeticiones" },
    { block: "core",        maxExercises: 4, warningLabel: "Core: máximo 4 ejercicios en la secuencia" },
  ],
  "active-recovery": [],
};
