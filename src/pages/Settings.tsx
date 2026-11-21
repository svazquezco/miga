import { useState } from 'react';
import { Download, Save, Smartphone, LockKeyhole, Sprout } from 'lucide-react';
import { PageTitle, Notice } from '../components/UI';
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
  const [draftStorage, setStorage] = useState<StoragePlace>();
  const [draftHydration, setHydration] = useState<string>();
  const storage = draftStorage ?? data.starter.storage;
  const hydration = draftHydration ?? String(data.starter.hydration);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (
      !hydration.trim() ||
      !Number.isFinite(Number(hydration)) ||
      Number(hydration) < 1 ||
      Number(hydration) > 300
    ) {
      setError('Indica una hidratación entre el 1 % y el 300 %.');
      return;
    }
    const result = await update({
      type: 'starter',
      changes: {
        ...(storage !== data.starter.storage && {
          storage,
          storageChangedAt: new Date().toISOString(),
        }),
        ...(draftHydration !== undefined && { hydration: Number(hydration) }),
      },
    });
    if (result === 'blocked') return;
    setStorage(undefined);
    setHydration(undefined);
    if (result === 'saved') notify('Datos del cultivo guardados.');
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
                    onClick={async () => {
                      const result = await update({ type: 'reset' });
                      if (result === 'blocked') return;
                      if (result === 'saved') notify('Nuevo cultivo creado.');
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
