import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { BookOpen, Sparkles, Plus, Calculator, Leaf, ChevronRight, RefreshCw } from 'lucide-react';
import { Jar, Miga } from '../components/Illustrations';
import { dateLabel, inputDate, Modal } from '../components/UI';
import {
  atRoomSinceFeeding,
  feedingBlock,
  latestBakingFeeding,
  latestFeeding,
} from '../domain/starter';
import type { StoragePlace } from '../domain/starter';
import type { PageProps } from '../types';
export function Home({ data, navigate, update }: PageProps) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);

  function closeEditor() {
    setEditing(false);
    editButton.current?.focus();
  }

  const last = data.starter.lastFedAt;
  const movedAt = data.starter.storageChangedAt;
  const latest = latestFeeding(data);
  const trackingSince = Math.max(last ? Date.parse(last) : 0, movedAt ? Date.parse(movedAt) : 0);
  const observation = data.observations.find(
    (entry) =>
      Math.floor(Date.parse(entry.observedAt) / 60_000) >= Math.floor(trackingSince / 60_000),
  );
  const unsafe = Boolean(feedingBlock(data).contamination);
  const knownLocation = Boolean(movedAt || latest);
  const inFridge = knownLocation && data.starter.storage === 'fridge';
  const fermenting = latest && atRoomSinceFeeding(data.starter, latest);
  const review =
    unsafe || inFridge || data.recovery ? undefined : latestBakingFeeding(data)?.bakingCheck;
  const activityLabels = {
    peak: 'En el pico',
    rising: 'Está creciendo',
    fallen: 'Después del pico',
    quiet: 'Aún sin subida',
    unknown: '',
  };
  const activityLabel = observation ? activityLabels[observation.activity] : '';
  const status = unsafe
    ? 'Revisa su seguridad'
    : inFridge
      ? 'En la nevera'
      : activityLabel ||
        (fermenting
          ? 'Fermentando'
          : knownLocation
            ? 'A temperatura ambiente'
            : 'Crecimiento sin registrar');
  const statusSince = inFridge
    ? movedAt
    : activityLabel
      ? observation?.observedAt
      : fermenting
        ? latest.fedAt
        : movedAt;

  function changeStorage(storage: StoragePlace) {
    void update({
      type: 'starter',
      changes: { storage, storageChangedAt: new Date().toISOString() },
    });
  }
  return (
    <>
      <header className="home-heading">
        <div>
          <span className="eyebrow">
            <span className="tiny-sun">✳</span> UN POQUITO DE CUIDADO, MUCHA VIDA
          </span>
          <h1>
            Tu masa madre,
            <br />
            <span>en buenas manos.</span>
          </h1>
          <p>Aprende a escucharla. Miga te acompaña.</p>
        </div>
        <div className="heading-note">
          <Leaf size={17} />
          <span>
            Un refresco
            <br />a la vez.
          </span>
        </div>
      </header>
      <div className="home-grid">
        <section className="starter-hero">
          <div className="hero-copy">
            <span className="overline">TU PEQUEÑO CULTIVO</span>
            <div className="hero-cultivation-name">
              <h2>{data.starter.name}</h2>
              <button
                className="text-button"
                ref={editButton}
                aria-label="Editar mi masa madre"
                onClick={() => setEditing(true)}
              >
                Editar
              </button>
            </div>
            <div className="hero-last-feeding">
              {last ? (
                <>
                  Último refresco: <time dateTime={last}>{dateLabel(last)}</time>
                </>
              ) : (
                'Sin fecha de refresco'
              )}
            </div>
            <span className={`state-chip ${unsafe ? 'unsafe' : ''}`}>
              <span />
              {status}
            </span>
            {statusSince && !unsafe && (
              <div className="hero-last-feeding">
                Desde el <time dateTime={statusSince}>{dateLabel(statusSince)}</time>
              </div>
            )}
            {unsafe && (
              <p>Hay una señal de contaminación registrada. No refresques este cultivo.</p>
            )}
            {!unsafe && (
              <div className="hero-storage-actions">
                {(!knownLocation || !inFridge) && (
                  <button className="text-button" onClick={() => changeStorage('fridge')}>
                    Guardar en la nevera
                  </button>
                )}
                {(!knownLocation || inFridge) && (
                  <button className="text-button" onClick={() => changeStorage('room')}>
                    Dejar a temperatura ambiente
                  </button>
                )}
              </div>
            )}
            <button className="primary" onClick={() => navigate('assistant')}>
              <Sparkles size={18} />
              {data.recovery && !unsafe && data.starter.hydration === 100
                ? 'Continuar recuperación'
                : review
                  ? Date.parse(review.at) <= Date.now()
                    ? 'Revisar actividad'
                    : 'Revisar el ' + dateLabel(review.at)
                  : 'Ver qué necesita'}
            </button>
          </div>
          <div className="hero-illustration">
            <span className="art-orbit" />
            <Jar
              state={
                unsafe
                  ? 'unsafe'
                  : observation?.safety === 'hooch'
                    ? 'hooch'
                    : observation?.activity === 'peak' || observation?.activity === 'rising'
                      ? 'active'
                      : 'quiet'
              }
            />
            <span className="handwritten">pequeña, pero viva</span>
          </div>
          <span className="hero-leaf leaf-one" />
          <span className="hero-leaf leaf-two" />
        </section>
        <section className="miga-invite">
          <div className="miga-invite-top">
            <span className="mini-label">
              <Sparkles size={14} />
              TU COMPAÑERA
            </span>
            <span className="hello-tag">¡Hola!</span>
          </div>
          <Miga waving />
          <h2>¿Qué quieres hacer hoy?</h2>
          <div className="miga-actions">
            <a className="secondary" href="#assistant/bake">
              Quiero hacer pan <ChevronRight size={17} />
            </a>
            <a className="secondary" href="#assistant/maintain">
              Quiero refrescar mi masa <ChevronRight size={17} />
            </a>
          </div>
        </section>
      </div>
      {editing && <EditCultivation data={data} update={update} onClose={closeEditor} />}
      <section className="explore-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A TU RITMO</span>
            <h2>¿Por dónde empezamos?</h2>
          </div>
          <span className="section-note">Lo esencial, sin complicaciones.</span>
        </div>
        <div className="quick-cards">
          <button className="quick-card" onClick={() => navigate('guide')}>
            <span className="quick-icon mint">
              <BookOpen size={25} />
            </span>
            <span className="quick-content">
              <h3>Entiende tu masa madre</h3>
              <p>Una guía visual para saber qué hacer y por qué.</p>
              <span className="card-link">
                Explorar la guía <ChevronRight size={16} />
              </span>
            </span>
          </button>
          <button className="quick-card" onClick={() => navigate('calculator')}>
            <span className="quick-icon wheat">
              <Calculator size={25} />
            </span>
            <span className="quick-content">
              <h3>Cada gramo cuenta</h3>
              <p>Calcula tu refresco, con la reserva que necesitas.</p>
              <span className="card-link">
                Calcular cantidades <ChevronRight size={16} />
              </span>
            </span>
          </button>
          <button className="quick-card" onClick={() => navigate('history')}>
            <span className="quick-icon peach">
              <RefreshCw size={25} />
            </span>
            <span className="quick-content">
              <h3>Pequeños pasos, más vida</h3>
              <p>Guarda tus refrescos y observa cómo evoluciona.</p>
              <span className="card-link">
                Ver mi historial <ChevronRight size={16} />
              </span>
            </span>
          </button>
        </div>
      </section>
      <button
        className="add-observation"
        onClick={() => {
          location.hash = 'history/observe';
        }}
      >
        <Plus size={20} />
        ¿Ves algo nuevo?<strong>Registrar una observación</strong>
      </button>
      <p className="scope-line">
        <Leaf size={14} /> Para masa madre madura de trigo al 100 % de hidratación. Los tiempos
        orientan; la actividad decide.
      </p>
    </>
  );
}

