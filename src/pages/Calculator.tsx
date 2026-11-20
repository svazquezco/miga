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
import { displayedAmounts, isContaminated } from '../domain/starter';
import type { Ratio } from '../domain/starter';
import type { PageProps, FeedRequest } from '../types';
export function Calculator({
  data,
  notify,
  onFeed,
}: PageProps & { onFeed: (request: FeedRequest) => void }) {
  const [recipe, setRecipe] = useState('200');
  const [reserve, setReserve] = useState('20');
  const [ratio, setRatio] = useState<Ratio>(2);
  const [copied, setCopied] = useState(false);
  let amounts: ReturnType<typeof displayedAmounts> | null = null;
  if (recipe.trim() && reserve.trim()) {
    try {
      amounts = displayedAmounts(Number(recipe), Number(reserve), ratio);
    } catch {
      /* Inline validation below. */
    }
  }
  const tooSmall = amounts && [amounts.starter, amounts.water, amounts.flour].some((n) => n <= 0);
  const blocked =
    data.starter.hydration !== 100 || data.observations.some((o) => isContaminated(o.safety));
  async function copy() {
    if (!amounts) return;
    const text = `Refresco 1:${ratio}:${ratio} (cultivo : agua : harina)\nCultivo: ${grams(amounts.starter)} g\nAgua: ${grams(amounts.water)} g\nHarina: ${grams(amounts.flour)} g\nTotal: ${grams(amounts.total)} g (reserva: ${reserve} g)`;
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
      <PageTitle eyebrow="LO JUSTO, CON UN POQUITO DE RESERVA" title="Cada gramo tiene su sitio.">
        Calcula tu último refresco para la receta o el mantenimiento.
      </PageTitle>
      <div className="calculator-layout">
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
              {([1, 2, 3, 5] as const).map((n) => (
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
          {!amounts && (
            <p className="form-error" role="alert">
              Completa ambas cantidades con números no negativos. El total debe ser mayor que cero.
            </p>
          )}
          {tooSmall && (
            <p className="form-error" role="alert">
              Aumenta la cantidad para poder pesar todos los ingredientes con precisión de 0,1 g.
            </p>
          )}
          <Notice>
            Más alimento por parte de cultivo suele alargar el tiempo hasta el pico. La proporción
            no garantiza por sí sola que esté lista.
          </Notice>
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
          <p className="reserve-note">
            {reserve || '0'} g de reserva incluidos. No cubre los restos que queden adheridos al
            recipiente.
          </p>
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
                })
              }
            >
              Registrar este refresco
            </button>
            <button className="secondary" disabled={!amounts} onClick={() => void copy()}>
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
