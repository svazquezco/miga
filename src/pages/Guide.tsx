import { useState } from 'react';
import {
  BookOpen,
  Snowflake,
  Sun,
  ShieldCheck,
  Target,
  Sprout,
  ChevronRight,
  RotateCcw,
  Thermometer,
  Droplets,
  Wheat,
  Clock3,
} from 'lucide-react';
import { PageTitle, Notice, StepList, RatioBadge } from '../components/UI';
import { ProtocolTiming, RatioExplanation, FeedingPaceChoice } from '../components/ProtocolTiming';
import { Jar } from '../components/Illustrations';
import {
  fridgeProtocols,
  roomProtocols,
  bakingReadinessGuidance,
  peakTimeReferences,
  applyFeedingPace,
} from '../domain/starter';
import type { Protocol, FeedingPace } from '../domain/starter';
import type { PageProps } from '../types';
const topics = [
  ['flow', 'Refrescar'],
  ['basics', 'Proporciones'],
  ['activity', 'Señales del cultivo'],
  ['care', 'Conservar y hornear'],
];
export function Guide({ navigate }: PageProps) {
  const initial = location.hash.split('/')[1];
  const [topic, setTopic] = useState(topics.some(([id]) => id === initial) ? initial : 'flow');
  const [storage, setStorage] = useState<'fridge' | 'room'>('fridge');
  const [baseProtocol, setProtocol] = useState<Protocol | null>(null);
  const [feedingPace, setFeedingPace] = useState<FeedingPace>('usual');
  const protocol = baseProtocol ? applyFeedingPace(baseProtocol, feedingPace) : null;
  const choose = (id: string) => {
    setTopic(id);
    setProtocol(null);
    history.replaceState(null, '', `#guide/${id}`);
  };
  return (
    <>
      <PageTitle eyebrow="ENTENDER PARA CUIDAR" title="Guía de la masa madre">
        Elige qué quieres consultar sobre tu masa madre.
      </PageTitle>
      <div className="tab-bar guide-topics" role="tablist" aria-label="Secciones de la guía">
        {topics.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={topic === id} onClick={() => choose(id)}>
            {label}
          </button>
        ))}
      </div>
      {topic === 'flow' && (
        <>
          <div className="guide-intro">
            <div>
              <span className="eyebrow">SIGUE EL CAMINO</span>
              <h2>Cada masa madre tiene su punto de partida.</h2>
              <p>Toca un paso para explorar. El mismo recorrido guía las preguntas de Miga.</p>
            </div>
            <button className="primary" onClick={() => navigate('assistant')}>
              Hacerlo con mi asistente Miga <Sprout size={18} />
            </button>
          </div>
          <div className="flow-chart" aria-label="Diagrama de decisión del refresco">
            <div className="flow-stage">
              <span className="flow-node-icon">
                <Snowflake />
              </span>
              <h3>¿Dónde ha estado?</h3>
              <p>Nevera o ambiente</p>
              <div className="segmented">
                <button
                  aria-pressed={storage === 'fridge'}
                  onClick={() => {
                    setStorage('fridge');
                    setProtocol(null);
                  }}
                >
                  <Snowflake size={16} />
                  Nevera
                </button>
                <button
                  aria-pressed={storage === 'room'}
                  onClick={() => {
                    setStorage('room');
                    setProtocol(null);
                  }}
                >
                  <Sun size={16} />
                  Ambiente
                </button>
              </div>
            </div>
            <span className="flow-connector" />
            <button
              className="flow-stage flow-stage-button"
              onClick={() =>
                document
                  .getElementById('protocols')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              <span className="flow-node-icon">
                <Clock3 />
              </span>
              <h3>¿Hace cuánto?</h3>
              <p>Elige tu intervalo abajo</p>
              <span className="card-link">
                Encontrar mi ruta <ChevronRight size={16} />
              </span>
            </button>
            <span className="flow-connector" />
            <button className="flow-stage flow-stage-button" onClick={() => choose('activity')}>
              <span className="flow-node-icon">
                <ShieldCheck />
              </span>
              <h3>¿Está sana?</h3>
              <p>Comprueba aspecto y olor</p>
              <span className="card-link">
                Aprender las señales <ChevronRight size={16} />
              </span>
            </button>
            <span className="flow-connector" />
            <button className="flow-stage flow-stage-button" onClick={() => choose('care')}>
              <span className="flow-node-icon">
                <Target />
              </span>
              <h3>¿Qué necesitas?</h3>
              <p>Mantener o hacer pan</p>
              <span className="card-link">
                Elegir mi objetivo <ChevronRight size={16} />
              </span>
            </button>
          </div>
          <div className="flow-outcomes">
            <span>
              <ShieldCheck size={17} />
              Contaminación → desechar todo
            </span>
            <span>
              <RotateCcw size={17} />
              Cultivo sano → refrescar → observar → reevaluar
            </span>
          </div>
          <section id="protocols" className="protocol-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  TU RUTA DESDE {storage === 'fridge' ? 'LA NEVERA' : 'TEMPERATURA AMBIENTE'}
                </span>
                <h2>¿Cuánto hace del último refresco?</h2>
              </div>
            </div>
            <div className="protocol-layout">
              <div className="protocol-options">
                {(storage === 'fridge' ? fridgeProtocols : roomProtocols).map((p) => (
                  <button
                    key={p.id}
                    className={protocol?.id === p.id ? 'selected' : ''}
                    onClick={() => setProtocol(p)}
                  >
                    <span>
                      <strong>{p.band}</strong>
                      <small>{p.title}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
              <article className="protocol-detail" aria-live="polite">
                {protocol ? (
                  <>
                    <div className="protocol-detail-heading">
                      <span className="eyebrow">
                        {protocol.band} · {storage === 'fridge' ? 'NEVERA' : 'AMBIENTE'}
                      </span>
                      <RatioBadge n={protocol.ratio} />
                    </div>
                    <h2>{protocol.title}</h2>
                    <p>{protocol.description}</p>
                    {protocol.id === 'room-12' || protocol.id === 'room-24' ? (
                      <FeedingPaceChoice value={feedingPace} onChange={setFeedingPace} />
                    ) : null}
                    <RatioExplanation protocol={protocol} />
                    <div className="protocol-meta">
                      <span>{protocol.cycles}</span>
                      <span>{protocol.duration}</span>
                    </div>
                    <StepList steps={protocol.steps} />
                    <ProtocolTiming protocol={protocol} />
                    <Notice>
                      Continúa cuando veas fermentación y maduración. Estos intervalos seleccionan
                      una estrategia inicial; no son plazos garantizados.
                    </Notice>
                    <button className="primary" onClick={() => navigate('calculator')}>
                      Calcular cantidades para mi receta
                    </button>
                  </>
                ) : (
                  <div className="protocol-placeholder">
                    <Jar state="quiet" />
                    <h3>Encuentra tu punto de partida</h3>
                    <p>
                      Elige un intervalo para ver la proporción, los pasos y qué observar antes de
                      avanzar.
                    </p>
                  </div>
                )}
              </article>
            </div>
          </section>
        </>
      )}
      {topic === 'basics' && (
        <div className="reading-layout">
          <article className="reading-card">
            <BookOpen className="article-icon" />
            <h2>Refrescar es darle alimento nuevo.</h2>
            <p>
              La masa madre es un cultivo vivo. Al mezclar una parte del cultivo con agua y harina,
              renuevas su alimento para que vuelva a fermentar.
            </p>
            <h3>¿Qué significa 1:2:2?</h3>
            <div className="ratio-explainer">
              <span>
                <strong>1</strong>Cultivo
                <br />
                <small>20 g</small>
              </span>
              <b>:</b>
              <span>
                <strong>2</strong>Agua
                <br />
                <small>40 g</small>
              </span>
              <b>:</b>
              <span>
                <strong>2</strong>Harina
                <br />
                <small>40 g</small>
              </span>
            </div>
            <p>
              Siempre son partes en peso. En Miga el orden es{' '}
              <strong>cultivo : agua : harina</strong>. Un ratio mayor suele alargar el tiempo hasta
              el pico, en condiciones comparables.
            </p>
            <button className="secondary" onClick={() => navigate('calculator')}>
              Probar la calculadora
            </button>
            <section className="peak-time-reference" aria-labelledby="peak-time-heading">
              <h3 id="peak-time-heading">¿Cuántas horas hasta el pico?</h3>
              <p>
                Ejemplos para una masa madre madura y ya activa, a unos <strong>25–26 °C</strong>.
              </p>
              <table aria-label="Horas orientativas hasta el pico">
                <thead>
                  <tr>
                    <th scope="col">Refresco</th>
                    <th scope="col">Referencia de pico</th>
                  </tr>
                </thead>
                <tbody>
                  {peakTimeReferences.map(({ ratio, peak }) => (
                    <tr key={ratio}>
                      <th scope="row">
                        1:{ratio}:{ratio}
                      </th>
                      <td>{peak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Duplicar y alcanzar el pico son momentos distintos: puede haber duplicado antes de
                llegar a su máximo.
              </p>
              <Notice>
                Son ejemplos orientativos, no plazos fijos ni tiempos de recuperación desde la
                nevera. Con más frío, otro tipo de harina o un cultivo débil, el ritmo puede
                cambiar. Con otras proporciones, observa y registra tu propio tiempo al pico.
              </Notice>
              <p>
                No esperes a una hora concreta si ya ha madurado. Si sigue creciendo, deja que
                evolucione.
              </p>
            </section>
          </article>
          <article className="reading-card">
            <h2>Las cosas que cambian su ritmo</h2>
            <ul className="factor-list">
              <li>
                <Thermometer />
                <div>
                  <h3>Temperatura</h3>
                  <p>
                    Para reactivar, unos 24–26 °C como referencia. A 28–30 °C puede llegar al pico y
                    agotarse mucho antes que a 20 °C.
                  </p>
                </div>
              </li>
              <li>
                <Wheat />
                <div>
                  <h3>Harina y proporción</h3>
                  <p>
                    El alimento disponible y el tipo de harina influyen. Durante una recuperación
                    puedes usar una parte integral o de centeno.
                  </p>
                </div>
              </li>
              <li>
                <Droplets />
                <div>
                  <h3>Hidratación</h3>
                  <p>
                    Esta guía parte de un cultivo maduro de trigo al 100 %: misma cantidad de agua y
                    harina en el cultivo.
                  </p>
                </div>
              </li>
              <li>
                <Clock3 />
                <div>
                  <h3>Estado de partida</h3>
                  <p>
                    Dónde estuvo, cuánto hace del último refresco y su actividad actual ayudan a
                    elegir la ruta.
                  </p>
                </div>
              </li>
            </ul>
            <Notice>
              Esta guía no explica cómo crear un cultivo desde cero ni adapta los protocolos a masas
              madre sólidas.
            </Notice>
          </article>
        </div>
      )}
      {topic === 'activity' && (
        <>
          <div className="signal-grid">
            {(
              [
                {
                  state: 'active',
                  title: 'Vida en el tarro',
                  text: 'Crecimiento fuerte, burbujas y aroma fermentativo normal. Cerca del pico, la superficie está aireada. Para panificar, busca una respuesta repetible.',
                },
                {
                  state: 'quiet',
                  title: 'Todavía con calma',
                  text: 'Poco crecimiento no significa que necesite alimento inmediatamente. Comprueba la temperatura y espera señales de fermentación antes de repetir.',
                },
                {
                  state: 'hooch',
                  title: 'Puede tener hambre',
                  text: 'Ha subido y caído, está más líquida o tiene líquido gris o marrón. Ese líquido puede ser hooch y por sí solo no implica contaminación.',
                },
                {
                  state: 'unsafe',
                  title: 'Aquí toca desechar',
                  text: 'Moho de cualquier color, vetas rosas o naranjas u olor claramente putrefacto: desecha todo el cultivo. No rescates una parte.',
                },
              ] as const
            ).map((s) => (
              <article
                key={s.state}
                className={`signal-card ${s.state === 'unsafe' ? 'signal-danger' : ''}`}
              >
                <Jar state={s.state} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
          <Notice>
            Las ilustraciones ayudan a entender las señales; no sirven para identificar con certeza
            un cultivo real. No diagnostiques su seguridad solo por parecido visual.
          </Notice>
          <article className="reading-card peak-card">
            <Sprout />
            <div>
              <h2>El pico es un momento, no una alarma.</h2>
              <p>
                Marca el nivel al refrescar y observa la subida, el máximo y la caída.{' '}
                {bakingReadinessGuidance}
              </p>
            </div>
            <div className="peak-card-actions">
              <button className="secondary" onClick={() => navigate('history')}>
                Anotar lo que veo
              </button>
              <button className="text-button" onClick={() => choose('basics')}>
                Ver referencia de horas
              </button>
            </div>
          </article>
        </>
      )}
      {topic === 'care' && (
        <div className="reading-layout">
          <article className="reading-card">
            <span className="quick-icon mint">
              <Snowflake />
            </span>
            <h2>Quiero mantenerla</h2>
            <p>Si no vas a hacer pan pronto, el frío reduce su actividad.</p>
            <StepList
              steps={[
                'Conserva 20 g de cultivo sano y activo. Añade 40 g de agua y 40 g de harina (1:2:2).',
                'Deja que arranque la fermentación durante aproximadamente 1–2 h.',
                'Refrigera con margen para crecer y una tapa adecuada.',
                'Como referencia, revisa y refresca semanalmente, ajustando a la evolución real.',
              ]}
            />
            <Notice>
              Si estás recuperando un cultivo débil, observa primero que recupera actividad antes de
              pasar al mantenimiento.
            </Notice>
          </article>
          <article className="reading-card">
            <span className="quick-icon wheat">
              <Wheat />
            </span>
            <h2>Quiero hacer pan</h2>
            <p>
              La fuerza del cultivo manda. Prepara el último refresco cuando vuelva a responder de
              forma consistente.
            </p>
            <StepList
              steps={[
                'Sigue la ruta de recuperación según su conservación y tiempo sin refrescar.',
                bakingReadinessGuidance,
                'Calcula el cultivo para tu receta y, si quieres, una reserva.',
                'Haz el último refresco y úsalo cerca del pico.',
              ]}
            />
            <button className="primary" onClick={() => navigate('calculator')}>
              Calcular cantidades para mi receta
            </button>
          </article>
        </div>
      )}
    </>
  );
}