function EditCultivation({
  data,
  update,
  onClose,
}: Pick<PageProps, 'data' | 'update'> & { onClose: () => void }) {
  const [initial] = useState(data.starter);
  const [error, setError] = useState('');
  const initialDate = initial.lastFedAt ? inputDate(new Date(initial.lastFedAt)) : '';

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get('name')).trim();
    const date = String(fields.get('lastFedAt'));
    if (!name) {
      setError('Escribe un nombre para tu masa madre.');
      return;
    }
    let lastFedAt = data.starter.lastFedAt;
    if (date !== initialDate) {
      const time = Date.parse(date);
      if (date && (!Number.isFinite(time) || time > Date.now())) {
        setError('La fecha debe ser válida y no estar en el futuro.');
        return;
      }
      lastFedAt = date ? new Date(time).toISOString() : null;
    }
    const result = await update({
      type: 'starter',
      changes: {
        ...(name !== initial.name && { name }),
        ...(date !== initialDate && { lastFedAt }),
      },
    });
    if (result === 'blocked') return;
    onClose();
  }

  return (
    <Modal title="Editar mi masa madre" onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        <label>
          Nombre
          <input name="name" defaultValue={initial.name} maxLength={45} required />
        </label>
        <label>
          Último refresco (si lo sabes)
          <input
            type="datetime-local"
            name="lastFedAt"
            defaultValue={initialDate}
            max={inputDate()}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          Guardar cambios
        </button>
      </form>
    </Modal>
  );
}
