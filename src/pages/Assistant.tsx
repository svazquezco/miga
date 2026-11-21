import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Snowflake,
  Sun,
  ShieldCheck,
  Wheat,
  Sprout,
  Check,
  Thermometer,
  Clock3,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Miga, Jar, GrowthIllustration } from '../components/Illustrations';
import { ProtocolTiming, RatioExplanation, FeedingPaceChoice } from '../components/ProtocolTiming';
import { PageTitle, Notice, StepList, RatioBadge, dateLabel, inputDate } from '../components/UI';
import {
  bakingGrowthGuidance,
  recommend,
  elapsedHours,
  feedingBlock,
  isContaminated,
  latestBakingFeeding,
} from '../domain/starter';
import type { Activity, Safety, Goal, StoragePlace, FeedingPace } from '../domain/starter';
import { Calculator } from './Calculator';
import { FeedingModal } from '../components/FeedingModal';
import { Recovery } from '../components/Recovery';
import type { PageProps, FeedRequest } from '../types';
type Step = 'storage' | 'safety' | 'date' | 'goal' | 'calculate' | 'clock' | 'activity' | 'result';

const stepCopy = {
  storage: {
    question: '¿Dónde ha estado desde el último refresco?',
    hint: 'Elige si la has guardado en la nevera o a temperatura ambiente.',
  },
  safety: {
    question: 'Primero lo importante: ¿cómo se ve y huele?',
    hint: 'Mira todo el cultivo, no solo la superficie. Estas ilustraciones son ejemplos, no un diagnóstico.',
  },
  date: {
    question: '¿Cuándo fue su último refresco?',
    hint: 'Indica cuándo alimentaste tu masa madre por última vez.',
  },
  goal: {
    question: '¿Qué quieres hacer con tu masa madre?',
    hint: 'El cuidado cambia según quieras guardarla o preparar tu próximo pan.',
  },
  calculate: {
    question: 'Calcula el refresco para tu pan',
    hint: 'Calcula los gramos y registra el refresco cuando lo hayas hecho para iniciar el reloj.',
  },
  clock: {
    question: 'Espera y observa su crecimiento',
    hint: 'Deja fermentar a temperatura ambiente y marca el nivel en el tarro.',
  },
  activity: {
    question: '¿Cuánto ha crecido desde el último refresco?',
    hint: 'Compara la altura actual con la que tenía tras mezclar agua y harina. Si no marcaste el nivel, elige «No he seguido su crecimiento».',
  },
};

