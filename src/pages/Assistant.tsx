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
import { PageTitle, Notice, StepList, RatioBadge, inputDate } from '../components/UI';
import { recommend, elapsedHours, isContaminated } from '../domain/starter';
import type { Activity, Safety, Goal, StoragePlace, FeedingPace } from '../domain/starter';
import type { PageProps, FeedRequest } from '../types';
export function Assistant({
  data,
  update,
  notify,
  navigate,
  onFeed,
}: PageProps & { onFeed: (request: FeedRequest) => void }) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
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
  const [safety, setSafety] = useState<Safety>('unknown');
  const [goal, setGoal] = useState<Goal>('bake');
  const [feedingPace, setFeedingPace] = useState<FeedingPace>('usual');
  const [activity, setActivity] = useState<Activity>('unknown');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  let hours = 0;
  try {
    hours = elapsedHours(lastFed);
  } catch {
    /* The date step presents validation before results. */
  }
  const effectiveSafety = data.observations.find((o) => isContaminated(o.safety))?.safety ?? safety;
  const result = recommend({
    storage,
    feedingPace,
    elapsedHours: hours,
    safety: effectiveSafety,
    goal,
    activity,
    temperature: Number(temperature),
    hydration: data.starter.hydration,
  });
  const questions = [
    '¡Hola! Soy Miga. Vamos a conocer tu tarro.',
    '¿Cuándo fue su último refresco?',
    'Primero lo importante: ¿cómo se ve y huele?',
    '¿Qué te gustaría hacer con ella?',
    '¿Cuánto ha crecido desde el último refresco?',
  ];
  const hints = [
    'Te acompaño paso a paso. Para empezar, ¿dónde ha estado desde la última vez que la alimentaste?',
    'El tiempo nos ayuda a elegir un punto de partida. Después escucharemos lo que dice el cultivo.',
    'Mira todo el cultivo, no solo la superficie. Estas ilustraciones son ejemplos, no un diagnóstico.',
    'El cuidado cambia según quieras guardarla o preparar tu próximo pan.',
    'Compara la altura actual con la que tenía justo después de mezclar agua y harina. Si no marcaste el nivel o no la has observado, elige «No he seguido su crecimiento».',
  ];
  function next() {
    if (data.observations.some((o) => isContaminated(o.safety))) {
      setStep(5);
      return;
    }
    setError('');
    if (step === 1) {
      try {
        elapsedHours(lastFed);
      } catch {
        setError('Indica una fecha y hora válidas, anteriores o iguales al momento actual.');
        return;
      }
      if (
        !temperature.trim() ||
        !Number.isFinite(Number(temperature)) ||
        Number(temperature) < 1 ||
        Number(temperature) > 45
      ) {
        setError('Indica una temperatura entre 1 y 45 °C.');
        return;
      }
    }
    if (step === 2 && safety === 'unknown') {
      setError('Elige qué has observado antes de continuar.');
      return;
    }
    setStep(step === 2 && isContaminated(safety) ? 5 : step + 1);
  }
  function saveObservation() {
    if (saved || !lastFed) return;
    update({
      ...data,
      starter: {
        ...data.starter,
        storage,
        temperature: Number(temperature),
        lastFedAt: new Date(lastFed).toISOString(),
      },
      observations: [
        {
          id: crypto.randomUUID(),
          observedAt: new Date().toISOString(),
          safety: effectiveSafety,
          activity: result.kind === 'discard' ? 'unknown' : activity,
          rise: null,
          bubbles: activity === 'peak' || activity === 'rising',
          aroma: safety === 'rotten' ? 'Putrefacto' : '',
          peakHours: null,
          notes: 'Observación registrada con Miga.',
        },
        ...data.observations,
      ],
    });
    setSaved(true);
    notify('Punto de partida y observación guardados en este navegador.');
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
            <Miga waving={step === 0} />
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
            <span>{step < 5 ? `Paso ${step + 1} de 5` : 'Tu siguiente paso'}</span>
            <div>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={i <= step ? 'filled' : ''} />
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => {
                setStep(0);
                setSafety('unknown');
                setSaved(false);
                setError('');
              }}
            >
              Empezar de nuevo
            </button>
          </div>
          {step < 5 ? (
            <>
              <div className="assistant-question">
                <span className="speech-label">MIGA DICE</span>
                <h2 ref={headingRef} tabIndex={-1}>
                  {questions[step]}
                </h2>
                <p>{hints[step]}</p>
              </div>
              {step === 0 && (
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
              {step === 1 && (
                <div className="assistant-fields">
                  <label>
                    Último refresco
                    <input
                      type="datetime-local"
                      value={lastFed}
                      max={inputDate()}
                      onChange={(e) => setLastFed(e.target.value)}
                      required
                    />
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
                </div>
              )}
              {step === 2 && (
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
                        onClick={() => setSafety(c.id)}
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
                      onClick={() => setSafety('rotten')}
                    >
                      <ShieldCheck size={26} />
                      <span>
                        <strong>Olor claramente putrefacto</strong>
                        <small>No un olor fermentativo o ácido habitual.</small>
                      </span>
                    </button>
                  </div>
                  <Notice danger>
                    Si hay varias señales, elige cualquiera de contaminación. El líquido superficial
                    no anula el moho ni los colores extraños.
                  </Notice>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="choice-grid two">
                    <button
                      className={`choice-card ${goal === 'maintain' ? 'selected' : ''}`}
                      aria-pressed={goal === 'maintain'}
                      onClick={() => setGoal('maintain')}
                    >
                      <Sprout size={32} />
                      <strong>Cuidarla y guardarla</strong>
                      <span>No voy a hacer pan próximamente.</span>
                    </button>
                    <button
                      className={`choice-card ${goal === 'bake' ? 'selected' : ''}`}
                      aria-pressed={goal === 'bake'}
                      onClick={() => setGoal('bake')}
                    >
                      <Wheat size={32} />
                      <strong>Prepararla para hacer pan</strong>
                      <span>Quiero recuperar y comprobar su fuerza.</span>
                    </button>
                  </div>
                  {storage === 'room' && hours < 24 && (
                    <FeedingPaceChoice value={feedingPace} onChange={setFeedingPace} />
                  )}
                </>
              )}
              {step === 4 && (
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
                        onClick={() => setActivity(c.id)}
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
                {step > 0 && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setStep(step - 1);
                      setError('');
                    }}
                  >
                    <ArrowLeft size={16} />
                    Volver
                  </button>
                )}
                <button className="primary" onClick={next}>
                  {step === 4 ? 'Ver mi siguiente paso' : step === 0 ? 'Vamos allá' : 'Continuar'}
                </button>
              </div>
            </>
          ) : (
            <div className="assistant-result">
              <span className="speech-label">LO QUE TE PROPONGO</span>
              <h2 ref={headingRef} tabIndex={-1}>
                {result.title}
              </h2>
              <p>{result.text}</p>
              {result.kind === 'protocol' && result.protocol && (
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
                    <span>
                      <Clock3 size={14} />
                      {result.protocol.duration}
                    </span>
                  </div>
                  {activity === 'quiet' && (
                    <Notice>
                      Si ya la has refrescado y todavía no hay fermentación, observa su evolución y
                      temperatura antes de volver a alimentarla. Evita diluirla con refrescos
                      repetidos.
                    </Notice>
                  )}
                  {activity === 'rising' && (
                    <Notice>
                      Si el refresco actual sigue creciendo, deja que madure antes de repetirlo.
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
                        saveObservation();
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
                disabled={saved || !lastFed}
                onClick={saveObservation}
              >
                <Save size={17} />
                {saved ? 'Observación guardada' : 'Guardar esta observación'}
              </button>
              <button
                className="text-button"
                onClick={() => setStep(result.kind === 'discard' ? 2 : 4)}
              >
                <ArrowLeft size={16} />
                Revisar mis respuestas
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
