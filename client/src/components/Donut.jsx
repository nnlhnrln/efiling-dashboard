import React from 'react';

export default function Donut({ aktif = 0, mendekati = 0, lewat = 0, size = 176 }) {
  const total = Math.max(1, aktif + mendekati + lewat);
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  const parts = [
    { v: aktif, color: '#5F8D6B' },
    { v: mendekati, color: '#C08A3E' },
    { v: lewat, color: '#B4574F' },
  ];
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(214,204,194,.45)" strokeWidth="18" />
        {parts.map((p, i) => {
          const len = (p.v / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth="18"
              strokeLinecap="round" strokeDasharray={`${Math.max(0, len - 3)} ${c - Math.max(0, len - 3)}`}
              strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[26px] font-extrabold leading-none">{aktif + mendekati + lewat}</p>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Total arsip</p>
        </div>
      </div>
    </div>
  );
}

export function Legenda({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-[13px]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          <span className="flex-1 text-ink-soft">{it.label}</span>
          <b>{it.value}</b>
        </li>
      ))}
    </ul>
  );
}
