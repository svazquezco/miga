import type { Activity } from '../domain/starter';
import { useId } from 'react';
export function Miga({ waving = false }: { waving?: boolean }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 220 200"
      role="img"
      aria-label="Miga, un pan sonriente con brazos"
      className={`miga-character ${waving ? 'waving' : ''}`}
    >
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor="#f8df9d" />
          <stop offset="1" stopColor="#edbd64" />
        </linearGradient>
      </defs>
      <ellipse cx="111" cy="181" rx="58" ry="8" fill="#1e6342" opacity=".1" />
      <path
        d="M77 160 72 179M143 160l8 19"
        stroke="#724523"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <g className="miga-arm">
        <path
          d="M54 112C32 117 29 100 26 90"
          fill="none"
          stroke="#bb7c36"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path d="m26 91-9-6m9 6 1-12" stroke="#bb7c36" strokeWidth="5" strokeLinecap="round" />
      </g>
      <path
        d="M163 112c20 6 21 19 28 14"
        fill="none"
        stroke="#bb7c36"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M55 86C37 70 51 36 77 39c11-26 59-29 71-2 31-4 47 29 29 48l-9 69c-3 18-107 20-110 0Z"
        fill={`url(#${id})`}
        stroke="#ba7c39"
        strokeWidth="3"
      />
      <path
        d="M72 70c4-11 13-17 20-19m10 17c4-10 11-15 17-18m10 19c4-8 9-12 15-15"
        fill="none"
        stroke="#fff4d1"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <g className="miga-face">
        <circle cx="88" cy="108" r="4.5" fill="#254b36" />
        <circle cx="136" cy="108" r="4.5" fill="#254b36" />
        <path
          d="M102 119q10 12 20 0"
          fill="none"
          stroke="#254b36"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <ellipse cx="75" cy="120" rx="8" ry="4" fill="#e69573" opacity=".6" />
        <ellipse cx="149" cy="120" rx="8" ry="4" fill="#e69573" opacity=".6" />
      </g>
      <circle cx="78" cy="145" r="2" fill="#cc984d" />
      <circle cx="142" cy="143" r="2.5" fill="#cc984d" />
      {waving && (
        <g stroke="#edbd45" strokeWidth="4" strokeLinecap="round">
          <path d="m26 54-5-9m15 5 1-11m9 15 7-7" />
        </g>
      )}
    </svg>
  );
}
export function Jar({ state }: { state: 'active' | 'quiet' | 'hooch' | 'unsafe' }) {
  const id = useId();
  const level = state === 'active' ? 78 : 114;
  return (
    <svg
      viewBox="0 0 200 220"
      role="img"
      aria-label={
        {
          active: 'Ilustración: masa madre aireada y con burbujas',
          quiet: 'Ilustración: masa madre con poca actividad',
          hooch: 'Ilustración: líquido gris o marrón sobre el cultivo',
          unsafe: 'Ilustración: manchas de contaminación',
        }[state]
      }
      className="jar-art"
    >
      <defs>
        <linearGradient id={`${id}-glass`} x2="1" y2="1">
          <stop stopColor="#fafff4" stopOpacity=".8" />
          <stop offset="1" stopColor="#a5cfb8" stopOpacity=".25" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M62 52c0 18-17 22-19 48l-4 74q-1 24 26 24h72q25 0 24-24l-4-74c-2-26-19-30-19-48Z" />
        </clipPath>
      </defs>
      <ellipse cx="103" cy="204" rx="76" ry="12" fill="#6e9d6a" opacity=".18" />
      <path
        d="M62 52c0 18-17 22-19 48l-4 74q-1 24 26 24h72q25 0 24-24l-4-74c-2-26-19-30-19-48Z"
        fill={`url(#${id}-glass)`}
        stroke="#7fae94"
        strokeWidth="4"
      />
      <g clipPath={`url(#${id}-clip)`}>
        <path d={`M36 ${level}q20-12 40 0t40 0t47 0v125H35Z`} fill="#f6e2b5" />
        <path
          d={`M36 ${level}q20-12 40 0t40 0t47 0`}
          fill="none"
          stroke="#fff8df"
          strokeWidth="4"
        />
        {(state === 'active'
          ? [
              [59, 108, 4],
              [88, 94, 3],
              [126, 103, 6],
              [145, 125, 3],
              [75, 137, 6],
              [105, 122, 3],
              [114, 149, 5],
              [52, 164, 3],
              [90, 174, 4],
              [138, 177, 5],
              [151, 154, 2],
              [61, 185, 3],
            ]
          : [
              [65, 150, 3],
              [115, 170, 3],
              [140, 147, 2],
            ]
        ).map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#d7ad5c" opacity=".7" />
        ))}
        {state === 'hooch' && <path d="M36 108h130v12H36Z" fill="#999384" opacity=".8" />}
        {state === 'unsafe' && (
          <g fill="#d58979">
            <ellipse cx="80" cy="117" rx="15" ry="7" />
            <ellipse cx="128" cy="128" rx="11" ry="8" />
          </g>
        )}
      </g>
      <path
        d="M55 92q-6 17-6 51"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".8"
      />
      <path d="M58 48h83" stroke="#467f5b" strokeWidth="3" />
      <path d="M52 30q47-13 96 0l-2 19q-46 11-92 0Z" fill="#0b6346" />
      <ellipse cx="100" cy="30" rx="48" ry="8" fill="#1c7b55" />
      {state === 'active' && (
        <g stroke="#f5c94c" strokeWidth="5" strokeLinecap="round">
          <path d="m30 66-9-8m17-4-4-13m-9 38-13-1" />
        </g>
      )}
    </svg>
  );
}
export function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M7 24C0 14 9 7 15 11 18 0 33 4 32 13c8 0 10 11 4 16l-1 6H9Z" fill="currentColor" />
      <circle cx="18" cy="23" r="2" fill="#faf8f0" />
      <circle cx="29" cy="23" r="2" fill="#faf8f0" />
      <path d="M20 29q4 3 7 0" stroke="#faf8f0" fill="none" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GrowthIllustration({ activity }: { activity: Activity }) {
  const level = { quiet: 85, rising: 63, peak: 39, fallen: 76, unknown: 85 }[activity];
  const labels: Record<Activity, string> = {
    quiet: 'El cultivo sigue cerca del nivel inicial',
    rising: 'El cultivo ha superado el nivel inicial y sigue subiendo',
    peak: 'El cultivo está en su mayor altura',
    fallen: 'Queda una marca más alta que el nivel actual',
    unknown: 'No se conoce el cambio de volumen',
  };
  return (
    <svg
      className="growth-illustration"
      viewBox="0 0 90 115"
      role="img"
      aria-label={labels[activity]}
    >
      <path d="M21 24h46v70q0 9-9 9H30q-9 0-9-9Z" fill="#f7faf0" stroke="#8da58b" strokeWidth="2" />
      <rect x="18" y="16" width="52" height="11" rx="4" fill="#397651" />
      {activity === 'unknown' ? (
        <text x="44" y="75" fontSize="32" textAnchor="middle" fill="#9baf8b">
          ?
        </text>
      ) : (
        <>
          <path d={`M24 ${level}q10-4 20 0t20 0V100H24Z`} fill="#eddaad" />
          <path d={`M24 ${level}q10-4 20 0t20 0`} fill="none" stroke="#d3b86e" strokeWidth="2" />
          <circle cx="33" cy="92" r="2" fill="#caac63" />
          <circle cx="51" cy="87" r="2" fill="#caac63" />
          {activity !== 'quiet' && (
            <>
              <circle cx="48" cy={level + 10} r="2" fill="#caac63" />
              <circle cx="35" cy={level + 16} r="2.5" fill="#caac63" />
            </>
          )}
          {activity === 'fallen' && (
            <path d="M24 39h40" stroke="#caa974" strokeWidth="2" strokeDasharray="3 2" />
          )}
        </>
      )}
      <path d="M13 86h62" stroke="#53745a" strokeWidth="1.5" strokeDasharray="3 3" />
      {(activity === 'rising' || activity === 'fallen') && (
        <path
          d={activity === 'rising' ? 'M78 75V48m-4 5 4-5 4 5' : 'M78 45v25m-4-5 4 5 4-5'}
          fill="none"
          stroke="#81996d"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
