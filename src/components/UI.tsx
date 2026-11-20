import type { ReactNode } from 'react';
import { Check, X, Info } from 'lucide-react';
export function Notice({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div className={`notice ${danger ? 'danger' : ''}`}>
      <Info size={19} />
      <div>{children}</div>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') {
            const items = e.currentTarget.querySelectorAll<HTMLElement>(
              'button, input, select, textarea, a[href]',
            );
            const first = items[0],
              last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar" autoFocus>
            <X size={21} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="step-list">
      {steps.map((step, i) => (
        <li key={step}>
          <span>{i + 1}</span>
          <p>{step}</p>
        </li>
      ))}
    </ol>
  );
}
export function RatioBadge({ n }: { n: number }) {
  return (
    <span className="ratio-badge">
      1 : {n} : {n}
    </span>
  );
}
export function CheckLabel({ children }: { children: ReactNode }) {
  return (
    <span className="check-label">
      <Check size={15} />
      {children}
    </span>
  );
}
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export const inputDate = (value = new Date()) => {
  const d = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};
export const grams = (n: number) =>
  n.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
