import { peakTimeReferences, explainProtocolRatio } from '../domain/starter';
import type { Protocol, FeedingPace } from '../domain/starter';
export function FeedingPaceChoice({
  value,
  onChange,
}: {
  value: FeedingPace;
  onChange: (value: FeedingPace) => void;
}) {
  return (
    <fieldset className="feeding-pace-choice">
      <legend>Para el próximo refresco de rutina</legend>
      <p>
        Si está sana y activa, ¿prefieres su ritmo habitual o darle más alimento para alargar la
        fermentación?
      </p>
      <div>
        <button type="button" aria-pressed={value === 'usual'} onClick={() => onChange('usual')}>
          Refresco habitual · 1:1:1
        </button>
        <button type="button" aria-pressed={value === 'longer'} onClick={() => onChange('longer')}>
          Más margen hasta el pico · 1:2:2
        </button>
      </div>
    </fieldset>
  );
}
export function RatioExplanation({ protocol }: { protocol: Protocol }) {
  return <p className="ratio-explanation">{explainProtocolRatio(protocol)}</p>;
}
export function ProtocolTiming({
  protocol,
  temperature,
}: {
  protocol: Protocol;
  temperature?: number;
}) {
  const reference = peakTimeReferences.find((item) => item.ratio === protocol.ratio);
  if (!reference) return null;
  return (
    <section className="protocol-timing" aria-label="Temperatura y tiempos de referencia">
      <h3>¿Cuánto puede tardar este refresco?</h3>
      <p>
        Ejemplo con un cultivo maduro y ya activo a <strong>25–26 °C</strong>, usando{' '}
        <strong>
          1:{protocol.ratio}:{protocol.ratio}
        </strong>
        .
      </p>
      <dl>
        <div>
          <dt>Crecimiento</dt>
          <dd>{reference.doubling}</dd>
        </div>
        <div>
          <dt>Referencia hasta el pico</dt>
          <dd>{reference.peak}</dd>
        </div>
      </dl>
      {temperature !== undefined && (
        <p className="temperature-context">
          Has indicado {temperature} °C. El ejemplo no calcula una hora exacta para tu cultivo.
        </p>
      )}
      <p>
        Si está en recuperación, el primer ciclo puede tardar más. Si supera estas horas y sigue
        creciendo, deja que madure. Si responde pero sigue lenta, repite{' '}
        <strong>
          1:{protocol.ratio}:{protocol.ratio}
        </strong>{' '}
        al madurar y comprueba si mejora en los siguientes ciclos.
      </p>
      <p>
        Si no ves fermentación, revisa la temperatura y sigue observando antes de repetir. Las horas
        orientan; por sí solas no indican que esté lista ni que necesite otro refresco.
      </p>
    </section>
  );
}