export function Assistant({
  data,
  update,
  notify,
  navigate,
  onFeed,
}: PageProps & { onFeed: (request: FeedRequest) => void }) {
  const initialGoal = location.hash.endsWith('/bake')
    ? 'bake'
    : location.hash.endsWith('/maintain')
      ? 'maintain'
      : null;
  const { contamination: recordedSafety, blocked } = feedingBlock(data);
  const bakingSupported = !blocked;
  const bakingFeeding = bakingSupported ? latestBakingFeeding(data) : undefined;
  const resume = initialGoal !== 'maintain' && !data.recovery ? bakingFeeding : undefined;
  const startingStep = initialGoal ? 'storage' : 'goal';
  const [currentStep, setStep] = useState<Step>(resume ? 'clock' : startingStep);
  const afterSafetySteps: Step[] = ['calculate', 'clock', 'activity', 'result'];
  const step =
    recordedSafety && (afterSafetySteps.includes(currentStep) || data.recovery)
      ? 'result'
      : currentStep;
  const [bakingSession, setBakingSession] = useState(resume);
  const [bakingRequest, setBakingRequest] = useState<FeedRequest | null>(null);
  const [skipCalculation, setSkipCalculation] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.closest('.assistant-card')?.scrollIntoView({ block: 'start' });
  }, [step]);
  const [storage, setStorage] = useState<StoragePlace>(data.starter.storage);
  const [lastFed, setLastFed] = useState(
    data.starter.lastFedAt ? inputDate(new Date(data.starter.lastFedAt)) : '',
  );
  const [temperature, setTemperature] = useState(String(data.starter.temperature));
  const [safety, setSafety] = useState<Safety>(resume?.bakingCheck?.safety ?? 'unknown');
  const [goal, setGoal] = useState<Goal | null>(resume ? 'bake' : initialGoal);
  const [feedingPace, setFeedingPace] = useState<FeedingPace>('usual');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  let hours = 0;
  try {
    hours = elapsedHours(lastFed);
  } catch {
    /* The date step presents validation before results. */
  }
  const effectiveSafety = recordedSafety ?? safety;
  const result = recommend({
    storage,
    feedingPace,
    elapsedHours: hours,
    safety: effectiveSafety,
    goal: goal ?? 'maintain',
    activity: activity ?? 'unknown',
    hydration: data.starter.hydration,
  });
  const showCalculator =
    goal === 'bake' && bakingSupported && !isContaminated(safety) && !skipCalculation;
  const steps: Exclude<Step, 'result'>[] = [
    ...(initialGoal
      ? (['storage', 'safety', 'date'] as const)
      : (['goal', 'safety', 'storage', 'date'] as const)),
    ...(showCalculator ? (['calculate', 'clock'] as const) : []),
    'activity',
  ];
  const stepIndex = step === 'result' ? steps.length : steps.indexOf(step);
  const timer =
    bakingFeeding &&
    (!bakingSession || bakingSession.id === bakingFeeding.id) &&
    lastFed === inputDate(new Date(bakingFeeding.fedAt))
      ? bakingFeeding.bakingCheck
      : undefined;
  const observedBakingFeeding =
    bakingSession && lastFed === inputDate(new Date(bakingSession.fedAt));
  const hasRisen = activity === 'rising' || activity === 'peak' || activity === 'fallen';
  const bakingResult =
    result.kind === 'protocol' && goal === 'bake' && (observedBakingFeeding || hasRisen)
      ? bakingGrowthGuidance[activity ?? 'unknown']
      : undefined;
  const selectionMissing =
    (step === 'safety' && safety === 'unknown') ||
    (step === 'goal' && goal === null) ||
    (step === 'activity' && activity === null);

  function dateError() {
    if (lastFed) {
      try {
        elapsedHours(lastFed);
      } catch {
        return 'Indica una fecha y hora válidas, anteriores o iguales al momento actual.';
      }
    }
    if (
      !temperature.trim() ||
      !Number.isFinite(Number(temperature)) ||
      Number(temperature) < 1 ||
      Number(temperature) > 45
    ) {
      return 'Indica una temperatura entre 1 y 45 °C.';
    }
    return '';
  }

  function goTo(target: Step) {
    setError('');
    const targetIndex = target === 'result' ? steps.length : steps.indexOf(target);
    const afterSafety = targetIndex > steps.indexOf('safety');
    const afterDate = targetIndex > steps.indexOf('date');

    if (afterSafety && (recordedSafety || isContaminated(safety))) {
      setStep('result');
      return;
    }
    if (targetIndex < stepIndex) {
      setStep(target);
      return;
    }
    if (target !== 'goal' && !goal) {
      setStep('goal');
      setError('Selecciona qué quieres hacer con tu masa madre.');
      return;
    }
    if (afterSafety && safety === 'unknown') {
      setStep('safety');
      setError('Selecciona una opción sobre el aspecto y el aroma.');
      return;
    }
    if (afterSafety && safety === 'hooch' && goal && (step === 'safety' || !bakingSession)) {
      if (!bakingSupported) {
        setStep('result');
        return;
      }
      void update({ type: 'recovery', recovery: { goal, stage: 'start', confirmations: 0 } });
      return;
    }
    const invalidDate = afterDate ? dateError() : '';
    if (invalidDate) {
      setStep('date');
      setError(invalidDate);
      return;
    }
    if (afterDate && data.starter.hydration !== 100) {
      setStep('result');
      return;
    }
    if (afterDate && !lastFed && goal === 'maintain') {
      setStep('date');
      setError('Indica cuándo fue el último refresco para orientar el mantenimiento.');
      return;
    }
    const afterCalculation = target === 'clock' || target === 'activity' || target === 'result';
    if (afterCalculation && showCalculator && !timer && !(saved && observedBakingFeeding)) {
      setStep('calculate');
      setError('Registra el refresco para iniciar el reloj o sigue con el que ya has hecho.');
      return;
    }
    if (target === 'result' && !activity) {
      setStep('activity');
      setError('Selecciona una opción sobre el crecimiento.');
      return;
    }
    if (afterCalculation && showCalculator && timer) setBakingSession(bakingFeeding);
    setStep(target);
  }

  function next() {
    goTo(steps[stepIndex + 1] ?? 'result');
  }

  const checkedFeedingId =
    goal === 'bake' && bakingFeeding?.id === bakingSession?.id ? bakingFeeding?.id : undefined;

  async function reset() {
    if (data.recovery || (bakingFeeding && goal === 'bake')) {
      const saveResult = await update({
        type: 'recovery',
        checkedFeedingId,
      });
      if (saveResult === 'blocked') return;
    }
    setStep(startingStep);
    setSafety('unknown');
    setGoal(initialGoal);
    setActivity(null);
    setBakingSession(undefined);
    setFeedingPace('usual');
    setSaved(false);
    setError('');
    setSkipCalculation(false);
  }
  async function saveObservation() {
    if (saved || (!lastFed && result.kind !== 'discard')) return;
    const saveResult = await update({
      type: 'observation',
      checkedFeedingId,
      observation: {
        id: crypto.randomUUID(),
        observedAt: new Date().toISOString(),
        safety: effectiveSafety,
        activity: result.kind === 'discard' ? 'unknown' : (activity ?? 'unknown'),
        rise: null,
        bubbles: activity === 'peak' || activity === 'rising',
        aroma: effectiveSafety === 'rotten' ? 'Putrefacto' : '',
        peakHours: null,
        notes: 'Observación registrada con Miga.',
      },
    });
    if (saveResult === 'blocked') return;
    setSaved(true);
    if (saveResult === 'saved') notify('Observación guardada.');
  }
  if (data.recovery && bakingSupported) {
    return (
      <Recovery
        data={data}
        update={update}
        notify={notify}
        navigate={navigate}
        plan={data.recovery}
        onCancel={reset}
        onComplete={(recoveredGoal) => {
          setGoal(recoveredGoal);
          setSafety('healthy');
          setStorage(data.starter.storage);
          setLastFed(data.starter.lastFedAt ? inputDate(new Date(data.starter.lastFedAt)) : '');
          setTemperature(String(data.starter.temperature));
          setBakingSession(undefined);
          setActivity(null);
          setSkipCalculation(false);
          setSaved(false);
          setError('');
          setStep(recoveredGoal === 'bake' ? 'calculate' : 'activity');
        }}
      />
    );
  }
  return (
    <>
      <PageTitle eyebrow="UN REFRESCO, PASO A PASO" title="Lo vemos juntas, con Miga.">
        Unas preguntas sencillas para encontrar el siguiente paso.
      </PageTitle>
      <div className="assistant-layout">
        <aside className="assistant-companion">
          <div className="companion-sticky">
            <span className="mini-label">
              <Sprout size={15} />
              AQUÍ PARA AYUDARTE
            </span>
            <Miga waving={step === 'storage'} />
            <h2>
              Sin prisas.
              <br />
              Con buenas migas.
            </h2>
            <p>
              No todas las masas madre van al mismo ritmo. Observamos, cuidamos y volvemos a mirar.
            </p>
            <a href="#guide/flow">
              <ShieldCheck size={16} />
              Ver cómo decido
            </a>
            <div className="assistant-scope">
              Cultivo maduro de trigo
              <br />
              100 % de hidratación
            </div>
          </div>
        </aside>
        <section className="assistant-card" aria-live="polite">
          <div className="assistant-progress">
            <span>
              {step !== 'result'
                ? 'Paso ' + (stepIndex + 1) + ' de ' + steps.length
                : 'Tu siguiente paso'}
            </span>
            <div role="group" aria-label="Ir a un paso">
              {steps.map((target, index) => (
                <button
                  key={target}
                  type="button"
                  className={index <= stepIndex || step === 'result' ? 'filled' : ''}
                  aria-label={'Paso ' + (index + 1) + ': ' + stepCopy[target].question}
                  aria-current={target === step ? 'step' : undefined}
                  onClick={() => goTo(target)}
                />
              ))}
            </div>
            <button className="text-button" onClick={reset}>
              Empezar de nuevo
            </button>
          </div>
          {step !== 'result' ? (
            <>
              <div className="assistant-question">
                <span className="speech-label">MIGA DICE</span>
                <h2 ref={headingRef} tabIndex={-1}>
                  {stepCopy[step].question}
                </h2>
                <p>{stepCopy[step].hint}</p>
              </div>
              {step === 'storage' && (
                <div className="choice-grid two">
                  <button
                    className={`choice-card ${storage === 'fridge' ? 'selected' : ''}`}
                    aria-pressed={storage === 'fridge'}
                    onClick={() => setStorage('fridge')}
                  >
                    <Snowflake size={32} />
                    <strong>En la nevera</strong>
                    <span>Aproximadamente 4 °C</span>
                    {storage === 'fridge' && <Check className="choice-check" size={18} />}
                  </button>
                  <button
                    className={`choice-card ${storage === 'room' ? 'selected' : ''}`}
                    aria-pressed={storage === 'room'}
                    onClick={() => setStorage('room')}
                  >
                    <Sun size={32} />
                    <strong>A temperatura ambiente</strong>
                    <span>Fuera de la nevera</span>
                    {storage === 'room' && <Check className="choice-check" size={18} />}
                  </button>
                </div>
              )}
              {step === 'date' && (
                <div className="assistant-fields">
                  <label>
                    Último refresco
                    <input
                      type="datetime-local"
                      value={lastFed}
                      max={inputDate()}
                      onChange={(e) => setLastFed(e.target.value)}
                      aria-describedby="last-feeding-hint"
                    />
                    <small id="last-feeding-hint">
                      Si vas a registrar un refresco nuevo para hacer pan, puedes dejar este campo
                      en blanco.
                    </small>
                  </label>
                  <label>
                    <span>
                      <Thermometer size={16} /> Temperatura actual para fermentar (°C)
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="45"
                      step="0.5"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </label>
                  <Notice>
                    Para reactivar, unos 24–26 °C como referencia. No calientes el tarro
                    directamente: busca un lugar estable.
                  </Notice>
                  {storage === 'room' && lastFed && hours < 24 && (
                    <FeedingPaceChoice value={feedingPace} onChange={setFeedingPace} />
                  )}
                </div>
              )}
              {step === 'safety' && (
                <>
                  <div className="safety-choices">
                    {(
                      [
                        {
                          id: 'healthy',
                          state: 'active',
                          title: 'Aspecto y aroma normales',
                          text: 'Sin moho ni colores extraños; aroma fermentativo normal.',
                        },
                        {
                          id: 'hooch',
                          state: 'hooch',
                          title: 'Líquido gris o marrón',
                          text: 'Puede ser hooch: hambre, sin otras señales de contaminación.',
                        },
                        {
                          id: 'contamination',
                          state: 'unsafe',
                          title: 'Moho o vetas rosas o naranjas',
                          text: 'Cualquiera de estas señales, en cualquier parte del cultivo.',
                        },
                      ] as const
                    ).map((c) => (
                      <button
                        key={c.id}
                        className={`safety-choice ${c.id === 'contamination' ? 'contamination-choice' : ''} ${safety === c.id ? 'selected' : ''}`}
                        aria-pressed={safety === c.id}
                        onClick={() => {
                          setSafety(c.id);
                          setError('');
                        }}
                      >
                        <Jar state={c.state} />
                        <span>
                          <strong>{c.title}</strong>
                          <small>{c.text}</small>
                        </span>
                        {safety === c.id && <Check size={18} />}
                      </button>
                    ))}
                    <button
                      className={`safety-choice smell-choice ${safety === 'rotten' ? 'selected' : ''}`}
                      aria-pressed={safety === 'rotten'}
                      onClick={() => {
                        setSafety('rotten');
                        setError('');
                      }}
                    >
                      <ShieldCheck size={26} />
                      <span>
                        <strong>Olor claramente putrefacto</strong>
                        <small>No un olor fermentativo o ácido habitual.</small>
                      </span>
                    </button>
                  </div>
                  {safety !== 'healthy' && (
                    <Notice danger>
                      Si hay varias señales, elige cualquiera de contaminación. El líquido
                      superficial no anula el moho ni los colores extraños.
                    </Notice>
                  )}
                </>
              )}
              {step === 'goal' && (
                <>
                  <div className="choice-grid two">
                    <button
                      className={`choice-card ${goal === 'maintain' ? 'selected' : ''}`}
                      aria-pressed={goal === 'maintain'}
                      onClick={() => {
                        setGoal('maintain');
                        setError('');
                      }}
                    >
                      <Sprout size={32} />
                      <strong>Cuidarla y guardarla</strong>
                      <span>No voy a hacer pan próximamente.</span>
                    </button>
                    <button
                      className={`choice-card ${goal === 'bake' ? 'selected' : ''}`}
                      aria-pressed={goal === 'bake'}
                      onClick={() => {
                        setGoal('bake');
                        setSkipCalculation(false);
                        setError('');
                      }}
                    >
                      <Wheat size={32} />
                      <strong>Prepararla para hacer pan</strong>
                      <span>Quiero recuperar y comprobar su fuerza.</span>
                    </button>
                  </div>
                </>
              )}
              {step === 'calculate' && (
                <Calculator
                  data={data}
                  update={update}
                  notify={notify}
                  navigate={navigate}
                  onFeed={setBakingRequest}
                  embedded
                />
              )}
              {step === 'clock' && timer && <BakingClock checkAt={timer.at} />}
              {step === 'clock' && !timer && (
                <Notice>Registra un refresco para volver a iniciar el reloj.</Notice>
              )}
              {step === 'activity' && (
                <>
                  <p className="growth-legend">
                    <span aria-hidden="true" /> La línea discontinua indica el nivel tras el
                    refresco.
                  </p>
                  <div className="activity-choices">
                    {(
                      [
                        {
                          id: 'quiet',
                          title: 'Todavía no ha subido',
                          text: 'Está a una altura parecida a la del principio, con pocas burbujas.',
                        },
                        {
                          id: 'rising',
                          title: 'Ha subido y sigue creciendo',
                          text: 'Está más alta que al principio y continúa ganando volumen.',
                        },
                        {
                          id: 'peak',
                          title: 'Ha llegado a su altura máxima',
                          text: 'Ha crecido mucho y ha dejado de subir. Es lo que llamamos el pico.',
                        },
                        {
                          id: 'fallen',
                          title: 'Subió y después bajó',
                          text: 'El nivel actual está por debajo de una marca que dejó más arriba.',
                        },
                        {
                          id: 'unknown',
                          title: 'No he seguido su crecimiento',
                          text: 'No tengo una marca inicial o no he visto cómo ha evolucionado.',
                        },
                      ] as const
                    ).map((c) => (
                      <button
                        key={c.id}
                        className={`activity-choice ${activity === c.id ? 'selected' : ''}`}
                        aria-pressed={activity === c.id}
                        onClick={() => {
                          setActivity(c.id);
                          setError('');
                        }}
                      >
                        <span className="radio-dot" />
                        <GrowthIllustration activity={c.id} />
                        <span>
                          <strong>{c.title}</strong>
                          <small>{c.text}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="assistant-actions">
                {stepIndex > 0 && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setStep(steps[stepIndex - 1]);
                      setError('');
                    }}
                  >
                    <ArrowLeft size={16} />
                    Volver
                  </button>
                )}
                {step === 'calculate' && !timer ? (
                  <button
                    className="text-button"
                    onClick={() => {
                      if (!lastFed) {
                        setError(
                          'Indica la fecha del último refresco o registra uno desde la calculadora.',
                        );
                        return;
                      }
                      setSkipCalculation(true);
                      setError('');
                      setStep('activity');
                    }}
                  >
                    Ya la he refrescado
                  </button>
                ) : (
                  <button
                    className="primary"
                    aria-disabled={selectionMissing || undefined}
                    onClick={next}
                  >
                    {step === 'activity'
                      ? 'Ver mi siguiente paso'
                      : step === 'clock'
                        ? 'Comprobar crecimiento'
                        : step === 'storage' && stepIndex === 0
                          ? 'Vamos allá'
                          : 'Continuar'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="assistant-result">
              <span className="speech-label">LO QUE TE PROPONGO</span>
              <h2 ref={headingRef} tabIndex={-1}>
                {bakingResult?.title ?? result.title}
              </h2>
              <p>{bakingResult?.text ?? result.text}</p>
              {!bakingResult && result.kind === 'protocol' && result.protocol && (
                <>
                  <div className="result-ratio">
                    <span>
                      Proporción inicial
                      <br />
                      <small>Cultivo : agua : harina</small>
                    </span>
                    <RatioBadge n={result.protocol.ratio} />
                  </div>
                  <RatioExplanation protocol={result.protocol} />
                  <div className="protocol-meta">
                    <span>
                      <RefreshCw size={14} />
                      {result.protocol.cycles}
                    </span>
                  </div>
                  {activity === 'quiet' && (
                    <Notice>
                      Si ya la has refrescado y todavía no hay fermentación, observa su evolución y
                      temperatura antes de volver a alimentarla. Evita diluirla con refrescos
                      repetidos.
                    </Notice>
                  )}
                  {activity === 'peak' && (
                    <Notice>
                      Estar en el pico es una observación, no una confirmación automática de fuerza.
                      Para hornear, comprueba que el crecimiento sea vigoroso y repetible.
                    </Notice>
                  )}
                  <StepList steps={result.protocol.steps} />
                  <Notice>{result.nextCondition}</Notice>
                  <ProtocolTiming protocol={result.protocol} temperature={Number(temperature)} />
                  <a className="text-button" href="#guide/basics">
                    Ver referencia de horas hasta el pico
                  </a>
                  {Number(temperature) < 20 || Number(temperature) > 27 ? (
                    <Notice>
                      Has indicado {temperature} °C. La temperatura cambia mucho el ritmo; los
                      intervalos no predicen cuándo estará lista.
                    </Notice>
                  ) : null}
                  <div className="result-buttons">
                    <button
                      className="primary"
                      disabled={data.starter.hydration !== 100}
                      onClick={() => {
                        const n = result.protocol!.ratio;
                        onFeed({ ratio: n, starterG: 20, waterG: 20 * n, flourG: 20 * n });
                      }}
                    >
                      Registrar un refresco
                    </button>
                    <button className="secondary" onClick={() => navigate('calculator')}>
                      Ajustar los gramos
                    </button>
                  </div>
                </>
              )}
              {result.kind === 'discard' && (
                <>
                  <div className="discard-panel">
                    <ShieldCheck size={32} />
                    <p>
                      No alimentes ni utilices este cultivo. Guarda la observación para que el
                      historial refleje lo ocurrido.
                    </p>
                  </div>
                  <Notice danger>
                    Para continuar con otro cultivo, utiliza «Empezar con un cultivo nuevo» en los
                    ajustes después de guardar esta observación.
                  </Notice>
                </>
              )}
              <button
                className="text-button save-observation"
                disabled={saved || (!lastFed && result.kind !== 'discard')}
                onClick={saveObservation}
              >
                <Save size={17} />
                {saved ? 'Observación guardada' : 'Guardar esta observación'}
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setStep(
                    result.kind === 'discard'
                      ? 'safety'
                      : result.kind === 'out-of-scope'
                        ? 'date'
                        : 'activity',
                  )
                }
              >
                <ArrowLeft size={16} />
                Revisar mis respuestas
              </button>
            </div>
          )}
        </section>
      </div>
      {bakingRequest && (
        <FeedingModal
          data={data}
          update={update}
          notify={notify}
          navigate={navigate}
          request={bakingRequest}
          onClose={() => setBakingRequest(null)}
          onSaved={(feeding) => {
            setBakingSession(feeding);
            setLastFed(inputDate(new Date(feeding.fedAt)));
            setStorage(feeding.storage);
            setTemperature(String(feeding.temperature));
            setSafety(feeding.bakingCheck?.safety ?? 'unknown');
            setActivity(null);
            setSaved(false);
            setError('');
            setStep('clock');
          }}
        />
      )}
    </>
  );
}

function BakingClock({ checkAt }: { checkAt: string }) {
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((Date.parse(checkAt) - now) / 60_000));
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(clock);
  }, []);
  return (
    <div className="baking-clock">
      <Clock3 size={28} aria-hidden="true" />
      <div>
        <strong>
          {remaining
            ? Math.floor(remaining / 60) + ' h ' + (remaining % 60) + ' min para revisar'
            : 'Ya puedes revisar su crecimiento'}
        </strong>
        <p>
          Aviso para revisar la actividad: <time dateTime={checkAt}>{dateLabel(checkAt)}</time>.
        </p>
        <p>
          El ritmo depende de la temperatura y del cultivo. Si ya ha subido, puedes comprobar su
          altura y sus burbujas antes de que termine el reloj.
        </p>
      </div>
    </div>
  );
}
