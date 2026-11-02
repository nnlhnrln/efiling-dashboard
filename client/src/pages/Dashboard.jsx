import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import TicketCard from '../components/TicketCard';
import Donut, { Legenda } from '../components/Donut';
import { useAuth, useStats } from '../context';
import { sapaan } from '../format';
import { IconAlert, IconPlus, IconSearch } from '../components/Icons';

export default function Dashboard() {
  const { user, admin } = useAuth();
  const { stats, master } = useStats();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [f, setF] = useState({ kategori: '', tahun: '', status: '', label: '' });

  const cari = (override) => {
    const ff = { ...f, ...(override || {}) };
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    ['kategori', 'tahun', 'status', 'label'].forEach((k) => ff[k] && p.set(k, ff[k]));
    navigate(`/cari?${p.toString()}`);
  };

  const daftar = stats?.terbaru || [];
  const warning = (stats?.mendekati || 0) + (stats?.lewat || 0);
  const namaDepan = (user.nama || '').split(' ')[0];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">{sapaan()},</p>
          <h1 className="text-[26px] font-extrabold leading-tight sm:text-[30px]">{namaDepan}</h1>
          <p className="text-[13.5px] text-ink-soft">
            {admin ? 'Anda memiliki akses penuh untuk mengelola arsip.' : 'Anda dapat melihat dan mengunduh arsip yang tersedia.'}
          </p>
        </div>
        {admin && (
          <Link to="/arsip/baru" className="btn btn-primary"><IconPlus size={18} /> Tambah Arsip</Link>
        )}
      </header>

      {warning > 0 && (
        <div className="glass-soft flex flex-wrap items-center gap-3 rounded-xl2 border-l-4 border-l-warn px-5 py-4">
          <IconAlert size={20} className="text-warn" />
          <p className="flex-1 text-[13.5px] font-semibold">
            Ada <b>{stats.mendekati}</b> arsip mendekati masa simpan dan <b className="text-bad">{stats.lewat}</b> arsip
            sudah lewat masa simpan. Periksa tautan retensi sebelum musnah.
          </p>
          <Link to="/laporan?tab=retensi" className="btn btn-ghost">Periksa retensi</Link>
        </div>
      )}

      <SearchBar q={q} setQ={setQ} f={f} setF={setF} master={master} onSearch={cari}
        action={
          admin ? (
            <button type="button" onClick={() => navigate('/arsip/baru')} className="btn btn-primary">
              <IconPlus size={17} /> Tambah Arsip
            </button>
          ) : (
            <button type="submit" className="btn btn-primary"><IconSearch size={17} /> Cari</button>
          )
        } />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-extrabold">Hasil ({daftar.length})</h2>
            <Link to="/cari" className="text-[13px] font-bold text-rose-deep underline underline-offset-2">
              Lihat semua arsip
            </Link>
          </div>
          {daftar.map((d) => <TicketCard key={d.idArsip} d={d} />)}
          {!daftar.length && <p className="glass rounded-xl2 p-6 text-[14px] text-ink-soft">Belum ada arsip tersimpan.</p>}
        </section>

        <aside className="space-y-4">
          <div className="glass rounded-xl3 p-5">
            <h3 className="mb-3 text-[15px] font-extrabold">Ringkasan Retensi</h3>
            <div className="flex justify-center"><Donut aktif={stats?.aktif} mendekati={stats?.mendekati} lewat={stats?.lewat} /></div>
            <div className="mt-4">
              <Legenda items={[
                { label: 'Aktif', value: stats?.aktif || 0, color: '#5F8D6B' },
                { label: 'Mendekati', value: stats?.mendekati || 0, color: '#C08A3E' },
                { label: 'Lewat', value: stats?.lewat || 0, color: '#B4574F' },
              ]} />
            </div>
          </div>

          <div className="glass grid grid-cols-3 gap-2 rounded-xl3 p-4 text-center">
            {[
              { t: 'Total arsip', v: stats?.total },
              { t: 'Bulan ini', v: stats?.bulanIni },
              { t: 'Mendekati', v: stats?.mendekati },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl bg-white/45 px-2 py-3">
                <p className="text-[20px] font-extrabold leading-none">{s.v ?? 0}</p>
                <p className="mt-1 text-[11px] font-semibold leading-tight text-ink-soft">{s.t}</p>
              </div>
            ))}
          </div>

          <div className="glass rounded-xl3 p-5">
            <h3 className="mb-3 text-[15px] font-extrabold">Filter Cepat</h3>
            <div className="flex flex-wrap gap-2">
              <button className="pill" onClick={() => cari({ label: '', kategori: '', tahun: '', status: '' })}>Semua</button>
              {['AKTIF', 'MENDEKATI', 'LEWAT'].map((l) => (
                <button key={l} className={`pill ${l === 'LEWAT' ? 'text-bad' : l === 'MENDEKATI' ? 'text-warn' : 'text-ok'}`}
                  onClick={() => cari({ label: l })}>{l}</button>
              ))}
              {(master?.kategori || []).map((k) => (
                <button key={k.id_kategori} className="pill" onClick={() => cari({ kategori: k.id_kategori })}>
                  {k.nama_kategori}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
