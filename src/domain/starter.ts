export type StoragePlace = 'fridge' | 'room';
export type FeedingPace = 'usual' | 'longer';
export type Goal = 'maintain' | 'bake';
export type Activity = 'unknown' | 'quiet' | 'rising' | 'peak' | 'fallen';
export type Safety = 'unknown' | 'healthy' | 'hooch' | 'contamination' | 'mold' | 'pink' | 'rotten';
export const feedingRatios = [1, 2, 3, 4, 5] as const;
export type Ratio = (typeof feedingRatios)[number];
type Contamination = Extract<Safety, 'contamination' | 'mold' | 'pink' | 'rotten'>;
interface Starter {
  id: string;
  name: string;
  hydration: number;
  flour: string;
  storage: StoragePlace;
  storageChangedAt?: string;
  temperature: number;
  lastFedAt: string | null;
  createdAt: string;
}
export interface Feeding {
  id: string;
  fedAt: string;
  ratio: Ratio;
  starterG: number;
  waterG: number;
  flourG: number;
  temperature: number;
  storage: StoragePlace;
  notes: string;
  bakingCheck?: { at: string; safety: Extract<Safety, 'healthy' | 'hooch'> };
}
export interface Observation {
  id: string;
  observedAt: string;
  safety: Safety;
  activity: Activity;
  bubbles: boolean;
  peakHours: number | null;
  notes: string;
}
export type Recovery = { goal: Goal; confirmations: 0 | 1 } & (
  { stage: 'start' | 'feed' } | { stage: 'observe'; feedingId: string }
);
export interface AppData {
  version: 1;
  starter: Starter;
  recovery?: Recovery;
  contamination?: Contamination;
  feedings: Feeding[];
  observations: Observation[];
}
type StarterChanges = Partial<
  Pick<Starter, 'name' | 'hydration' | 'lastFedAt' | 'storage' | 'storageChangedAt'>
>;
export type JournalChange =
  | { type: 'starter'; changes: StarterChanges }
  | { type: 'feeding'; feeding: Feeding; recoveryStage?: 'start' | 'feed' }
  | { type: 'observation'; observation: Observation; checkedFeedingId?: string }
  | { type: 'recovery'; recovery?: Recovery; checkedFeedingId?: string }
  | { type: 'revise-feeding'; original: Feeding; feeding?: Omit<Feeding, 'bakingCheck'> }
  | { type: 'revise-observation'; original: Observation; observation?: Observation }
  | { type: 'reset' };

export function applyJournalChange(data: AppData, change: JournalChange): AppData {
  switch (change.type) {
    case 'starter':
      return { ...data, starter: { ...data.starter, ...change.changes } };
    case 'observation':
    case 'recovery': {
      const feedings = change.checkedFeedingId
        ? data.feedings.map((feeding) =>
            feeding.id === change.checkedFeedingId
              ? { ...feeding, bakingCheck: undefined }
              : feeding,
          )
        : data.feedings;
      if (change.type === 'recovery') return { ...data, feedings, recovery: change.recovery };
      return {
        ...data,
        feedings,
        observations: [change.observation, ...data.observations].sort(
          (a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt),
        ),
      };
    }
    case 'revise-feeding':
      return reviseFeeding(data, change.original, change.feeding);
    case 'revise-observation': {
      const { original, observation } = change;
      const stored = data.observations.find((entry) => entry.id === original.id);
      if (!sameEntry(stored, original)) return data;
      return {
        ...data,
        contamination:
          data.contamination ?? (isContaminated(original.safety) ? original.safety : undefined),
        observations: data.observations
          .flatMap((entry) =>
            entry.id !== original.id
              ? [entry]
              : observation
                ? [{ ...observation, id: original.id }]
                : [],
          )
          .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt)),
      };
    }
    case 'reset':
      return createData();
    case 'feeding': {
      const { feeding, recoveryStage } = change;
      const { starter, recovery } = data;
      const { latest, afterMove } = feedingTiming(starter, feeding.fedAt);
      return {
        ...data,
        starter: latest
          ? {
              ...starter,
              lastFedAt: feeding.fedAt,
              temperature: feeding.temperature,
              ...(afterMove && { storage: feeding.storage, storageChangedAt: feeding.fedAt }),
            }
          : starter,
        recovery:
          recovery && recoveryStage === recovery.stage && recoveryStage !== undefined
            ? { ...recovery, stage: 'observe', feedingId: feeding.id }
            : recovery && latest && recovery.stage !== 'start'
              ? { goal: recovery.goal, stage: 'feed', confirmations: 0 }
              : recovery,
        feedings: [feeding, ...data.feedings].sort(
          (a, b) => Date.parse(b.fedAt) - Date.parse(a.fedAt),
        ),
      };
    }
  }
}

