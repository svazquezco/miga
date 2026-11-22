import { useState } from 'react';
import { Modal, Notice, inputDate } from './UI';
import {
  bakingCheckAt,
  feedingBlock,
  feedingRatios,
  feedingTiming,
  isContaminated,
  measuredFeedingRatio,
} from '../domain/starter';
import type { Feeding, Ratio, Safety, StoragePlace } from '../domain/starter';
import type { PageProps, FeedRequest } from '../types';
export function FeedingModal({
  data,
  update,
  notify,
  request,
  editing,
  onClose,
  onSaved,
}: PageProps &
  ({ request: FeedRequest; editing?: never } | { request?: never; editing: Feeding }) & {
    onClose: () => void;
    onSaved?: (feeding: Feeding) => void;
  }) {
  const initial = request ?? editing;
  const originalDate = editing ? inputDate(new Date(editing.fedAt)) : undefined;
  const [date, setDate] = useState(() => originalDate ?? inputDate());
  const [ratio, setRatio] = useState(initial.ratio);
  const [starter, setStarter] = useState(String(initial.starterG));
  const [water, setWater] = useState(String(initial.waterG));
  const [flour, setFlour] = useState(String(initial.flourG));
  const [temperature, setTemperature] = useState(
    String(editing?.temperature ?? data.starter.temperature),
  );
  const baking = request?.bakingStarterActive !== undefined;
  const recovery = request?.recoveryStage ? data.recovery : undefined;
  const recovering = request?.recoveryStage !== undefined;
  const atRoomTemperature = baking || recovering;
  const [storage, setStorage] = useState<StoragePlace>(editing?.storage ?? 'room');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [safety, setSafety] = useState<Safety>('unknown');
  const [error, setError] = useState('');
  const blocked = !editing && feedingBlock(data).blocked;
  const amounts = { starterG: Number(starter), waterG: Number(water), flourG: Number(flour) };
  const measuredRatio = baking ? measuredFeedingRatio(amounts) : undefined;
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (blocked) return;
    if (recovering && (!recovery || recovery.stage !== request?.recoveryStage)) {
      setError(
        'El estado de recuperación ha cambiado. Cierra el formulario y vuelve a intentarlo.',
      );
      return;
    }
    if (!editing && safety === 'unknown') {
      setError('Comprueba el aspecto y el olor antes de registrar el refresco.');
      return;
    }
    if (isContaminated(safety)) {
      const saveResult = await update({
        type: 'observation',
        observation: {
          id: crypto.randomUUID(),
          observedAt: new Date().toISOString(),
          safety,
          activity: 'unknown',
          peakHours: null,
          bubbles: false,
          notes: 'Señal de contaminación detectada antes de un refresco.',
        },
      });
      if (saveResult === 'blocked') return;
      if (saveResult === 'saved')
        notify('Señal de contaminación guardada. No refresques este cultivo.');
      onClose();
      return;
    }
    const values = [starter, water, flour, temperature];
    if (
      values.some((v) => !v.trim() || !Number.isFinite(Number(v)) || Number(v) <= 0) ||
      Number(temperature) > 45
    ) {
      setError('Indica cantidades mayores que cero y una temperatura válida (hasta 45 °C).');
      return;
    }
    if (
      recovering &&
      [water, flour].some(
        (amount) => Math.abs(Number(amount) - Number(starter) * initial.ratio) > 0.051,
      )
    ) {
      setError(
        'Ajusta el agua y la harina para respetar la proporción del refresco de recuperación.',
      );
      return;
    }
    const time = new Date(date).getTime();
    if (!Number.isFinite(time) || time > Date.now()) {
      setError('Indica una fecha válida que no esté en el futuro.');
      return;
    }
    const feeding: Feeding = {
      id: editing?.id ?? crypto.randomUUID(),
      fedAt: editing && date === originalDate ? editing.fedAt : new Date(time).toISOString(),
      ratio,
      ...amounts,
      temperature: Number(temperature),
      storage,
      notes,
    };
    if (editing) {
      const result = await update({ type: 'revise-feeding', original: editing, feeding });
      if (result === 'blocked') return;
      if (result === 'saved') notify('Refresco actualizado.');
      onClose();
      return;
    }
    if (baking && (safety === 'healthy' || safety === 'hooch')) {
      if (measuredRatio !== undefined) feeding.ratio = measuredRatio;
      feeding.bakingCheck = {
        at: bakingCheckAt(feeding.fedAt, measuredRatio, request?.bakingStarterActive === true),
        safety,
      };
    }
    const { latest, afterMove } = feedingTiming(data.starter, feeding.fedAt);
    if (atRoomTemperature && (!latest || !afterMove)) {
      setError('Indica la hora del refresco más reciente, con la masa a temperatura ambiente.');
      return;
    }
    const saveResult = await update({
      type: 'feeding',
      feeding,
      recoveryStage: request?.recoveryStage,
    });
    if (saveResult === 'blocked') return;
    onSaved?.(feeding);
    if (saveResult === 'saved') notify('Refresco guardado. Ahora toca observar su evolución.');
    onClose();
  }
  return (
    <Modal title={editing ? 'Editar refresco' : 'Registrar un refresco'} onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        {editing ? (
          <label>
            Proporción sugerida
            <select value={ratio} onChange={(e) => setRatio(Number(e.target.value) as Ratio)}>
              {feedingRatios.map((option) => (
                <option key={option} value={option}>
                  1:{option}:{option}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>
            Proporción sugerida{' '}
            <strong>
              1:{ratio}:{ratio}
            </strong>{' '}
            · cultivo : agua : harina. Puedes registrar las cantidades que realmente has usado.
          </p>
        )}
        {request?.bakingStarterActive && measuredRatio === undefined && (
          <Notice>
            Con estas cantidades, el reloj solo te recordará revisar el cultivo en 12 h.
          </Notice>
        )}
        <label>
          Fecha y hora
          <input
            type="datetime-local"
            value={date}
            max={inputDate()}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="form-three">
          <label>
            Cultivo (g)
            <input
              type="number"
              min="0.1"
              step={editing ? 'any' : '0.1'}
              value={starter}
              required
              onChange={(e) => setStarter(e.target.value)}
            />
          </label>
          <label>
            Agua (g)
            <input
              type="number"
              min="0.1"
              step={editing ? 'any' : '0.1'}
              value={water}
              required
              onChange={(e) => setWater(e.target.value)}
            />
          </label>
          <label>
            Harina (g)
            <input
              type="number"
              min="0.1"
              step={editing ? 'any' : '0.1'}
              value={flour}
              required
              onChange={(e) => setFlour(e.target.value)}
            />
          </label>
        </div>
        <div className="form-two">
          <label>
            Temperatura para fermentar (°C)
            <input
              type="number"
              min="1"
              max="45"
              step={editing ? 'any' : '0.5'}
              value={temperature}
              required
              onChange={(e) => setTemperature(e.target.value)}
            />
          </label>
          {!atRoomTemperature && (
            <label>
              ¿Dónde la has dejado?
              <select value={storage} onChange={(e) => setStorage(e.target.value as StoragePlace)}>
                <option value="room">A temperatura ambiente</option>
                <option value="fridge">En la nevera</option>
              </select>
            </label>
          )}
        </div>
        {!editing && storage === 'fridge' && (
          <Notice>
            Para mantenimiento, deja arrancar la fermentación aproximadamente 1–2 h antes de
            refrigerar, con margen para crecer. Si está débil, recupera primero su actividad.
          </Notice>
        )}
        {!editing && (
          <label>
            Antes de alimentar, ¿qué observas?
            <select value={safety} required onChange={(e) => setSafety(e.target.value as Safety)}>
              <option value="unknown">Selecciona una opción</option>
              <option value="healthy">Aspecto y aroma normales, sin contaminación</option>
              <option value="hooch">Líquido gris/marrón, sin otras señales</option>
              <option value="contamination">Moho o vetas rosas o naranjas</option>
              <option value="rotten">Olor putrefacto</option>
            </select>
          </label>
        )}
        {(blocked || isContaminated(safety)) && (
          <Notice danger>
            {data.starter.hydration !== 100
              ? 'Cultivo fuera del alcance: estos protocolos solo cubren el 100 % de hidratación.'
              : 'Desecha todo el cultivo. No se permite registrar un refresco con señales de contaminación.'}
          </Notice>
        )}
        <label>
          Notas (opcional)
          <textarea
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Harina utilizada, cambios respecto al plan…"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary"
          type="submit"
          disabled={blocked}
          formNoValidate={isContaminated(safety)}
        >
          {editing
            ? 'Guardar cambios'
            : isContaminated(safety)
              ? 'Guardar señal de contaminación'
              : 'Guardar refresco realizado'}
        </button>
      </form>
    </Modal>
  );
}
