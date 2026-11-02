import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TicketCard from '../components/TicketCard';
import { api } from '../api';
import { useAuth, useStats } from '../context';
import { IconChevron, IconFolder, IconFolderOpen, IconPlus } from '../components/Icons';

function Tree({ pohon, aktif, onPilih, openAll }) {
  const [ buka, setBuka ] = useState({});
  useEffect(() => { if (openAll) setBuka((p) => ({ ...p, ...openAll })); }, [openAll]);
  return (
    <ul className="space-y-1">
      {pohon.map((k) => {
        const isOpen = buka[k.id_kategori] !== false;
        const total = k.jenis.reduce((s, j) => s + j.jumlah, 0);
        return (
          <li key={k.id_kategori}>
            <button onClick={() => setBuka({ ...buka, [k.id_kategori]: !isOpen })}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left font-bold hover:bg-white/55">
              <IconChevron size={15} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <IconFolder size={17} className="text-rose-deep" />
              <span className="flex-1 text-[14px]">{k.nama_kategori}</span>
              <span className="rounded-full bg-rose/20 px-2 py-0.5 text-[11px] font-bold">{k.kode} · {total}</span>
            </button>
            {isOpen && (
              <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-stone/60 pl-2">
                {k.jenis.map((j) => {
                  const on = aktif === j.id_jenis;
                  return (
                    <li key={j.id_jenis}>
                      <button onClick={() => onPilih(j.id_jenis)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] transition ${on ? 'bg-rose/30 font-bold' : 'hover:bg-white/50 font-semibold text-ink-soft'}`}>
                        <IconFolderOpen size={16} className={on ? 'text-rose-deep' : ''} />
                        <span className="flex-1">{j.nama_jenis}</span>
                        <span className="text-[11.5px] font-bold">{j.jumlah}</span>
                        <span className="text-[11px] text-ink-soft">{j.masa_retensi} th</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Direktori() {
  const { master } = useStats();
  const { admin } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const aktif = sp.get('jenis') ? Number(sp.get('jenis')) : null;

  const folder = useMemo(() => {
    if (!aktif || !master) return null;
    for (const k of master.pohon) {
      const j = k.jenis.find((x) => x.id_jenis === aktif);
      if (j) return { kat: k, jenis: j };
    }
    return null;
  }, [aktif, master]);

  useEffect(() => {
    if (!aktif) { setRows([]); return; }
    let alive = true;
    setLoading(true);
    api(`/dokumen?idJenis=${aktif}`).then((r) => alive && setRows(r.hasil)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [aktif, master]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight">Direktori Arsip</h1>
          <p className="text-[13.5px] text-ink-soft">Struktur klasifikasi mengikuti Data Master dan dapat diubah admin.</p>
        </div>
        {admin && <Link to="/arsip/baru" className="btn btn-primary"><IconPlus size={18} /> Tambah Arsip</Link>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <div className="glass rounded-xl3 p-3.5">
          {master ? <Tree pohon={master.pohon} aktif={aktif} onPilih={(id) => setSp({ jenis: String(id) })} />
            : <p className="p-4 text-[13px] text-ink-soft">Memuat struktur…</p>}
        </div>

        <div className="space-y-3">
          <nav className="glass-soft rounded-xl2 px-4 py-2.5 text-[13px] font-semibold">
            <Link to="/direktori" className="text-rose-deep">Direktori</Link>
            {folder && (<>
              <span className="mx-1.5 text-ink-soft">›</span>{folder.kat.nama_kategori}
              <span className="mx-1.5 text-ink-soft">›</span><b>{folder.jenis.nama_jenis}</b>
              <span className="ml-2 text-ink-soft">({folder.jenis.masa_retensi} tahun)</span>
            </>)}
            {!folder && <span className="ml-2 text-ink-soft">— pilih folder di kiri</span>}
          </nav>

          {folder && (
            <div className="flex items-baseline gap-2">
              <h2 className="text-[17px] font-extrabold">Hasil ({rows.length})</h2>
              <span className="text-[12.5px] text-ink-soft">Arsip pada folder ini, terbaru lebih dulu.</span>
            </div>
          )}

          {folder && (loading ? <p className="glass rounded-xl2 p-6 text-[14px] text-ink-soft">Memuat…</p>
            : rows.length ? <div className="space-y-3">{rows.map((d) => <TicketCard key={d.idArsip} d={d} />)}</div>
              : <p className="glass rounded-xl2 p-8 text-center text-[14px] text-ink-soft">Folder ini masih kosong.</p>)}
        </div>
      </div>
    </div>
  );
}