function sameEntry(stored: Feeding | Observation | undefined, original: Feeding | Observation) {
  return stored === original || JSON.stringify(stored) === JSON.stringify(original);
}

function reviseFeeding(data: AppData, original: Feeding, changes?: Omit<Feeding, 'bakingCheck'>) {
  const stored = data.feedings.find((feeding) => feeding.id === original.id);
  if (!sameEntry(stored, original)) return data;

  const timingChanged =
    changes &&
    (changes.fedAt !== original.fedAt ||
      changes.starterG !== original.starterG ||
      changes.waterG !== original.waterG ||
      changes.flourG !== original.flourG);
  let replacement: Feeding | undefined;
  if (changes) {
    const { bakingCheck } = original;
    replacement = { ...changes, id: original.id };
    if (bakingCheck && changes.storage === 'room') {
      const active =
        Date.parse(bakingCheck.at) - Date.parse(original.fedAt) <
        firstStarterCheckHours * 3_600_000;
      replacement.bakingCheck = timingChanged
        ? {
            ...bakingCheck,
            at: bakingCheckAt(changes.fedAt, measuredFeedingRatio(changes), active),
          }
        : bakingCheck;
    }
  }
  const feedings = data.feedings
    .flatMap((feeding) =>
      feeding.id !== original.id ? [feeding] : replacement ? [replacement] : [],
    )
    .sort((a, b) => Date.parse(b.fedAt) - Date.parse(a.fedAt));

  const previous = latestFeeding(data);
  const next = feedings[0];
  const updatesLatest =
    previous &&
    (previous.id === original.id ||
      (replacement && Date.parse(replacement.fedAt) > Date.parse(previous.fedAt)));
  let starter = data.starter;
  if (updatesLatest) {
    starter = {
      ...starter,
      lastFedAt: next?.fedAt ?? null,
      temperature: next?.temperature ?? starter.temperature,
    };
    if (starter.storageChangedAt === previous.fedAt) {
      starter = {
        ...starter,
        storage: next?.storage ?? starter.storage,
        storageChangedAt: next?.fedAt,
      };
    }
    if (next && next.id !== previous.id && next.id !== replacement?.id) {
      feedings[0] = { ...next, bakingCheck: undefined };
    }
  }

  let recovery = data.recovery;
  const changedCycle =
    !changes ||
    timingChanged ||
    changes.storage !== original.storage ||
    changes.temperature !== original.temperature ||
    changes.ratio !== original.ratio;
  if (changedCycle && recovery && recovery.stage !== 'start') {
    const trackedCount = recovery.stage === 'observe' && recovery.confirmations === 1 ? 2 : 1;
    if (
      (recovery.stage === 'observe' && recovery.feedingId === original.id) ||
      data.feedings.slice(0, trackedCount).some((feeding) => feeding.id === original.id) ||
      feedings.slice(0, trackedCount).some((feeding) => feeding.id === original.id)
    ) {
      recovery = { goal: recovery.goal, stage: 'feed', confirmations: 0 };
    }
  }

  return { ...data, starter, recovery, feedings };
}

export function feedingBlock(data: AppData) {
  const contamination =
    data.contamination ?? data.observations.find((entry) => isContaminated(entry.safety))?.safety;
  return { contamination, blocked: Boolean(contamination) || data.starter.hydration !== 100 };
}

export interface DecisionInput {
  storage: StoragePlace;
  elapsedHours: number | null;
  safety: Safety;
  goal: Goal;
  activity: Activity;
  hydration: number;
  feedingPace?: FeedingPace;
}
export interface Protocol {
  id: string;
  band: string;
  title: string;
  ratio: Ratio;
  cycles: string;
  duration: string;
  recoveryTiming?: string;
  description: string;
  steps: string[];
}
export const bakingReadinessGuidance =
  'Antes de hornear, comprueba un crecimiento vigoroso y repetible, aproximadamente el doble de volumen, con abundantes burbujas. Úsala cerca de su pico: el tiempo depende de la proporción, la temperatura y la actividad del cultivo.';
