import { useState } from 'react';
import { Download, Save, Smartphone, LockKeyhole, Sprout } from 'lucide-react';
import { PageTitle, Notice, inputDate } from '../components/UI';
import { createData } from '../domain/starter';
import type { StoragePlace } from '../domain/starter';
import type { PageProps } from '../types';
export function Settings({
  data,
  update,
  notify,
  onExport,
  onInstall,
  canInstall,
}: PageProps & { onExport: () => void; onInstall: () => void; canInstall: boolean }) {
  const [name, setName] = useState(data.starter.name);
  const [storage, setStorage] = useState(data.starter.storage);
  const [lastFed, setLastFed] = useState(
    data.starter.lastFedAt ? inputDate(new Date(data.starter.lastFedAt)) : '',
  );
  const [hydration, setHydration] = useState(String(data.starter.hydration));
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (
      !name.trim() ||
      !hydration.trim() ||
      !Number.isFinite(Number(hydration)) ||
      Number(hydration) <= 0 ||
      Number(hydration) > 300
    ) {
      setError('Revisa el nombre y la hidratación (mayor que 0, hasta 300 %).');
      return;
    }
    if (lastFed && (!Number.isFinite(Date.parse(lastFed)) || Date.parse(lastFed) > Date.now())) {
      setError('La fecha debe ser válida y no estar en el futuro.');
      return;
    }
    update({
      ...data,
      starter: {
        ...data.starter,
        name: name.trim(),
        storage,
        ...(storage !== data.starter.storage && { storageChangedAt: new Date().toISOString() }),
        hydration: Number(hydration),
        lastFedAt: lastFed ? new Date(lastFed).toISOString() : null,
      },
    });
    notify('Datos del cultivo guardados.');
  }
  return (
    <>
      <PageTitle eyebrow="UN HOGAR PARA TU CULTIVO" title="A tu manera.">
        Unos datos para que Miga conozca mejor tu masa madre.
      </PageTitle>
      <div className="settings-layout">
        <section className="reading-card">
          <h2>Mi masa madre</h2>
          <form onSubmit={save} className="form-stack">
            <label>
              ¿Cómo se llama?
              <input
                value={name}
                maxLength={45}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="form-two">
              <label>
                Harina
                <input value="Trigo" readOnly />
                <small>Los protocolos son para cultivo maduro de trigo.</small>
              </label>
              <label>
                Hidratación (%)
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={hydration}
                  onChange={(e) => setHydration(e.target.value)}
                />
              </label>
            </div>
            {Number(hydration) !== 100 && (
              <Notice>
                Guardaremos el dato, pero Miga no recomendará protocolos de refresco: esta versión
                solo cubre el 100 % de hidratación.
              </Notice>
            )}
            <label>
              Conservación
              <select value={storage} onChange={(e) => setStorage(e.target.value as StoragePlace)}>
                <option value="fridge">Nevera</option>
                <option value="room">Temperatura ambiente</option>
              </select>
            </label>
            <label>
              Último refresco (si lo sabes)
              <input
                type="datetime-local"
                max={inputDate()}
                value={lastFed}
                onChange={(e) => setLastFed(e.target.value)}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" type="submit">
              <Save size={17} />
              Guardar mi cultivo
            </button>
          </form>
        </section>
        <div className="settings-side">
          <section className="reading-card">
            <span className="quick-icon mint">
              <LockKeyhole />
            </span>
            <h2>Tu tarro, tus datos.</h2>
            <p>
              Se guardan en este navegador, en este dispositivo. No hay cuenta ni sincronización.
              Borrar los datos del navegador elimina el historial.
            </p>
            <button className="secondary" onClick={onExport}>
              <Download size={17} />
              Descargar copia de mis datos
            </button>
          </section>
          <section className="reading-card">
            <span className="quick-icon wheat">
              <Smartphone />
            </span>
            <h2>Un huequito en tu móvil</h2>
            <p>
              Puedes añadir Miga a tu pantalla de inicio. Tras una primera visita online, la versión
              de producción funciona sin conexión.
            </p>
            {canInstall ? (
              <button className="secondary" onClick={onInstall}>
                Instalar Miga
              </button>
            ) : (
              <p className="field-hint">
                En Safari: Compartir → Añadir a pantalla de inicio. En Chrome: menú → Instalar
                aplicación, cuando esté disponible. En desarrollo no activamos la caché offline.
              </p>
            )}
          </section>
          <section className="reading-card new-culture">
            <Sprout />
            <h3>Empezar con un cultivo nuevo</h3>
            <p>
              Descarga antes tu copia. Esta acción reemplaza el cultivo y vacía el historial local.
            </p>
            {reset ? (
              <>
                <Notice danger>
                  ¿Quieres sustituir el cultivo actual y borrar sus registros de este navegador?
                  Esta acción no se puede deshacer.
                </Notice>
                <div className="inline-actions">
                  <button
                    className="danger-button"
                    onClick={() => {
                      update(createData());
                      notify('Nuevo cultivo creado.');
                      location.hash = 'home';
                    }}
                  >
                    Sí, empezar de nuevo
                  </button>
                  <button className="secondary" onClick={() => setReset(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <button className="text-button danger-text" onClick={() => setReset(true)}>
                Empezar de nuevo
              </button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
