import { useRef, useState } from 'react';
import { Plus, Droplets, Sprout, Clock3, Thermometer } from 'lucide-react';
import { PageTitle, Notice, Modal, dateLabel, inputDate, grams } from '../components/UI';
import { FeedingModal } from '../components/FeedingModal';
import type { PageProps } from '../types';
import { isContaminated } from '../domain/starter';
import type { Activity, Feeding, Observation, Safety } from '../domain/starter';
const activities: Record<Activity, string> = {
  unknown: 'Sin actividad definida',
  quiet: 'Poca actividad',
  rising: 'Está creciendo',
  peak: 'En el pico',
  fallen: 'Ha subido y bajado',
};
const safetyLabels: Record<Safety, string> = {
  unknown: 'Seguridad sin comprobar',
  healthy: 'Aspecto y aroma normales',
  hooch: 'Líquido gris o marrón',
  contamination: 'Moho o vetas rosas o naranjas',
  mold: 'Moho observado',
  pink: 'Color rosa o naranja',
  rotten: 'Olor putrefacto',
};

type HistoryEntry =
  | { kind: 'feeding'; id: string; date: string; feeding: Feeding }
  | { kind: 'observation'; id: string; date: string; observation: Observation };
type Editor = { kind: 'new' } | { kind: 'edit' | 'delete'; entry: HistoryEntry };

