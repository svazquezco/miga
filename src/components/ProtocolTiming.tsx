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
  if (protocol.recoveryTiming) {
    return (
      <section className="protocol-timing" aria-label="Tiempo de reactivación">
        <h3>¿Cuándo volverá a crecer?</h3>
        <p>{protocol.recoveryTiming}</p>
      </section>
    );
  }
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
        <p>Has indicado {temperature} °C. El ejemplo no calcula una hora exacta para tu cultivo.</p>
      )}
      <p>
        El primer refresco tras la nevera puede tardar más. Si la masa sigue subiendo, espera. Si ya
        ha madurado pero sigue lenta, puedes darle otro refresco <strong>1:1:1</strong> o{' '}
        <strong>1:2:2</strong>. Con 1:2:2 suele tardar más en llegar al pico.
      </p>
      <p>
        Si aún no ves burbujas ni subida, revisa la temperatura y sigue observando antes de
        refrescar de nuevo.
      </p>
    </section>
  );
}