export const bakingGrowthGuidance: Record<Activity, { title: string; text: string }> = {
  quiet: {
    title: 'Dale más tiempo',
    text: 'Marca el nivel, comprueba la temperatura y vuelve a mirar si empieza a subir. Evita encadenar refrescos si todavía no ves fermentación.',
  },
  rising: {
    title: 'Deja que siga creciendo',
    text: 'Espera a que alcance su mayor altura y comprueba que el crecimiento sea vigoroso y haya abundantes burbujas.',
  },
  peak: {
    title: 'Comprueba su fuerza antes de hacer pan',
    text: bakingReadinessGuidance,
  },
  fallen: {
    title: 'Ya ha pasado su pico',
    text: 'Si necesitas masa madre en su pico para el pan, planifica otro refresco y marca el nivel para seguir la subida.',
  },
  unknown: {
    title: 'Marca el nivel y vuelve a mirar',
    text: 'Observa cuánto sube y si aparecen burbujas para saber cómo va este refresco.',
  },
};
// Baking trial at about 26 °C: https://www.kingarthurbaking.com/blog/2025/03/13/sourdough-feeding-ratios
export const peakTimeReferences = [
  { ratio: 1, peak: 'Unas 4–6 h', doubling: 'Duplicó su volumen en unas 4 h.' },
  {
    ratio: 2,
    peak: 'Alrededor de 8 h',
    doubling: 'A las 4 h, casi había duplicado su volumen. A las 8 h, ya lo había duplicado.',
  },
] as const;

export const starterActivityLevels = ['active', 'sluggish', 'weak'] as const;
export type StarterActivityLevel = (typeof starterActivityLevels)[number];
export const starterActivityLabels = {
  active: 'Activa',
  sluggish: 'Poco activa',
  weak: 'Muy debilitada',
} satisfies Record<StarterActivityLevel, string>;

// Product reference ranges for mature starters at about 24–25 °C.
export const peakTimeAt24To25C = {
  1: { active: [4, 6], sluggish: [6, 12], weak: [12, 24] },
  2: { active: [6, 9], sluggish: [8, 14], weak: [14, 28] },
  3: { active: [7, 11], sluggish: [10, 18], weak: [16, 30] },
  4: { active: [9, 13], sluggish: [12, 20], weak: [18, 36] },
  5: { active: [10, 15], sluggish: [14, 24], weak: [20, 40] },
} satisfies Record<Ratio, Record<StarterActivityLevel, [number, number]>>;

export const firstStarterCheckHours = 12;

export function bakingCheckAt(fedAt: string, ratio: Ratio | undefined, active: boolean): string {
  const hours =
    active && ratio !== undefined ? peakTimeAt24To25C[ratio].active[0] : firstStarterCheckHours;
  return new Date(Date.parse(fedAt) + hours * 3_600_000).toISOString();
}

export function measuredFeedingRatio(feeding: Pick<Feeding, 'starterG' | 'waterG' | 'flourG'>) {
  const { starterG, waterG, flourG } = feeding;
  if (![starterG, waterG, flourG].every((amount) => Number.isFinite(amount) && amount > 0))
    return undefined;
  const exact = feedingRatios.find(
    (ratio) =>
      Math.abs(waterG - starterG * ratio) < 1e-8 && Math.abs(flourG - starterG * ratio) < 1e-8,
  );
  if (exact !== undefined) return exact;
  const total = starterG + waterG + flourG;
  if (!Number.isSafeInteger(Math.round(total * 10))) return undefined;
  return feedingRatios.find((ratio) => {
    const amounts = displayedAmounts(total, 0, ratio);
    return amounts.starter === starterG && amounts.water === waterG && amounts.flour === flourG;
  });
}

export function feedingTiming(starter: Starter, fedAt: string) {
  const time = Date.parse(fedAt);
  return {
    latest: !starter.lastFedAt || time >= Date.parse(starter.lastFedAt),
    afterMove:
      !starter.storageChangedAt ||
      Math.floor(time / 60_000) >= Math.floor(Date.parse(starter.storageChangedAt) / 60_000),
  };
}

