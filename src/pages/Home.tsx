import {
  BookOpen,
  Sparkles,
  Thermometer,
  Clock3,
  Plus,
  Calculator,
  Leaf,
  ChevronRight,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { Jar, Miga } from '../components/Illustrations';
import { dateLabel } from '../components/UI';
import { isContaminated } from '../domain/starter';
import type { PageProps } from '../types';
export function Home({ data, navigate }: PageProps) {
  const observation = data.observations[0];
  const unsafe = data.observations.some((o) => isContaminated(o.safety));
  const status = unsafe
    ? 'Revisa su seguridad'
    : observation?.activity === 'peak'
      ? 'En su pico'
      : observation?.activity === 'rising'
        ? 'Está creciendo'
        : observation?.activity === 'fallen'
          ? 'Después del pico'
          : observation?.activity === 'quiet'
            ? 'Con calma'
            : 'Por descubrir';
  const subtitle = unsafe
    ? 'Hay una señal de contaminación registrada. No refresques este cultivo.'
    : observation
      ? 'Este es el último estado que has observado. Vamos a ver qué necesita ahora.'
      : 'Cada cultivo tiene su ritmo. Una mirada, un refresco y un poquito de paciencia.';
  const last = data.starter.lastFedAt;
  const reviewAt = last
    ? new Date(
        Date.parse(last) + (data.starter.storage === 'fridge' ? 7 * 24 : 6) * 3_600_000,
      ).toISOString()
    : null;
  return (
    <>
      <header className="home-heading">
        <div>
          <span className="eyebrow">
            <span className="tiny-sun">✳</span> UN POQUITO DE CUIDADO, MUCHA VIDA
          </span>
          <h1>
            Tu masa madre,
            <br />
            <span>en buenas manos.</span>
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
      <div className="home-grid">
        <section className="starter-hero">
          <div className="hero-copy">
            <span className="overline">TU PEQUEÑO CULTIVO</span>
            <h2>{data.starter.name}</h2>
            <span className={`state-chip ${unsafe ? 'unsafe' : ''}`}>
              <span />
              {status}
            </span>
            <p>{subtitle}</p>
            <button className="primary" onClick={() => navigate('assistant')}>
              <Sparkles size={18} />
              Ver qué necesita
            </button>
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
        <section className="miga-invite">
          <div className="miga-invite-top">
            <span className="mini-label">
              <Sparkles size={14} />
              TU COMPAÑERA
            </span>
            <span className="hello-tag">¡Hola!</span>
          </div>
          <Miga waving />
          <h2>¡Hola! Soy Miga.</h2>
          <p>Cuéntame cómo está tu masa madre y vamos paso a paso.</p>
          <button className="secondary" onClick={() => navigate('assistant')}>
            Hablar con Miga <ChevronRight size={17} />
          </button>
        </section>
        <section className="cultivation-facts" aria-label="Información del cultivo">
          <div>
            <span className="fact-icon">
              <Clock3 size={20} />
            </span>
            <span>
              <small>Último refresco</small>
              <strong>{last ? dateLabel(last) : 'Aún sin registrar'}</strong>
            </span>
          </div>
          <div>
            <span className="fact-icon">
              <Thermometer size={20} />
            </span>
            <span>
              <small>Temperatura indicada</small>
              <strong>{data.starter.temperature} °C</strong>
            </span>
          </div>
          <div>
            <span className="fact-icon">
              <MapPin size={20} />
            </span>
            <span>
              <small>Conservación</small>
              <strong>
                {data.starter.storage === 'fridge' ? 'En la nevera' : 'A temperatura ambiente'}
              </strong>
            </span>
          </div>
          <button className="text-button" onClick={() => navigate('settings')}>
            Editar cultivo
          </button>
        </section>
      </div>
      {reviewAt && !unsafe && (
        <section className="review-strip">
          <Clock3 size={21} />
          <div>
            <span className="eyebrow">REVISIÓN ORIENTATIVA</span>
            <h3>
              {Date.parse(reviewAt) <= Date.now()
                ? 'Un buen momento para volver a mirar'
                : dateLabel(reviewAt)}
            </h3>
            <p>
              {data.starter.storage === 'fridge'
                ? 'En nevera, una revisión semanal es una referencia de mantenimiento. Ajusta según su evolución.'
                : 'Comprueba crecimiento, burbujas y aroma. Esta hora invita a observar; no confirma que esté lista.'}
            </p>
          </div>
          <button
            className="text-button"
            onClick={() => {
              location.hash = 'history/observe';
            }}
          >
            Anotar lo que veo
          </button>
        </section>
      )}
      <section className="explore-section">
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
      <div className="home-bottom">
        <a
          className="tip-card"
          href="#guide/activity"
          aria-label="Aprender a observar la actividad"
        >
          <span className="tip-doodle">
            <Leaf size={34} />
          </span>
          <div>
            <span className="eyebrow">UNA PISTA DE MIGA</span>
            <h3>El tarro te cuenta más que el reloj.</h3>
            <p>
              Marca el nivel después de refrescar. Ver cuánto crece te ayudará a conocer su ritmo.
            </p>
          </div>
          <span className="tip-chevron" aria-hidden="true">
            <ChevronRight />
          </span>
        </a>
        <button
          className="add-observation"
          onClick={() => {
            location.hash = 'history/observe';
          }}
        >
          <Plus size={20} />
          ¿Ves algo nuevo?<strong>Registrar una observación</strong>
        </button>
      </div>
      <p className="scope-line">
        <Leaf size={14} /> Para masa madre madura de trigo al 100 % de hidratación. Los tiempos
        orientan; la actividad decide.
      </p>
    </>
  );
}
