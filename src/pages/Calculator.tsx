import { useState } from 'react';
import {
  Calculator as CalculatorIcon,
  Copy,
  Droplets,
  Wheat,
  FlaskConical,
  Check,
  Scale,
} from 'lucide-react';
import { PageTitle, Notice, grams } from '../components/UI';
import {
  displayedAmounts,
  displayedAmountsFromStarter,
  feedingBlock,
  feedingRatios,
  firstStarterCheckHours,
  peakTimeAt24To25C,
  starterActivityLevels,
  starterActivityLabels,
} from '../domain/starter';
import type { Ratio, StarterActivityLevel } from '../domain/starter';
import type { PageProps, FeedRequest } from '../types';
function peakLabel(ratio: Ratio, activity: StarterActivityLevel) {
  const [earliest, latest] = peakTimeAt24To25C[ratio][activity];
  return `${earliest}–${latest} h${activity === 'weak' ? ' o más' : ''}`;
}

export function Calculator({
  data,
  notify,
  onFeed,
  embedded = false,
  initialActivity = 'active',
}: PageProps & {
  onFeed: (request: FeedRequest) => void;
  embedded?: boolean;
  initialActivity?: StarterActivityLevel | 'unknown';
}) {
  const [recipe, setRecipe] = useState('200');
  const [reserve, setReserve] = useState('40');
  const [ratio, setRatio] = useState<Ratio>(2);
  const [initialStarter, setInitialStarter] = useState<string | undefined>('20');
  const [activity, setActivity] = useState(initialActivity);
  const [copied, setCopied] = useState(false);
  const recipeG = Number(recipe);
  const reserveG = Number(reserve);
  const targetTenths = Math.round((recipeG + reserveG) * 10);
  const validTargets =
    recipe.trim() &&
    reserve.trim() &&
    recipeG >= 0 &&
    reserveG >= 0 &&
    Number.isSafeInteger(targetTenths);
  let amounts: ReturnType<typeof displayedAmounts> | null = null;
  let suggestedStarter: number | undefined;
  if (validTargets) {
    try {
      const suggested = targetTenths > 0 ? displayedAmounts(recipeG, reserveG, ratio) : null;
      suggestedStarter = suggested?.starter;
      amounts =
        initialStarter === undefined
          ? suggested
          : displayedAmountsFromStarter(Number(initialStarter), ratio);
    } catch {
      /* Inline validation below. */
    }
  }
  const tooSmall = amounts && [amounts.starter, amounts.water, amounts.flour].some((n) => n <= 0);
  const shortfall = amounts ? (targetTenths - Math.round(amounts.total * 10)) / 10 : 0;
  const { blocked } = feedingBlock(data);
  async function copy() {
    if (!amounts) return;
    const text = `Refresco 1:${ratio}:${ratio} (cultivo : agua : harina)\nCultivo: ${grams(amounts.starter)} g\nAgua: ${grams(amounts.water)} g\nHarina: ${grams(amounts.flour)} g\nTotal: ${grams(amounts.total)} g${shortfall > 0 ? '' : ` (reserva: ${reserve} g)`}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      notify('Cantidades copiadas.');
    } catch {
      notify('No se pudo copiar. Puedes seleccionar las cantidades en pantalla.');
    }
  }
  return (
    <>
      {!embedded && (
        <PageTitle eyebrow="LO JUSTO, CON UN POQUITO DE RESERVA" title="Cada gramo tiene su sitio.">
          Calcula tu último refresco para la receta o el mantenimiento.
        </PageTitle>
      )}
      <div className={embedded ? 'calculator-layout embedded-calculator' : 'calculator-layout'}>
        <section className="reading-card calculator-form">
          <span className="quick-icon wheat">
            <CalculatorIcon />
          </span>
          <h2>¿Cuánto necesitas?</h2>
          <label>
            Cantidad para la receta (g)
            <input
              type="number"
              min="0"
              step="0.1"
              value={recipe}
              onChange={(e) => {
                setRecipe(e.target.value);
                setCopied(false);
              }}
            />
          </label>
          <label>
            Reserva de cultivo (g)
            <input
              type="number"
              min="0"
              step="0.1"
              value={reserve}
              onChange={(e) => {
                setReserve(e.target.value);
                setCopied(false);
              }}
            />
            <small>Una parte para seguir cuidando tu masa madre.</small>
          </label>
          <fieldset>
            <legend>Proporción de refresco</legend>
            <div className="ratio-options">
              {feedingRatios.map((n) => (
                <button
                  key={n}
                  aria-pressed={ratio === n}
                  onClick={() => {
                    setRatio(n);
                    setCopied(false);
                  }}
                >
                  1:{n}:{n}
                </button>
              ))}
            </div>
            <p className="field-hint">Cultivo : agua : harina, siempre en peso.</p>
          </fieldset>
          <label>
            Cultivo inicial (g)
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={initialStarter ?? suggestedStarter ?? ''}
              onChange={(e) => {
                setInitialStarter(e.target.value);
                setCopied(false);
              }}
            />
            <small>Si puedes, parte de al menos 20 g.</small>
          </label>
          {initialStarter !== undefined && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setInitialStarter(undefined);
                setCopied(false);
              }}
            >
              Volver al cálculo automático
            </button>
          )}
          {!amounts && (
            <p className="form-error" role="alert">
              {!validTargets
                ? 'Indica cantidades válidas para la receta y la reserva.'
                : initialStarter !== undefined
                  ? 'Indica una cantidad de cultivo inicial mayor que cero.'
                  : 'Indica cuánto necesitas para la receta o la reserva.'}
            </p>
          )}
          {tooSmall && (
            <p className="form-error" role="alert">
              Aumenta la cantidad para poder pesar todos los ingredientes con precisión de 0,1 g.
            </p>
          )}
        </section>
        <section className="calculator-result" aria-live="polite">
          <div className="calculator-result-heading">
            <span className="eyebrow">TU MEZCLA, ASÍ DE SENCILLA</span>
            <span className="scale-icon">
              <Scale size={28} />
            </span>
            <h2>
              1 : {ratio} : {ratio}
            </h2>
            <p>Cultivo · Agua · Harina</p>
          </div>
          <div className="ingredient-list">
            {[
              { label: 'Cultivo inicial', value: amounts?.starter, icon: FlaskConical },
              { label: 'Agua', value: amounts?.water, icon: Droplets },
              { label: 'Harina', value: amounts?.flour, icon: Wheat },
            ].map((i) => (
              <div key={i.label}>
                <i.icon size={22} />
                <span>{i.label}</span>
                <strong>
                  {i.value === undefined ? '—' : grams(i.value)} <small>g</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="mixture-total">
            <span>Total del refresco</span>
            <strong>{amounts ? grams(amounts.total) : '—'} g</strong>
          </div>
          {amounts && (
            <p className="reserve-note">
              {shortfall > 0
                ? `Faltan ${grams(shortfall)} g para cubrir la receta y la reserva previstas.`
                : `${reserve} g de reserva incluidos. Deja margen para lo que se quede en el tarro.`}
            </p>
          )}
          {!blocked && (
            <div className="calculator-timing">
              <div className="segmented" role="group" aria-label="Actividad de la masa madre">
                {starterActivityLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={activity === level}
                    onClick={() => setActivity(level)}
                  >
                    {starterActivityLabels[level]}
                  </button>
                ))}
              </div>
              <div className="calculator-timing-row">
                <span>
                  {activity === 'unknown' ? 'Actividad' : 'Tiempo orientativo hasta el pico'}
                </span>
                <strong>
                  {activity === 'unknown' ? 'Sin confirmar' : peakLabel(ratio, activity)}
                </strong>
              </div>
              {activity === 'unknown' && (
                <p>
                  Elige cómo suele responder tu masa si lo sabes. Si aún tienes dudas, observa cómo
                  crece tras el refresco.
                </p>
              )}
              <p>
                Referencias para masa madre madura a 24–25 °C. Con más calor suele ir más rápido.
                Con más frío, más despacio. Si sigue subiendo, dale más tiempo.
              </p>
              {embedded && activity !== 'active' && (
                <p>Primera revisión en unas {firstStarterCheckHours} h para ver cómo responde.</p>
              )}
              <details className="calculator-timing-details">
                <summary>Ver tiempos por proporción</summary>
                <table aria-label="Tiempos orientativos hasta el pico">
                  <thead>
                    <tr>
                      <th scope="col">Proporción</th>
                      {starterActivityLevels.map((level) => (
                        <th key={level} scope="col">
                          {starterActivityLabels[level]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedingRatios.map((n) => (
                      <tr key={n}>
                        <th scope="row">
                          1:{n}:{n}
                        </th>
                        {starterActivityLevels.map((level) => (
                          <td key={level}>{peakLabel(n, level)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <p>
                Cuando termine el refresco, añade una observación en Mi historial con cómo creció y
                cuándo llegó al pico, si lo viste.
              </p>
            </div>
          )}
          <div className="stack-actions">
            <button
              className="primary"
              disabled={!amounts || !!tooSmall || blocked}
              onClick={() =>
                amounts &&
                onFeed({
                  ratio,
                  starterG: amounts.starter,
                  waterG: amounts.water,
                  flourG: amounts.flour,
                  ...(embedded && { bakingStarterActive: activity === 'active' }),
                })
              }
            >
              Registrar este refresco
            </button>
            <button
              className="secondary"
              disabled={!amounts || !!tooSmall}
              onClick={() => void copy()}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}Copiar cantidades
            </button>
          </div>
          {blocked && (
            <Notice danger>
              {data.starter.hydration !== 100
                ? 'Este cultivo está fuera del alcance de la guía (100 % de hidratación).'
                : 'Hay una señal de contaminación registrada. No refresques este cultivo.'}
            </Notice>
          )}
          <p className="rounding-note">
            Mostramos décimas de gramo y repartimos el redondeo para que la suma coincida con el
            total.
          </p>
        </section>
      </div>
    </>
  );
}
