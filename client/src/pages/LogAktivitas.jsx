import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { tglWaktu } from '../format';

const AKSI = ['MASUK', 'TAMBAH', 'LIHAT', 'UNDUH', 'UBAH', 'HAPUS', 'DITOLAK'];
const warna = (a) => a === 'DITOLAK' ? 'chip chip-lewat' : a === 'HAPUS' ? 'chip chip-lewat' : a === 'TAMBAH' ? 'chip chip-aktif' : a === 'UBAH' ? 'chip chip-mendekati' : 'chip bg-white/55 border border-stone/60';

export default function LogAktivitas() {
  const [data, setData] = useState({ hasil: [], jumlah: 0 });
  const [q, setQ] = useState('');
  const [aksi, setAksi] = useState('');

  const muat = useCallback(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (aksi) p.set('aksi', aksi);
    api(`/log?${p.toString()}`).then(setData);
  }, [q, aksi]);

  useEffect(() => { const t = setTimeout(muat, 250); return () => clearTimeout(t); }, [muat]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight">Log Aktivitas</h1>
          <p className="text-[13.5px] text-ink-soft">
            Rekaman otomatis seluruh aktivitas sistem, termasuk percobaan yang ditolak.
            Baris log hanya bisa dibaca — tidak ada fitur ubah atau hapus.
          </p>
        </div>
        <span className="chip chip-aktif">{data.jumlah} baris</span>
      </header>

      <div className="glass flex flex-wrap items-center gap-3 rounded-xl2 p-4">
        <input className="field flex-1 min-w-[220px]" placeholder="Cari pengguna, arsip, atau keterangan…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className={`pill ${!aksi ? 'pill-on' : ''}`} onClick={() => setAksi('')}>Semua aksi</button>
          {AKSI.map((a) => <button key={a} className={`pill ${aksi === a ? 'pill-on' : ''}`} onClick={() => setAksi(a)}>{a}</button>)}
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-xl3 p-4 scroll-thin">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left">
              {['Waktu', 'Pengguna', 'Aksi', 'Arsip', 'Nomor', 'Keterangan'].map((h) => (
                <th key={h} className="border-b-2 border-stone px-3 py-2 font-bold uppercase tracking-wide text-ink-soft">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.hasil.map((l) => (
              <tr key={l.id_log} className="hover:bg-white/45">
                <td className="whitespace-nowrap border-b border-stone/40 px-3 py-2 font-semibold">{tglWaktu(l.waktu)}</td>
                <td className="border-b border-stone/40 px-3 py-2">{l.pengguna || <span className="text-ink-soft">(tidak dikenal)</span>}</td>
                <td className="border-b border-stone/40 px-3 py-2"><span className={warna(l.aksi)}>{l.aksi}</span></td>
                <td className="border-b border-stone/40 px-3 py-2">
                  {l.id_arsip ? <Link to={`/arsip/${l.id_arsip}`} className="font-bold text-rose-deep hover:underline">{l.id_arsip}</Link> : '-'}
                </td>
                <td className="border-b border-stone/40 px-3 py-2">{l.nomor || '-'}</td>
                <td className="border-b border-stone/40 px-3 py-2 text-ink-soft">{l.keterangan || '-'}</td>
              </tr>
            ))}
            {!data.hasil.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-soft">Belum ada aktivitas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
