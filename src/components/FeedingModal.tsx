import { useState } from 'react';
import { Modal, Notice, inputDate } from './UI';
import { bakingCheckAt, feedingBlock, feedingTiming, isContaminated } from '../domain/starter';
import type { Feeding, Safety, StoragePlace } from '../domain/starter';
import type { PageProps, FeedRequest } from '../types';
export function FeedingModal({
  data,
  update,
  notify,
  request,
  onClose,
  onSaved,
}: PageProps & {
  request: FeedRequest;
  onClose: () => void;
  onSaved?: (feeding: Feeding) => void;
}) {
  const [date, setDate] = useState(inputDate());
  const [starter, setStarter] = useState(String(request.starterG));
  const [water, setWater] = useState(String(request.waterG));
  const [flour, setFlour] = useState(String(request.flourG));
  const [temperature, setTemperature] = useState(String(data.starter.temperature));
  const baking = request.bakingStarterActive !== undefined;
  const recovery = request.recoveryStage ? data.recovery : undefined;
  const recovering = request.recoveryStage !== undefined;
  const atRoomTemperature = baking || recovering;
  const [storage, setStorage] = useState<StoragePlace>('room');
  const [notes, setNotes] = useState('');
  const [safety, setSafety] = useState<Safety>('unknown');
  const [error, setError] = useState('');
  const { blocked } = feedingBlock(data);
  const amounts = { starterG: Number(starter), waterG: Number(water), flourG: Number(flour) };
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (blocked) return;
    if (recovering && (!recovery || recovery.stage !== request.recoveryStage)) {
      setError(
        'El estado de recuperación ha cambiado. Cierra el formulario y vuelve a intentarlo.',
      );
      return;
    }
    if (safety === 'unknown') {
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
          rise: null,
          peakHours: null,
          bubbles: false,
          aroma: safety === 'rotten' ? 'Putrefacto' : '',
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
        (amount) => Math.abs(Number(amount) - Number(starter) * request.ratio) > 0.051,
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
      id: crypto.randomUUID(),
      fedAt: new Date(date).toISOString(),
      ratio: request.ratio,
      ...amounts,
      temperature: Number(temperature),
      storage,
      notes,
    };
    if (baking && (safety === 'healthy' || safety === 'hooch')) {
      feeding.bakingCheck = {
        at: bakingCheckAt(feeding.fedAt, feeding.ratio, request.bakingStarterActive === true),
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
      recoveryStage: request.recoveryStage,
    });
    if (saveResult === 'blocked') return;
    onSaved?.(feeding);
    if (saveResult === 'saved') notify('Refresco guardado. Ahora toca observar su evolución.');
    onClose();
  }
  return (
    <Modal title="Registrar un refresco" onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        <p>
          Proporción sugerida{' '}
          <strong>
            1:{request.ratio}:{request.ratio}
          </strong>{' '}
          · cultivo : agua : harina. Puedes registrar las cantidades que realmente has usado.
        </p>
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
              step="0.1"
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
              step="0.1"
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
              step="0.1"
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
              step="0.5"
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
        {storage === 'fridge' && (
          <Notice>
            Para mantenimiento, deja arrancar la fermentación aproximadamente 1–2 h antes de
            refrigerar, con margen para crecer. Si está débil, recupera primero su actividad.
          </Notice>
        )}
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
          {isContaminated(safety) ? 'Guardar señal de contaminación' : 'Guardar refresco realizado'}
        </button>
      </form>
    </Modal>
  );
}
