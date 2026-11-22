import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { BookOpen, Plus, Calculator, Leaf, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Jar, Miga } from '../components/Illustrations';
import { dateLabel, inputDate, Modal } from '../components/UI';
import {
  feedingBlock,
  feedingMaintenanceMessages,
  feedingMaintenanceStatus,
} from '../domain/starter';
import type { PageProps } from '../types';
export function Home({ data, navigate, update }: PageProps) {
  const [editing, setEditing] = useState<'details' | 'date' | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const addDateButton = useRef<HTMLButtonElement>(null);

  function closeEditor() {
    const returnToDate = editing === 'date';
    setEditing(null);
    requestAnimationFrame(() => {
      const trigger = (returnToDate && addDateButton.current) || editButton.current;
      trigger?.focus();
    });
  }

  const last = data.starter.lastFedAt;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!last) return;
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [last]);
  const currentTime = Math.max(Date.now(), now);
  const maintenanceStatus = feedingMaintenanceStatus(
    last && Date.parse(last) <= currentTime ? last : null,
    currentTime,
  );
  const maintenance = feedingMaintenanceMessages[maintenanceStatus];
  const movedAt = data.starter.storageChangedAt;
  const trackingSince = Math.max(last ? Date.parse(last) : 0, movedAt ? Date.parse(movedAt) : 0);
  const observation = data.observations.find(
    (entry) =>
      Math.floor(Date.parse(entry.observedAt) / 60_000) >= Math.floor(trackingSince / 60_000),
  );
  const unsafe = Boolean(feedingBlock(data).contamination);
  return (
    <>
      <header className="home-heading">
        <div>
          <h1>
            Tu masa madre, <span>en buenas manos.</span>
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
      <section className="starter-hero">
        <div className="hero-copy">
          <span className="overline">TU PEQUEÑO CULTIVO</span>
          <div className="hero-cultivation-name">
            <h2>{data.starter.name}</h2>
            <button
              className="text-button"
              ref={editButton}
              aria-label="Editar mi masa madre"
              onClick={() => setEditing('details')}
            >
              Editar
            </button>
          </div>
          {!last || maintenanceStatus === 'unknown' ? (
            <button
              className="text-button"
              type="button"
              ref={addDateButton}
              onClick={() => setEditing('date')}
            >
              Añadir fecha del último refresco
            </button>
          ) : (
            <>
              <div className="hero-last-feeding">
                Último refresco: <time dateTime={last}>{dateLabel(last)}</time>
              </div>
              {!unsafe && (
                <div className="hero-culture-status">
                  Estado de mantenimiento: <strong>{maintenance.title}</strong>
                  <p className="hero-maintenance-recommendation">{maintenance.text}</p>
                </div>
              )}
            </>
          )}
          {unsafe && <p>Hay una señal de contaminación registrada. No refresques este cultivo.</p>}
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
      {editing && (
        <EditCultivation
          data={data}
          update={update}
          onClose={closeEditor}
          focusDate={editing === 'date'}
        />
      )}
      <section>
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
      <HomeActions enabled={!editing} />
    </>
  );
}

function HomeActions({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState<'manual' | 'automatic' | null>(null);
  const offered = useRef(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || offered.current) return;
    function showAtBottom() {
      const page = document.scrollingElement;
      if (!page || offered.current || page.scrollTop <= 0) return;
      if (page.scrollHeight - page.clientHeight - page.scrollTop > 24) return;
      offered.current = true;
      setOpen('automatic');
    }
    window.addEventListener('scroll', showAtBottom, { passive: true });
    return () => window.removeEventListener('scroll', showAtBottom);
  }, [enabled, open]);

  useEffect(() => {
    if (open === 'manual') dialog.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open || !enabled) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (dialog.current?.contains(document.activeElement)) launcher.current?.focus();
      setOpen(null);
    }
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [enabled, open]);

  if (!enabled) return null;

  return (
    <div className="home-actions">
      <button
        ref={launcher}
        className="home-actions-launcher"
        type="button"
        aria-label={open ? 'Cerrar opciones de Miga' : 'Abrir opciones de Miga'}
        aria-haspopup="dialog"
        aria-expanded={!!open}
        aria-controls={open ? 'home-actions-dialog' : undefined}
        onClick={() => {
          offered.current = true;
          setOpen(open ? null : 'manual');
        }}
      >
        <span aria-hidden="true">
          <Miga waving />
        </span>
      </button>
      {open && (
        <section
          id="home-actions-dialog"
          ref={dialog}
          className="home-actions-dialog"
          role="dialog"
          aria-labelledby="home-actions-title"
          tabIndex={-1}
        >
          <header>
            <h2 id="home-actions-title">¡Hola! Soy Miga, tu asistente</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Cerrar diálogo"
              onClick={() => {
                setOpen(null);
                launcher.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          </header>
          <p>Te ayudo a refrescar tu masa madre y a prepararla para tu próxima receta.</p>
          <a className="secondary" href="#assistant">
            Ir al asistente <ChevronRight size={17} />
          </a>
        </section>
      )}
    </div>
  );
}

function EditCultivation({
  data,
  update,
  onClose,
  focusDate,
}: Pick<PageProps, 'data' | 'update'> & { onClose: () => void; focusDate: boolean }) {
  const dateField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusDate) dateField.current?.focus();
  }, [focusDate]);
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
            ref={dateField}
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