export function History({ data, update, notify, navigate }: PageProps) {
  const [tab, setTab] = useState<'all' | 'feedings' | 'observations'>('all');
  const [editor, setEditor] = useState<Editor | null>(() =>
    location.hash.includes('/observe') ? { kind: 'new' } : null,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  function closeEditor(removed = false) {
    setEditor(null);
    const target = !removed && trigger.current?.isConnected ? trigger.current : addButton.current;
    target?.focus();
  }

  async function deleteEntry(entry: HistoryEntry) {
    const feeding = entry.kind === 'feeding';
    const result = await update(
      feeding
        ? { type: 'revise-feeding', original: entry.feeding }
        : { type: 'revise-observation', original: entry.observation },
    );
    if (result === 'blocked') return;
    closeEditor(true);
    if (result === 'saved') notify(feeding ? 'Refresco eliminado.' : 'Observación eliminada.');
  }

  const entries: HistoryEntry[] = [
    ...data.feedings.map((f) => ({
      kind: 'feeding' as const,
      id: f.id,
      date: f.fedAt,
      feeding: f,
    })),
    ...data.observations.map((o) => ({
      kind: 'observation' as const,
      id: o.id,
      date: o.observedAt,
      observation: o,
    })),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter(
      (e) =>
        tab === 'all' || (tab === 'feedings' ? e.kind === 'feeding' : e.kind === 'observation'),
    );
  return (
    <>
      <div className="page-heading-row">
        <PageTitle eyebrow="CONOCER SU RITMO LLEVA TIEMPO" title="Pequeños pasos, mucha vida.">
          Tus refrescos y observaciones, en un mismo lugar.
        </PageTitle>
        <button
          className="primary"
          ref={addButton}
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setEditor({ kind: 'new' });
          }}
        >
          <Plus size={18} />
          Añadir observación
        </button>
      </div>
      <div className="history-summary">
        <span className="quick-icon peach">
          <Clock3 />
        </span>
        <strong>
          {data.starter.lastFedAt ? dateLabel(data.starter.lastFedAt) : 'Aún por empezar'}
        </strong>
        <span>último refresco indicado</span>
      </div>
      <div className="tab-bar" role="tablist" aria-label="Filtrar historial">
        {(
          [
            ['all', 'Todo'],
            ['feedings', 'Refrescos'],
            ['observations', 'Observaciones'],
          ] as const
        ).map(([id, title]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {title}
          </button>
        ))}
      </div>
      {entries.length ? (
        <div className="history-list">
          {entries.map((entry) => (
            <article className="history-entry" key={entry.kind + entry.id}>
              <span className={`entry-icon ${entry.kind === 'feeding' ? 'mint' : 'wheat'}`}>
                {entry.kind === 'feeding' ? <Droplets size={21} /> : <Sprout size={21} />}
              </span>
              <div className="entry-main">
                <div className="entry-heading">
                  <h3>
                    {entry.kind === 'feeding'
                      ? 'Refresco registrado'
                      : activities[entry.observation.activity]}
                  </h3>
                  <time dateTime={entry.date}>{dateLabel(entry.date)}</time>
                </div>
                {entry.kind === 'feeding' ? (
                  <>
                    <p>
                      {grams(entry.feeding.starterG)} g de cultivo + {grams(entry.feeding.waterG)} g
                      de agua + {grams(entry.feeding.flourG)} g de harina
                    </p>
                    <div className="entry-tags">
                      <span>
                        Proporción sugerida 1:{entry.feeding.ratio}:{entry.feeding.ratio}
                      </span>
                      <span>
                        <Thermometer size={13} />
                        {entry.feeding.temperature} °C
                      </span>
                      <span>
                        {entry.feeding.storage === 'fridge'
                          ? 'Nevera después del arranque'
                          : 'Ambiente'}
                      </span>
                    </div>
                    {entry.feeding.notes && <p className="entry-notes">{entry.feeding.notes}</p>}
                  </>
                ) : (
                  <>
                    <p className={isContaminated(entry.observation.safety) ? 'danger-text' : ''}>
                      {safetyLabels[entry.observation.safety]}
                    </p>
                    <div className="entry-tags">
                      {entry.observation.peakHours !== null && (
                        <span>Pico en {entry.observation.peakHours} h</span>
                      )}
                      {entry.observation.bubbles && <span>Con burbujas</span>}
                    </div>
                    {entry.observation.notes && (
                      <p className="entry-notes">{entry.observation.notes}</p>
                    )}
                  </>
                )}
                <div className="history-entry-actions">
                  <button
                    type="button"
                    className="text-button"
                    aria-label={entry.kind === 'feeding' ? 'Editar refresco' : 'Editar observación'}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setEditor({ kind: 'edit', entry });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-button danger-text"
                    aria-label={
                      entry.kind === 'feeding' ? 'Eliminar refresco' : 'Eliminar observación'
                    }
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setEditor({ kind: 'delete', entry });
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Sprout size={42} />
          <h2>Todo empieza con una mirada.</h2>
          <p>
            Aún no hay{' '}
            {tab === 'feedings'
              ? 'refrescos'
              : tab === 'observations'
                ? 'observaciones'
                : 'registros'}{' '}
            aquí. Miga te ayuda a encontrar tu primer paso.
          </p>
          <button className="primary" onClick={() => navigate('assistant')}>
            Empezar con Miga
          </button>
        </div>
      )}
      {tab === 'observations' && (
        <Notice>
          Aquí guardas cómo ha crecido tu masa madre, qué aspecto tiene y cómo huele. Para saber si
          está lista para hornear, comprueba que crece con vigor de forma repetida.
        </Notice>
      )}
      {(editor?.kind === 'new' ||
        (editor?.kind === 'edit' && editor.entry.kind === 'observation')) && (
        <ObservationEditor
          original={
            editor.kind === 'edit' && editor.entry.kind === 'observation'
              ? editor.entry.observation
              : undefined
          }
          update={update}
          notify={notify}
          onClose={() => closeEditor()}
        />
      )}
      {editor?.kind === 'edit' && editor.entry.kind === 'feeding' && (
        <FeedingModal
          data={data}
          update={update}
          notify={notify}
          navigate={navigate}
          editing={editor.entry.feeding}
          onClose={() => closeEditor()}
        />
      )}
      {editor?.kind === 'delete' && (
        <Modal
          title={editor.entry.kind === 'feeding' ? 'Eliminar refresco' : 'Eliminar observación'}
          onClose={() => closeEditor()}
        >
          <div className="form-stack">
            <p>
              Se eliminará el registro del {dateLabel(editor.entry.date)}. Esta acción no se puede
              deshacer.
            </p>
            {editor.entry.kind === 'observation' &&
              isContaminated(editor.entry.observation.safety) && (
                <Notice>El bloqueo de refrescos para este cultivo seguirá activo.</Notice>
              )}
            <div className="inline-actions">
              <button type="button" className="secondary" onClick={() => closeEditor()}>
                Cancelar
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void deleteEntry(editor.entry)}
              >
                {editor.entry.kind === 'feeding' ? 'Eliminar refresco' : 'Eliminar observación'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ObservationEditor({
  original,
  update,
  notify,
  onClose,
}: Pick<PageProps, 'update' | 'notify'> & {
  original?: Observation;
  onClose: () => void;
}) {
  const originalDate = original ? inputDate(new Date(original.observedAt)) : undefined;
  const [observedAt, setObservedAt] = useState(() => originalDate ?? inputDate());
  const [activity, setActivity] = useState<Activity>(original?.activity ?? 'unknown');
  const [safety, setSafety] = useState<Safety>(original?.safety ?? 'healthy');
  const [peakHours, setPeakHours] = useState(String(original?.peakHours ?? ''));
  const [bubbles, setBubbles] = useState(original?.bubbles ?? false);
  const [notes, setNotes] = useState(original?.notes ?? '');
  const [error, setError] = useState('');

  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const time = Date.parse(observedAt);
    if (!Number.isFinite(time) || time > Date.now()) {
      setError('La fecha debe ser válida y no estar en el futuro.');
      return;
    }
    if (peakHours !== '' && (!Number.isFinite(Number(peakHours)) || Number(peakHours) < 0)) {
      setError('El tiempo al pico debe ser un número no negativo.');
      return;
    }
    const observation: Observation = {
      id: original?.id ?? crypto.randomUUID(),
      observedAt:
        original && observedAt === originalDate
          ? original.observedAt
          : new Date(time).toISOString(),
      activity,
      safety,
      peakHours: peakHours === '' ? null : Number(peakHours),
      bubbles,
      notes,
    };
    const result = await update(
      original
        ? { type: 'revise-observation', original, observation }
        : { type: 'observation', observation },
    );
    if (result === 'blocked') return;
    if (result === 'saved') notify(original ? 'Observación actualizada.' : 'Observación guardada.');
    onClose();
  }

  return (
    <Modal title={original ? 'Editar observación' : 'Una mirada a tu masa madre'} onClose={onClose}>
      <form onSubmit={save} className="form-stack">
        <label>
          Fecha y hora
          <input
            type="datetime-local"
            value={observedAt}
            max={inputDate()}
            required
            onChange={(e) => setObservedAt(e.target.value)}
          />
        </label>
        <div className="form-two">
          <label>
            Actividad
            <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
              {Object.entries(activities).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Seguridad
            <select value={safety} onChange={(e) => setSafety(e.target.value as Safety)}>
              {Object.entries(safetyLabels)
                .filter(([v]) => v === original?.safety || (v !== 'mold' && v !== 'pink'))
                .map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          Tiempo al pico (h, opcional)
          <input
            type="number"
            min="0"
            step={original ? 'any' : '0.1'}
            value={peakHours}
            placeholder="Ej. 7"
            onChange={(e) => setPeakHours(e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={bubbles} onChange={(e) => setBubbles(e.target.checked)} />
          Observo burbujas
        </label>
        <label>
          Notas (opcional)
          <textarea
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Qué ha cambiado, cómo se ve…"
          />
        </label>
        {isContaminated(safety) && (
          <Notice danger>
            Esta señal implica desechar todo el cultivo, sin intentar rescatar una parte.
          </Notice>
        )}
        {original && isContaminated(original.safety) && !isContaminated(safety) && (
          <Notice>Editar esta señal mantiene el bloqueo de refrescos para este cultivo.</Notice>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          {original ? 'Guardar cambios' : 'Guardar observación'}
        </button>
      </form>
    </Modal>
  );
}
