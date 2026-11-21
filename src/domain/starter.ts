export type StoragePlace = 'fridge' | 'room';
export type FeedingPace = 'usual' | 'longer';
export type Goal = 'maintain' | 'bake';
export type Activity = 'unknown' | 'quiet' | 'rising' | 'peak' | 'fallen';
export type Safety = 'unknown' | 'healthy' | 'hooch' | 'contamination' | 'mold' | 'pink' | 'rotten';
export type Ratio = 1 | 2 | 3 | 5;
export interface Starter {
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
  rise: number | null;
  bubbles: boolean;
  aroma: string;
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

export function feedingBlock(data: AppData) {
  const contamination = data.observations.find((entry) => isContaminated(entry.safety))?.safety;
  return { contamination, blocked: Boolean(contamination) || data.starter.hydration !== 100 };
}

export interface DecisionInput {
  storage: StoragePlace;
  elapsedHours: number;
  safety: Safety;
  goal: Goal;
  activity: Activity;
  temperature: number;
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
export const peakTimeReferences = [
  { ratio: 1, peak: 'Unas 4–6 h', doubling: 'En el ejemplo había duplicado alrededor de las 4 h.' },
  {
    ratio: 2,
    peak: 'Alrededor de 8 h',
    doubling:
      'En el ejemplo estaba cerca de duplicar a las 4 h; a las 8 h había duplicado y estaba en el pico.',
  },
] as const;

export const peakTimeAt24C = {
  1: { label: '4–6 h', checkAfterHours: 4 },
  2: { label: '5–6 h', checkAfterHours: 5 },
  3: { label: '6½–9 h', checkAfterHours: 6.5 },
  5: { label: 'unas 10 h', checkAfterHours: 10 },
} satisfies Record<Ratio, { label: string; checkAfterHours: number }>;

export function bakingCheckAt(fedAt: string, ratio: Ratio, active: boolean): string {
  const hours = active ? peakTimeAt24C[ratio].checkAfterHours : 12;
  return new Date(Date.parse(fedAt) + hours * 3_600_000).toISOString();
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
    band: '0–3 días',
    title: 'Un refresco para despertar',
    ratio: 2,
    cycles: '1 refresco orientativo',
    duration: '6–12 h orientativas',
    description:
      'Si ha pasado pocos días en la nevera, dale un refresco a temperatura ambiente y observa si vuelve a subir y formar burbujas.',
    steps: [
      'Comprueba el aspecto y el olor.',
      'Mezcla 20 g de cultivo, 40 g de agua y 40 g de harina en un tarro limpio.',
      'Marca el nivel, cubre sin cerrar herméticamente y deja fermentar.',
      'Para hornear, confirma que duplica y alcanza el pico con vigor.',
    ],
  },
  {
    id: 'fridge-7',
    band: '4–7 días',
    title: 'Volver a coger ritmo',
    ratio: 2,
    cycles: '1–2 refrescos orientativos',
    duration: '12–24 h orientativas',
    description: 'Es normal que necesite un poco de tiempo para recuperar su ritmo.',
    steps: [
      'Comprueba el aspecto y el olor.',
      'Refresca en proporción 1:2:2 y marca el nivel inicial.',
      'Espera actividad clara o el pico antes de volver a alimentar.',
      'Si sigue lenta, repite 1:2:2 cuando madure y vuelve a observar.',
    ],
  },
  {
    id: 'fridge-14',
    band: '8–14 días',
    title: 'Despertar con paciencia',
    ratio: 2,
    cycles: '2–3 refrescos orientativos',
    duration: '24–36 h orientativas',
    description: 'El primer ciclo puede ser lento. La actividad decide cuándo continuar.',
    steps: [
      'Inspecciona el cultivo antes de alimentarlo.',
      'Refresca 1:2:2 y mantén una temperatura estable.',
      'No vuelvas a refrescar antes de observar fermentación.',
      'Repite según maduración hasta lograr un crecimiento fuerte y repetible.',
    ],
  },
  {
    id: 'fridge-21',
    band: '15–21 días',
    title: 'Recuperar su fuerza',
    ratio: 2,
    cycles: '2–4 refrescos orientativos',
    duration: '24–48 h orientativas',
    description: 'Dale un entorno templado y observa sin prisas.',
    steps: [
      'Inspecciona y pasa 20 g a un tarro limpio.',
      'Añade 40 g de agua y 40 g de harina. Puedes sustituir parte de la harina por integral o centeno.',
      'Espera actividad; el primer ciclo podría tardar hasta 24 h.',
      'Haz los siguientes refrescos cuando madure, hasta recuperar fuerza.',
    ],
  },
  {
    id: 'fridge-30',
    band: '22–30 días',
    title: 'Una recuperación suave',
    ratio: 2,
    cycles: 'Según su respuesta',
    duration: '2–4 días o más',
    description:
      'Empieza con una muestra pequeña y alimento nuevo en proporción 1:2:2. Observa su respuesta antes de repetir.',
    steps: [
      'Inspecciona minuciosamente todo el cultivo.',
      'Refresca 10–20 g de cultivo en proporción 1:2:2 a unos 24–26 °C.',
      'Observa durante 12–24 h como primera revisión; si hay actividad, espera a que madure antes de repetir 1:2:2.',
      'Confirma varios ciclos de crecimiento vigoroso antes de hornear.',
    ],
  },
  {
    id: 'fridge-long',
    band: 'Más de 30 días',
    title: 'Observar antes de recuperar',
    ratio: 2,
    cycles: 'Según su respuesta',
    duration: 'Varios días',
    description: 'El tiempo por sí solo no confirma que esté perdida ni que sea recuperable.',
    steps: [
      'Inspecciona con cuidado. Ante contaminación, desecha todo el cultivo.',
      'Si parece sano, refresca una muestra pequeña en proporción 1:2:2.',
      'Observa durante varios días a temperatura estable y refresca según su respuesta.',
      'Si no recupera suficiente actividad tras varios días, considera empezar un cultivo nuevo.',
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
    return fridgeProtocols[
      days <= 3 ? 0 : days <= 7 ? 1 : days <= 14 ? 2 : days <= 21 ? 3 : days <= 30 ? 4 : 5
    ];
  }
  return applyFeedingPace(
    roomProtocols[hours < 12 ? 0 : hours < 24 ? 1 : hours <= 48 ? 2 : hours <= 72 ? 3 : 4],
    pace,
  );
}
export function isContaminated(safety: Safety): boolean {
  return ['contamination', 'mold', 'pink', 'rotten'].includes(safety);
}
export type Recommendation = {
  kind: 'discard' | 'out-of-scope' | 'inspect' | 'protocol';
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
    ![1, 2, 3, 5].includes(ratio) ||
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
export function elapsedHours(date: string, now = Date.now()): number {
  const time = Date.parse(date);
  if (!Number.isFinite(time) || time > now) throw new Error('Invalid feeding date');
  return (now - time) / 3_600_000;
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
