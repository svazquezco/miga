import { useState } from 'react';
import { Plus, Droplets, Sprout, Clock3, Thermometer } from 'lucide-react';
import { PageTitle, Notice, Modal, dateLabel, inputDate, grams } from '../components/UI';
import type { PageProps } from '../types';
import { isContaminated } from '../domain/starter';
import type { Activity, Safety } from '../domain/starter';
export function History({ data, update, notify, navigate }: PageProps) {
  const [tab, setTab] = useState<'all' | 'feedings' | 'observations'>('all');
  const [open, setOpen] = useState(location.hash.includes('/observe'));
  const [error, setError] = useState('');
  const [observedAt, setObservedAt] = useState(inputDate());
  const [activity, setActivity] = useState<Activity>('unknown');
  const [safety, setSafety] = useState<Safety>('healthy');
  const [rise, setRise] = useState('');
  const [peakHours, setPeakHours] = useState('');
  const [bubbles, setBubbles] = useState(false);
  const [aroma, setAroma] = useState('Fermentativo normal');
  const [notes, setNotes] = useState('');
  const entries = [
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
  function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const time = new Date(observedAt).getTime();
    if (!Number.isFinite(time) || time > Date.now()) {
      setError('La fecha debe ser válida y no estar en el futuro.');
      return;
    }
    if (
      (rise !== '' && (!Number.isFinite(Number(rise)) || Number(rise) < 0)) ||
      (peakHours !== '' && (!Number.isFinite(Number(peakHours)) || Number(peakHours) < 0))
    ) {
      setError('El crecimiento y el tiempo al pico deben ser números no negativos.');
      return;
    }
    update({
      ...data,
      observations: [
        {
          id: crypto.randomUUID(),
          observedAt: new Date(observedAt).toISOString(),
          activity,
          safety,
          rise: rise === '' ? null : Number(rise),
          peakHours: peakHours === '' ? null : Number(peakHours),
          bubbles,
          aroma,
          notes,
        },
        ...data.observations,
      ].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt)),
    });
    setOpen(false);
    notify('Observación guardada.');
  }
  return (
    <>
      <div className="page-heading-row">
        <PageTitle eyebrow="CONOCER SU RITMO LLEVA TIEMPO" title="Pequeños pasos, mucha vida.">
          Tus refrescos y observaciones, en un mismo lugar.
        </PageTitle>
        <button
          className="primary"
          onClick={() => {
            setObservedAt(inputDate());
            setOpen(true);
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
            <article className="history-entry" key={entry.id}>
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
                      {entry.observation.rise !== null && (
                        <span>{entry.observation.rise}× volumen inicial</span>
                      )}
                      {entry.observation.peakHours !== null && (
                        <span>Pico en {entry.observation.peakHours} h</span>
                      )}
                      {entry.observation.bubbles && <span>Con burbujas</span>}
                      {entry.observation.aroma && <span>{entry.observation.aroma}</span>}
                    </div>
                    {entry.observation.notes && (
                      <p className="entry-notes">{entry.observation.notes}</p>
                    )}
                  </>
                )}
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
      {open && (
        <Modal title="Una mirada a tu masa madre" onClose={() => setOpen(false)}>
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
                    .filter(([v]) => v !== 'mold' && v !== 'pink')
                    .map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="form-two">
              <label>
                Volumen máximo / inicial (×)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={rise}
                  placeholder="Ej. 2"
                  onChange={(e) => setRise(e.target.value)}
                />
              </label>
              <label>
                Tiempo al pico (h, opcional)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={peakHours}
                  placeholder="Ej. 7"
                  onChange={(e) => setPeakHours(e.target.value)}
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={bubbles}
                onChange={(e) => setBubbles(e.target.checked)}
              />
              Observo burbujas
            </label>
            <label>
              Aroma
              <input value={aroma} maxLength={120} onChange={(e) => setAroma(e.target.value)} />
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
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" type="submit">
              Guardar observación
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
