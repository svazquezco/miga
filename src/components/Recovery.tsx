import { useEffect, useRef, useState } from 'react';
import { FeedingModal } from './FeedingModal';
import { Notice, PageTitle, dateLabel } from './UI';
import { atRoomSinceFeeding, latestFeeding } from '../domain/starter';
import type { Goal, Recovery as RecoveryPlan } from '../domain/starter';
import type { FeedRequest, PageProps } from '../types';

export function Recovery({
  plan,
  onComplete,
  onCancel,
  ...props
}: PageProps & {
  plan: RecoveryPlan;
  onComplete: (goal: Goal) => void;
  onCancel: () => void;
}) {
  const { data, update } = props;
  const card = useRef<HTMLElement>(null);
  const [request, setRequest] = useState<FeedRequest | null>(null);
  useEffect(() => {
    card.current?.scrollIntoView({ block: 'start' });
    card.current?.focus({ preventScroll: true });
  }, [plan.stage]);
  const latest = latestFeeding(data);
  const cycle =
    plan.stage === 'observe' &&
    latest?.id === plan.feedingId &&
    atRoomSinceFeeding(data.starter, latest)
      ? latest
      : undefined;

  function register(ratio: 1 | 2) {
    if (plan.stage === 'observe') return;
    setRequest({
      ratio,
      starterG: 20,
      waterG: 20 * ratio,
      flourG: 20 * ratio,
      recoveryStage: plan.stage,
    });
  }

  function recordGrowth(doubled: boolean) {
    const passes = cycle?.ratio === 1 && doubled;
    if (passes && plan.confirmations === 1) {
      if (update({ ...data, recovery: undefined }) !== 'blocked') onComplete(plan.goal);
      return;
    }
    update({
      ...data,
      recovery: { goal: plan.goal, stage: 'feed', confirmations: passes ? 1 : 0 },
    });
  }

  return (
    <>
      <PageTitle
        eyebrow="RECUPERAR LA ACTIVIDAD"
        title="Ayuda a tu masa madre a recuperar su ritmo"
      />
      <section
        ref={card}
        className="reading-card recovery-card"
        tabIndex={-1}
        aria-label="Seguimiento de recuperación"
      >
        {plan.stage === 'start' ? (
          <>
            <h2>Haz un primer refresco</h2>
            <p>
              Si solo hay líquido gris o marrón y antes crecía bien, puedes empezar con 1:2:2. Si
              está muy débil, empieza con 1:1:1. Marca el nivel y déjala a temperatura ambiente.
            </p>
            <button className="primary" onClick={() => register(2)}>
              Registrar refresco 1:2:2
            </button>
            <button className="secondary" onClick={() => register(1)}>
              Registrar refresco 1:1:1
            </button>
          </>
        ) : plan.stage === 'feed' ? (
          <>
            <h2>Refresca en proporción 1:1:1</h2>
            <p>
              Marca el nivel justo después de mezclar y observa cuánto tarda en duplicar su volumen.
            </p>
            <button className="primary" onClick={() => register(1)}>
              Registrar refresco 1:1:1
            </button>
          </>
        ) : cycle ? (
          <>
            <h2>Observa cómo crece</h2>
            <p>
              Refresco registrado el {dateLabel(cycle.fedAt)} en proporción 1:{cycle.ratio}:
              {cycle.ratio}.
            </p>
            {cycle.ratio === 1 ? (
              <>
                <p>
                  Comprueba si duplica en unas 4 horas. Si sigue subiendo, puedes volver más tarde.
                  Buscamos que duplique en dos refrescos 1:1:1 seguidos.
                </p>
                <p>
                  {plan.confirmations
                    ? 'Ya has confirmado un refresco 1:1:1.'
                    : '0 de 2 refrescos seguidos confirmados.'}
                </p>
                <button className="primary" onClick={() => recordGrowth(true)}>
                  Duplicó en unas 4 h
                </button>
                <button className="secondary" onClick={() => recordGrowth(false)}>
                  Ya maduró y tardó más o no duplicó
                </button>
              </>
            ) : (
              <>
                <p>
                  Cuando madure, haz el primer refresco 1:1:1 para medir cuánto tarda en duplicar.
                </p>
                <button className="primary" onClick={() => recordGrowth(false)}>
                  Ya maduró
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h2>Retoma la recuperación</h2>
            <Notice>
              Para comparar la subida, utiliza el refresco más reciente y déjalo a temperatura
              ambiente.
            </Notice>
            <button className="primary" onClick={() => recordGrowth(false)}>
              Continuar con un refresco 1:1:1
            </button>
          </>
        )}
        <button className="text-button" onClick={onCancel}>
          Salir de la recuperación
        </button>
      </section>
      {request && <FeedingModal {...props} request={request} onClose={() => setRequest(null)} />}
    </>
  );
}
