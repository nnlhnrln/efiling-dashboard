import React, { useEffect, useRef, useState } from 'react';
import { IconChevron } from './Icons';

export function PillSelect({ label, value, options, onChange, accent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const chosen = options.find((o) => String(o.v) === String(value ?? ''));
  const showLabel = chosen && chosen.v !== '' ? chosen.t : label;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={`pill ${value ? 'pill-on' : ''} ${accent ? 'btn btn-primary' : ''}`}>
        <span>{showLabel}</span>
        <IconChevron size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="glass-strong absolute right-0 z-30 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl2 p-1.5 scroll-thin">
          {options.map((o) => (
            <button key={String(o.v)} type="button"
              onClick={() => { onChange(o.v); setOpen(false); }}
              className={`block w-full rounded-xl px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition hover:bg-white/70 ${String(value ?? '') === String(o.v) ? 'bg-rose/30' : ''}`}>
              {o.t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchBar({ q, setQ, onSearch, f, setF, master, action, onSubmit }) {
  const opsi = (arr, label) => [{ v: '', t: label }, ...arr];
  const kategoriOpts = opsi((master?.kategori || []).map((k) => ({ v: k.id_kategori, t: k.nama_kategori })), 'Kategori');
  const tahunNow = new Date().getFullYear();
  const tahunOpts = opsi(
    Array.from({ length: 12 }, (_, i) => ({ v: tahunNow - i, t: String(tahunNow - i) })), 'Tahun');
  const statusOpts = opsi(['Arsip', 'Draf', 'Perlu Tindakan'].map((s) => ({ v: s, t: s })), 'Status');
  const labelOpts = opsi([
    { v: 'AKTIF', t: 'Retensi: Aktif' }, { v: 'MENDEKATI', t: 'Retensi: Mendekati' }, { v: 'LEWAT', t: 'Retensi: Lewat' },
  ], 'Label retensi');

  return (
    <form onSubmit={(e) => { e.preventDefault(); (onSubmit || onSearch)(); }}
      className="glass print-full rounded-xl3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-full bg-mist/70 px-5 py-3 ring-1 ring-white/60 focus-within:ring-rose-deep">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6E625C" strokeWidth="1.9" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (onSubmit || onSearch)()}
            placeholder="Cari nomor arsip, pihak terkait, atau perihal…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-soft/70" />
        </div>
        <PillSelect label="Kategori" value={f.kategori} options={kategoriOpts} onChange={(v) => setF({ ...f, kategori: v })} />
        <PillSelect label="Tahun" value={f.tahun} options={tahunOpts} onChange={(v) => setF({ ...f, tahun: v })} />
        <PillSelect label="Status" value={f.status} options={statusOpts} onChange={(v) => setF({ ...f, status: v })} />
        <PillSelect label="Label" value={f.label} options={labelOpts} onChange={(v) => setF({ ...f, label: v })} />
        {action}
      </div>
    </form>
  );
}