export function latestFeeding(data: AppData) {
  return data.feedings.find((feeding) => feeding.fedAt === data.starter.lastFedAt);
}

export function atRoomSinceFeeding(starter: Starter, feeding: Feeding) {
  return (
    starter.storage === 'room' &&
    feeding.storage === 'room' &&
    (!starter.storageChangedAt || Date.parse(starter.storageChangedAt) <= Date.parse(feeding.fedAt))
  );
}

export function latestBakingFeeding(data: AppData) {
  const latest = latestFeeding(data);
  return latest?.bakingCheck && atRoomSinceFeeding(data.starter, latest) ? latest : undefined;
}

export const fridgeProtocols: Protocol[] = [
  {
    id: 'fridge-3',
    band: 'Hasta 3 días',
    title: 'Un refresco para despertar',
    ratio: 1,
    cycles: 'Reactivación con 1 refresco (orientativo)',
    duration: 'Según su actividad',
    description:
      'Si ha pasado pocos días en la nevera, dale un refresco a temperatura ambiente y observa si vuelve a subir y formar burbujas.',
    steps: [
      'Comprueba el aspecto y el olor.',
      'Mezcla 20 g de cultivo, 20 g de agua y 20 g de harina en un tarro limpio.',
      'Marca el nivel, cubre sin cerrar herméticamente y deja fermentar.',
      'Antes de usarla en tu receta, comprueba que duplica su volumen y úsala cerca del pico.',
    ],
  },
  {
    id: 'fridge-21',
    band: 'De 4 a 21 días',
    title: 'Volver a coger ritmo',
    ratio: 2,
    cycles: 'Uno o varios refrescos según su respuesta',
    duration: 'Según su actividad',
    description:
      'Empieza con un refresco a temperatura ambiente. Si ya crece con fuerza de forma regular, puede bastar con uno.',
    recoveryTiming:
      'El primer refresco puede tardar en mostrar burbujas o en subir. Si sigue creciendo, espera. Si al llegar al pico aún muestra poca actividad, vuelve a refrescar.',
    steps: [
      'Comprueba el aspecto y el olor.',
      'Refresca en proporción 1:2:2 y marca el nivel inicial.',
      'Observa si aparecen burbujas y cuánto sube antes de decidir si necesita otro refresco.',
      'Antes de usarla en tu receta, comprueba que vuelve a crecer con fuerza y de forma regular.',
    ],
  },
  {
    id: 'fridge-long',
    band: '22 días o más',
    title: 'Recuperar una muestra pequeña',
    ratio: 2,
    cycles: 'Según su respuesta',
    duration: 'Puede llevar varios días',
    recoveryTiming:
      'Haz una primera revisión entre las 12 y las 24 h. Busca burbujas o una subida sobre la marca. Si sigue creciendo, espera a que llegue al pico.',
    description:
      'Revisa todo el cultivo. Si está en buen estado, empieza con una muestra pequeña y observa cómo responde.',
    steps: [
      'Si ves moho, tonos rosas o naranjas, o notas un olor putrefacto, desecha todo el cultivo.',
      'Si está en buen estado, refresca 10–20 g de cultivo en proporción 1:2:2 y marca el nivel.',
      'Comprueba que el crecimiento se repite en los siguientes refrescos antes de usarla en tu receta.',
      'Si no recupera actividad tras varios días, considera empezar un cultivo nuevo.',
    ],
  },
];
export const roomProtocols: Protocol[] = [
  {
    id: 'room-12',
    band: 'Menos de 12 h',
    title: 'Escucha su momento',
    ratio: 1,
    cycles: 'Según maduración',
    duration: 'Observa el pico',
    description: 'Puede estar subiendo, en el pico o haber bajado ya. El reloj no basta.',
    steps: [
      'Comprueba que no hay señales de contaminación.',
      'Si está cerca del pico y tiene fuerza repetible, puedes usarla para pan.',
      'Si ya ha caído, refresca 1:1:1.',
      'Si aún está subiendo, espera y observa su evolución antes de alimentar.',
    ],
  },
  {
    id: 'room-24',
    band: '12–24 h',
    title: 'Renovar su alimento',
    ratio: 1,
    cycles: 'Según su respuesta',
    duration: 'Depende de su actividad',
    description: 'Comprueba su estado y vuelve a alimentar.',
    steps: [
      'Revisa aspecto y olor.',
      'Refresca 1:1:1 y marca el nivel.',
      'Comprueba el crecimiento y espera a que madure.',
      'Para panificar, busca un crecimiento vigoroso y consistente.',
    ],
  },
  {
    id: 'room-48',
    band: '24–48 h',
    title: 'Recuperar el ritmo',
    ratio: 2,
    cycles: 'Repetir si hace falta',
    duration: 'Depende de su actividad',
    description: 'Puede necesitar más de un ciclo para recuperar fuerza.',
    steps: [
      'Inspecciona todo el cultivo.',
      'Haz un primer refresco 1:2:2.',
      'Espera señales claras de fermentación y maduración.',
      'Si tiene poca fuerza, repite y reevalúa cuando madure.',
    ],
  },
  {
    id: 'room-72',
    band: '2–3 días',
    title: 'Empezar poco a poco',
    ratio: 2,
    cycles: 'Según su respuesta',
    duration: 'Sin plazo fijo',
    description: 'Empieza de forma prudente y adapta el siguiente paso a lo que observes.',
    steps: [
      'Inspecciona con cuidado antes de alimentar.',
      'Inicia con una muestra pequeña y proporción 1:2:2.',
      'Observa a temperatura estable; no alimentes solo porque hayan pasado unas horas.',
      'Si crece pero sigue lenta, espera a que madure y repite 1:2:2.',
    ],
  },
  {
    id: 'room-long',
    band: 'Más de 3 días',
    title: 'La inspección va primero',
    ratio: 2,
    cycles: 'Según seguridad y actividad',
    duration: 'Varios días si responde',
    description: 'Evalúa cuidadosamente la seguridad antes de intentar una recuperación.',
    steps: [
      'Comprueba si hay moho, tonos rosas o naranjas u olor putrefacto.',
      'Si aparece alguna de esas señales, desecha todo el cultivo.',
      'Solo si parece sano, inicia una recuperación prudente 1:2:2.',
      'A unos 25–26 °C, observa la subida y el máximo. Los ejemplos de horas de abajo son para un cultivo ya activo; el primer ciclo de recuperación puede tardar más. Si crece pero sigue lenta, espera a que madure y repite 1:2:2.',
      'Si todavía no hay fermentación, revisa temperatura y evolución antes de repetir. Si no recupera actividad suficiente tras varios días, considera empezar un cultivo nuevo.',
    ],
  },
];
export function applyFeedingPace(protocol: Protocol, pace: FeedingPace): Protocol {
  if (pace !== 'longer' || !['room-12', 'room-24'].includes(protocol.id)) return protocol;
  return {
    ...protocol,
    ratio: 2,
    description: `${protocol.description} Has elegido más margen hasta el pico con 1:2:2.`,
    steps: protocol.steps.map((step) => step.replaceAll('1:1:1', '1:2:2')),
  };
}
export function explainProtocolRatio(protocol: Protocol): string {
  if (protocol.id === 'fridge-3') {
    return 'Si tu masa madre estaba activa antes de guardarla y sigue sana, empieza con un refresco 1:1:1.';
  }
  if (['room-12', 'room-24'].includes(protocol.id)) {
    return protocol.ratio === 1
      ? 'Para un cultivo sano en rutina diaria, partimos de 1:1:1. Si aún está subiendo, espera a que madure antes de volver a alimentar.'
      : 'Has elegido 1:2:2 para aportar más alimento por parte de cultivo y tener más margen hasta el pico. No significa que el cultivo tenga más fuerza.';
  }
  return 'Este es un protocolo de recuperación. Partimos de 1:2:2 para aportar más alimento por parte de cultivo y renovar una mayor parte de la mezcla. Comprueba su recuperación observando el crecimiento en los siguientes ciclos.';
}
export function selectProtocol(
  storage: StoragePlace,
  hours: number,
  pace: FeedingPace = 'usual',
): Protocol {
  if (!Number.isFinite(hours) || hours < 0) throw new Error('Invalid elapsed time');
  if (storage === 'fridge') {
    const days = Math.floor(hours / 24);
    return fridgeProtocols[days <= 3 ? 0 : days <= 21 ? 1 : 2];
  }
  return applyFeedingPace(
    roomProtocols[hours < 12 ? 0 : hours < 24 ? 1 : hours <= 48 ? 2 : hours <= 72 ? 3 : 4],
    pace,
  );
}
export function isContaminated(safety: unknown): safety is Contamination {
  return (
    safety === 'contamination' || safety === 'mold' || safety === 'pink' || safety === 'rotten'
  );
}
type Recommendation = {
  kind: 'discard' | 'out-of-scope' | 'inspect' | 'wait' | 'unknown-date' | 'protocol';
  title: string;
  text: string;
  protocol?: Protocol;
  nextCondition?: string;
};
export function recommend(input: DecisionInput): Recommendation {
  if (isContaminated(input.safety))
    return {
      kind: 'discard',
      title: 'Es momento de empezar de nuevo',
      text: 'Desecha todo el cultivo. El moho, los tonos rosas o naranjas y el olor putrefacto son señales de contaminación. No rescates una parte aparentemente limpia.',
    };
  if (input.hydration !== 100)
    return {
      kind: 'out-of-scope',
      title: 'Esta guía necesita una adaptación',
      text: 'Las proporciones y los protocolos de Miga son para masa madre madura de trigo al 100 % de hidratación. No apliques este flujo a otro cultivo sin adaptarlo.',
    };
  if (input.safety === 'unknown')
    return {
      kind: 'inspect',
      title: 'Primero, una mirada al tarro',
      text: 'Comprueba el aspecto y el olor antes de elegir un refresco.',
    };
  if (input.activity === 'rising') return { kind: 'wait', ...bakingGrowthGuidance.rising };
  if (input.elapsedHours === null)
    return {
      kind: 'unknown-date',
      title: 'Fecha del último refresco desconocida',
      text: 'Indica la fecha del último refresco o registra uno nuevo.',
    };
  const protocol = selectProtocol(input.storage, input.elapsedHours, input.feedingPace);
  const nextCondition =
    input.goal === 'maintain'
      ? 'Deja que arranque la fermentación durante aproximadamente 1–2 h y refrigera con margen para crecer. Si estás recuperando un cultivo débil, confirma primero que vuelve a tener actividad.'
      : bakingReadinessGuidance;
  return {
    kind: 'protocol',
    title: protocol.title,
    text: protocol.description,
    protocol,
    nextCondition,
  };
}
export function calculate(recipe: number, reserve: number, ratio: Ratio) {
  if (
    ![recipe, reserve].every((n) => Number.isFinite(n) && n >= 0) ||
    !feedingRatios.includes(ratio) ||
    recipe + reserve <= 0
  )
    throw new Error('Invalid quantities');
  const total = recipe + reserve;
  const starter = total / (1 + 2 * ratio);
  return { starter, water: starter * ratio, flour: starter * ratio, total };
}
// Allocate decimal remainders so displayed tenths always add to the displayed total.
export function displayedAmounts(recipe: number, reserve: number, ratio: Ratio) {
  const raw = calculate(recipe, reserve, ratio);
  if (!Number.isSafeInteger(Math.round(raw.total * 10))) throw new Error('Invalid total');
  const values = [raw.starter, raw.water, raw.flour].map((n) => n * 10);
  const rounded = values.map(Math.floor);
  const missing = Math.round(raw.total * 10) - rounded.reduce((sum, n) => sum + n, 0);
  const order = values
    .map((n, i) => ({ i, remainder: n - rounded[i] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < missing; i++) rounded[order[i % 3].i]++;
  return {
    starter: rounded[0] / 10,
    water: rounded[1] / 10,
    flour: rounded[2] / 10,
    total: Math.round(raw.total * 10) / 10,
  };
}
export function displayedAmountsFromStarter(starter: number, ratio: Ratio) {
  const starterTenths = Math.round(starter * 10);
  const additionTenths = starterTenths * ratio;
  const totalTenths = starterTenths + 2 * additionTenths;
  if (starterTenths <= 0 || !feedingRatios.includes(ratio) || !Number.isSafeInteger(totalTenths))
    throw new Error('Invalid initial starter quantity');
  return {
    starter: starterTenths / 10,
    water: additionTenths / 10,
    flour: additionTenths / 10,
    total: totalTenths / 10,
  };
}
export function elapsedHours(date: string, now = Date.now()): number {
  const time = Date.parse(date);
  if (!Number.isFinite(time) || time > now) throw new Error('Invalid feeding date');
  return (now - time) / 3_600_000;
}
const feedingMaintenanceBands = [
  { throughHours: 72, status: 'recent' },
  { throughHours: 168, status: 'normal' },
  { throughHours: 336, status: 'overdue' },
  { throughHours: 720, status: 'possibly_sluggish' },
  { throughHours: 1440, status: 'recovery_recommended' },
] as const;

export function feedingMaintenanceStatus(lastFed: string | null, now = Date.now()) {
  if (!lastFed || !Number.isFinite(Date.parse(lastFed))) return 'unknown';
  const hours = elapsedHours(lastFed, now);
  return (
    feedingMaintenanceBands.find(({ throughHours }) => hours <= throughHours)?.status ??
    'long_term_neglect'
  );
}

export const feedingMaintenanceMessages = {
  recent: {
    title: 'Refresco reciente',
    text: 'Si vas a hacer pan, refresca la masa madre y comprueba cómo crece.',
  },
  normal: {
    title: 'Mantenimiento normal',
    text: 'Puedes refrescarla para mantenerla o para preparar pan.',
  },
  overdue: {
    title: 'Conviene refrescar',
    text: 'Dale un refresco y observa cómo crece.',
  },
  possibly_sluggish: {
    title: 'Posible pérdida de vigor',
    text: 'Dale un refresco y observa su respuesta. Si crece lentamente, puede necesitar otro.',
  },
  recovery_recommended: {
    title: 'Recuperación recomendada',
    text: 'Si el aspecto y el aroma son normales, refresca una muestra y observa cómo responde.',
  },
  long_term_neglect: {
    title: 'Mucho tiempo desde el último refresco',
    text: 'Comprueba el aspecto y el aroma antes de intentar recuperarla.',
  },
  unknown: {
    title: 'Fecha del último refresco desconocida',
    text: 'Puedes indicar la fecha o registrar un refresco nuevo.',
  },
};

export function observedStarterActivity(
  data: AppData,
  lastFed: string,
  storage: StoragePlace,
  now = Date.now(),
): StarterActivityLevel | 'unknown' {
  const feeding = latestFeeding(data);
  if (
    !feeding ||
    feeding.storage !== 'room' ||
    storage !== data.starter.storage ||
    feeding.temperature < 24 ||
    feeding.temperature > 25
  )
    return 'unknown';

  const fedAt = Date.parse(feeding.fedAt);
  if (Math.floor(Date.parse(lastFed) / 60_000) !== Math.floor(fedAt / 60_000)) return 'unknown';
  if (storage === 'fridge' && now - fedAt > feedingMaintenanceBands[2].throughHours * 3_600_000)
    return 'unknown';

  const storageChangedAt = Date.parse(data.starter.storageChangedAt ?? '');
  const observation = data.observations.find((entry) => {
    const observedAt = Date.parse(entry.observedAt);
    return (
      observedAt > fedAt &&
      observedAt <= now &&
      (!Number.isFinite(storageChangedAt) || observedAt >= storageChangedAt)
    );
  });
  if (
    !observation ||
    isContaminated(observation.safety) ||
    (observation.activity !== 'peak' && observation.activity !== 'fallen') ||
    !observation.bubbles ||
    observation.peakHours === null ||
    observation.peakHours > (Date.parse(observation.observedAt) - fedAt) / 3_600_000
  )
    return 'unknown';

  const ratio = measuredFeedingRatio(feeding);
  if (ratio === undefined) return 'unknown';
  const { active, sluggish } = peakTimeAt24To25C[ratio];
  if (observation.peakHours >= active[0] && observation.peakHours <= active[1]) return 'active';
  if (observation.peakHours > active[1] && observation.peakHours <= sluggish[1]) return 'sluggish';
  return 'unknown';
}

export function createData(now = new Date()): AppData {
  return {
    version: 1,
    starter: {
      id: 'my-starter',
      name: 'Mi masa madre',
      flour: 'Trigo',
      hydration: 100,
      storage: 'fridge',
      temperature: 24,
      lastFedAt: null,
      createdAt: now.toISOString(),
    },
    feedings: [],
    observations: [],
  };
}
