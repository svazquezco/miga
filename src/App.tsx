import { useEffect, useRef, useState } from 'react';
import { version } from '../package.json';
import {
  Home as HomeIcon,
  BookOpen,
  Sparkles,
  Calculator as CalculatorIcon,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Leaf,
  HardDrive,
  Check,
  Menu,
  X,
  Download,
} from 'lucide-react';
import { Home } from './pages/Home';
import { Guide } from './pages/Guide';
import { Assistant } from './pages/Assistant';
import { Calculator } from './pages/Calculator';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { BrandMark } from './components/Illustrations';
import { FeedingModal } from './components/FeedingModal';
import { Notice } from './components/UI';
import { STORAGE_KEY, browserStorage, createJournal, withJournalLock } from './storage/local';
import type { SaveResult } from './storage/local';
import type { Page, PageProps, FeedRequest } from './types';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
const links: { id: Page; label: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Mi masa madre', icon: HomeIcon },
  { id: 'guide', label: 'La guía', icon: BookOpen },
  { id: 'assistant', label: 'Asistente Miga', icon: Sparkles },
  { id: 'calculator', label: 'Calculadora', icon: CalculatorIcon },
  { id: 'history', label: 'Mi historial', icon: ChartNoAxesCombined },
];
const parsePage = (hash: string): Page => {
  const raw = hash.slice(1).split('/')[0];
  return [...links.map((l) => l.id), 'settings'].includes(raw) ? (raw as Page) : 'home';
};
export default function App() {
  const [journal] = useState(() => createJournal(browserStorage));
  const [snapshot, setSnapshot] = useState(journal.snapshot);
  const { data, pending, unreadable, original, conflict } = snapshot;
  const [routeKey, setRouteKey] = useState(location.hash);
  const page = parsePage(routeKey);
  const recoveryCalculator = routeKey === '#calculator/recovery';
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [toast, setToast] = useState('');
  const [feed, setFeed] = useState<FeedRequest | null>(null);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const change = () => {
      setRouteKey(location.hash);
      setMenu(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    if (!menu) return;
    sidebar.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setMenu(false);
      menuButton.current?.focus();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menu]);
  useEffect(() => {
    const handle = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handle);
    return () => window.removeEventListener('beforeinstallprompt', handle);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        journal.refresh();
        setSnapshot(journal.snapshot());
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [journal]);
  useEffect(() => {
    document.title = `Miga · ${page === 'settings' ? 'Tu cultivo' : links.find((l) => l.id === page)?.label}`;
  }, [page]);
  function navigate(next: Page) {
    if (location.hash === `#${next}`) {
      window.scrollTo({ top: 0 });
    } else location.hash = next;
  }
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5500);
  }
  async function writeJournal(write: () => SaveResult) {
    const result = await withJournalLock(write);
    setSnapshot(journal.snapshot());
    return result;
  }
  const update: PageProps['update'] = async (change) => {
    const result = await writeJournal(() => journal.update(change, data));
    if (result === 'blocked') {
      notify('No se pudo guardar. Revisa los avisos o los cambios de la otra pestaña.');
    } else if (result === 'memory') {
      notify('Hay cambios sin guardar. Puedes reintentar o descargar una copia.');
    }
    return result;
  };
  function exportData(raw = original ?? JSON.stringify(data, null, 2)) {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `miga-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Copia descargada. Guárdala en un lugar seguro.');
  }
  async function installApp() {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  }
  const props = { data, update, navigate, notify };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside id="site-navigation" ref={sidebar} className={`sidebar ${menu ? 'open' : ''}`}>
        <a href="#home" className="brand" aria-label="Miga, inicio">
          <BrandMark />
          <span>
            Miga<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="brand-caption">Tu masa madre, siempre lista.</p>
        <nav aria-label="Navegación principal">
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={() => setMenu(false)}
              className={page === l.id ? 'active' : ''}
              aria-current={page === l.id ? 'page' : undefined}
            >
              <l.icon size={20} />
              <span>{l.label}</span>
              {page === l.id && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="plant-art">
            <Leaf size={38} />
          </span>
          <p>
            Las cosas buenas
            <br />
            necesitan su tiempo.
          </p>
          <span>Y un poquito de harina.</span>
        </div>
        <div className="sidebar-bottom">
          <a
            href="#settings"
            className={page === 'settings' ? 'active' : ''}
            onClick={() => setMenu(false)}
          >
            <SettingsIcon size={18} />
            Ajustes
          </a>
          <span>
            <HardDrive size={14} />
            Datos guardados en tu dispositivo
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <a href="#home" className="mobile-brand">
            <BrandMark />
            Miga.
          </a>
          <div className="breadcrumb">
            Tu pequeño rincón de panadería <span>/</span>{' '}
            <strong>
              {page === 'settings' ? 'Mi cultivo' : links.find((l) => l.id === page)?.label}
            </strong>
          </div>
          <button
            className="icon-button mobile-menu"
            ref={menuButton}
            aria-controls="site-navigation"
            aria-expanded={menu}
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </header>
        <main id="main-content" tabIndex={-1}>
          {unreadable && (
            <div className="storage-banner">
              <Notice danger>
                No se pueden leer los datos locales. El guardado está bloqueado.
                {original !== undefined && (
                  <>
                    <button className="text-button" onClick={() => exportData(original)}>
                      <Download size={16} />
                      Descargar copia original
                    </button>
                    {!pending && (
                      <button
                        className="text-button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              '¿Quieres reemplazar los datos locales ilegibles con un cultivo nuevo?',
                            )
                          )
                            return;
                          const result = await writeJournal(() =>
                            journal.replaceUnreadable(original),
                          );
                          notify(
                            result === 'saved'
                              ? 'Nuevo cultivo guardado.'
                              : 'No se pudo reemplazar la copia local.',
                          );
                        }}
                      >
                        Continuar con datos nuevos
                      </button>
                    )}
                  </>
                )}
              </Notice>
            </div>
          )}
          {pending && (
            <Notice danger>
              {conflict
                ? 'Los datos del navegador han cambiado. Descarga los cambios pendientes antes de recargar.'
                : 'Hay cambios sin guardar en el navegador.'}
              <button
                className="text-button"
                onClick={() => exportData(JSON.stringify(data, null, 2))}
              >
                Descargar cambios pendientes
              </button>
              {!conflict && (
                <button
                  className="text-button"
                  onClick={async () => {
                    const result = await writeJournal(journal.retry);
                    notify(
                      result === 'saved'
                        ? 'Cambios guardados.'
                        : 'No se pudieron guardar los cambios.',
                    );
                  }}
                >
                  Reintentar guardado
                </button>
              )}
            </Notice>
          )}
          {page === 'home' && <Home {...props} />}
          {page === 'guide' && <Guide key={routeKey} {...props} />}
          {page === 'assistant' && <Assistant key={routeKey} {...props} onFeed={setFeed} />}
          {page === 'calculator' && (
            <>
              {recoveryCalculator && (
                <a className="text-button" href="#assistant">
                  Volver al asistente
                </a>
              )}
              {recoveryCalculator && data.recovery?.stage !== 'start' ? (
                <Notice>Vuelve al asistente para consultar el estado de la recuperación.</Notice>
              ) : (
                <Calculator
                  key={routeKey}
                  {...props}
                  initialActivity={recoveryCalculator ? 'unknown' : 'active'}
                  onFeed={(request) =>
                    setFeed(recoveryCalculator ? { ...request, recoveryStage: 'start' } : request)
                  }
                />
              )}
            </>
          )}
          {page === 'history' && <History key={routeKey} {...props} />}
          {page === 'settings' && (
            <Settings
              {...props}
              onExport={() => exportData()}
              onInstall={() => void installApp()}
              canInstall={!!install}
            />
          )}
        </main>
        <footer className={page === 'settings' ? 'site-footer settings-footer' : 'site-footer'}>
          <span className="footer-brand">
            <BrandMark />
            Miga · v{version}
          </span>
          <span>Sin prisas. Sin conexión con servidores.</span>
        </footer>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
        {links
          .filter((l) => l.id !== 'calculator')
          .map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={() => setMenu(false)}
              className={page === l.id ? 'active' : ''}
              aria-current={page === l.id ? 'page' : undefined}
            >
              <l.icon size={21} />
              <span>
                {l.id === 'home'
                  ? 'Inicio'
                  : l.id === 'assistant'
                    ? 'Miga'
                    : l.id === 'guide'
                      ? 'Guía'
                      : 'Historial'}
              </span>
            </a>
          ))}
      </nav>
      {feed && (
        <FeedingModal
          {...props}
          request={feed}
          onClose={() => setFeed(null)}
          onSaved={feed.recoveryStage ? () => navigate('assistant') : undefined}
        />
      )}
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">
        {toast && (
          <>
            <Check size={18} />
            {toast}
          </>
        )}
      </div>
    </div>
  );
}
