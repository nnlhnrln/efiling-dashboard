import React, { useState } from 'react';
import { api } from '../api';
import { useStats } from '../context';
import { IconPlus, IconTrash } from '../components/Icons';

function Kartu({ judul, ket, children, aksi }) {
  return (
    <section className="glass rounded-xl3 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15.5px] font-extrabold">{judul}</h2>
          <p className="text-[12.5px] text-ink-soft">{ket}</p>
        </div>
        {aksi}
      </div>
      {children}
    </section>
  );
}

const defaultFields = () => JSON.stringify([
  { key: 'nilai', label: 'Nilai', type: 'number', required: true },
], null, 2);

export default function DataMaster() {
  const { master, refreshMaster, refresh } = useStats();
  const [msg, setMsg] = useState('');
  const [k, setK] = useState({ kode: '', nama_kategori: '' });
  const [j, setJ] = useState({ id_kategori: '', nama_jenis: '', masa_retensi: 5, fields: defaultFields() });
  const [p, setP] = useState({ nama_pihak: '', jenis_pihak: 'Perusahaan' });

  const kirim = async (path, body, method = 'POST') => {
    setMsg('');
    try {
      await api(path, { method, json: body });
      refreshMaster();
      refresh();
      setMsg('Perubahan tersimpan. Struktur pohon direktori ikut diperbarui.');
    } catch (e) { setMsg('Gagal: ' + e.message); }
  };

  const hapusJenis = (id) => window.confirm('Hapus jenis dokumen ini?') && kirim(`/master/jenis/${id}`, {}, 'DELETE');
  const hapusKat = (id) => window.confirm('Hapus kategori ini?') && kirim(`/master/kategori/${id}`, {}, 'DELETE');
  const hapusPihak = (id) => window.confirm('Hapus pihak terkait ini?') && kirim(`/master/pihak/${id}`, {}, 'DELETE');

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight">Data Master</h1>
        <p className="text-[13.5px] text-ink-soft">Kategori, jenis dokumen (masa retensi &amp; ruas khas), dan pihak terkait. Perubahan langsung terlihat di menu Direktori dan form Tambah Arsip.</p>
      </header>

      {msg && <p className="glass-soft rounded-xl2 border-l-4 border-l-ok px-4 py-3 text-[13px] font-semibold">{msg}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Kartu judul="Kategori" ket="Kode klasifikasi + nama kategori">
          <ul className="mb-3 space-y-1.5">
            {(master?.kategori || []).map((row) => (
              <li key={row.id_kategori} className="flex items-center gap-2 rounded-2xl bg-white/45 px-4 py-2.5 text-[13.5px]">
                <b className="w-14">{row.kode}</b>
                <span className="flex-1">{row.nama_kategori}</span>
                <button className="grid h-8 w-8 place-items-center rounded-full text-bad hover:bg-bad/10" onClick={() => hapusKat(row.id_kategori)}><IconTrash size={16} /></button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input className="field !w-28 uppercase" placeholder="KODE" value={k.kode} onChange={(e) => setK({ ...k, kode: e.target.value })} />
            <input className="field flex-1 min-w-[160px]" placeholder="Nama kategori" value={k.nama_kategori} onChange={(e) => setK({ ...k, nama_kategori: e.target.value })} />
            <button className="btn btn-primary" onClick={() => { kirim('/master/kategori', k); setK({ kode: '', nama_kategori: '' }); }}>
              <IconPlus size={16} /> Tambah
            </button>
          </div>
        </Kartu>

        <Kartu judul="Pihak Terkait" ket="Vendor, ekspedisi, mitra">
          <ul className="mb-3 max-h-[240px] space-y-1.5 overflow-y-auto scroll-thin">
            {(master?.pihak || []).map((row) => (
              <li key={row.id_pihak} className="flex items-center gap-2 rounded-2xl bg-white/45 px-4 py-2.5 text-[13.5px]">
                <span className="flex-1">{row.nama_pihak}</span>
                <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11.5px] font-bold">{row.jenis_pihak}</span>
                <button className="grid h-8 w-8 place-items-center rounded-full text-bad hover:bg-bad/10" onClick={() => hapusPihak(row.id_pihak)}><IconTrash size={16} /></button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input className="field flex-1 min-w-[160px]" placeholder="Nama pihak" value={p.nama_pihak} onChange={(e) => setP({ ...p, nama_pihak: e.target.value })} />
            <select className="field !w-40" value={p.jenis_pihak} onChange={(e) => setP({ ...p, jenis_pihak: e.target.value })}>
              {['Perusahaan', 'Ekspedisi', 'Individu', 'Instansi'].map((x) => <option key={x}>{x}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => { kirim('/master/pihak', p); setP({ nama_pihak: '', jenis_pihak: 'Perusahaan' }); }}>
              <IconPlus size={16} /> Tambah
            </button>
          </div>
        </Kartu>

        <Kartu judul="Jenis Dokumen &amp; Masa Retensi" ket="Menentukan lama simpan, nama berkas, dan ruas khas form">
          <ul className="mb-3 max-h-[300px] space-y-1.5 overflow-y-auto scroll-thin">
            {(master?.jenis || []).map((row) => (
              <li key={row.id_jenis} className="rounded-2xl bg-white/45 px-4 py-2.5 text-[13.5px]">
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-bold">{row.nama_jenis}</span>
                  <span className="rounded-full bg-rose/25 px-2.5 py-0.5 text-[11.5px] font-bold">{row.masa_retensi} tahun</span>
                  <button className="grid h-8 w-8 place-items-center rounded-full text-bad hover:bg-bad/10" onClick={() => hapusJenis(row.id_jenis)}><IconTrash size={16} /></button>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {(master?.kategori || []).find((x) => x.id_kategori === row.id_kategori)?.nama_kategori || '-'} ·
                  ruas khas: {row.fields.map((f) => f.label).join(', ') || 'tidak ada'}
                </p>
              </li>
            ))}
          </ul>
          <div className="space-y-2 rounded-2xl bg-white/40 p-3">
            <div className="flex flex-wrap gap-2">
              <select className="field !w-48" value={j.id_kategori} onChange={(e) => setJ({ ...j, id_kategori: e.target.value })}>
                <option value="">— kategori —</option>
                {(master?.kategori || []).map((row) => <option key={row.id_kategori} value={row.id_kategori}>{row.nama_kategori}</option>)}
              </select>
              <input className="field flex-1 min-w-[150px]" placeholder="Nama jenis" value={j.nama_jenis} onChange={(e) => setJ({ ...j, nama_jenis: e.target.value })} />
              <input className="field !w-28" type="number" min="1" value={j.masa_retensi} onChange={(e) => setJ({ ...j, masa_retensi: e.target.value })} title="Masa retensi (tahun)" />
            </div>
            <textarea className="field h-28 font-mono !text-[12px]" value={j.fields}
              onChange={(e) => setJ({ ...j, fields: e.target.value })}
              placeholder='Ruas khas, contoh: [{"key":"nilai","label":"Nilai","type":"number","required":true}]' />
            <button className="btn btn-primary"
              onClick={() => {
                let fields;
                try { fields = JSON.parse(j.fields); } catch (e) { setMsg('Gagal: ruas khas harus JSON yang sah.'); return; }
                kirim('/master/jenis', { ...j, fields });
                setJ({ ...j, nama_jenis: '', id_kategori: '' });
              }}>
              <IconPlus size={16} /> Tambah jenis
            </button>
          </div>
        </Kartu>

        <Kartu judul="Pratinjau Pohon Direktori" ket="Struktur yang dilihat pengguna di menu Direktori Arsip">
          <ul className="space-y-2 text-[13.5px]">
            {(master?.pohon || []).map((kAT) => (
              <li key={kAT.id_kategori}>
                <b>{kAT.kode} — {kAT.nama_kategori}</b>
                <ul className="ml-4 mt-1 space-y-1 border-l border-stone/60 pl-3 text-ink-soft">
                  {kAT.jenis.map((x) => (
                    <li key={x.id_jenis}>{x.nama_jenis} <span className="text-[11.5px]">({x.masa_retensi} th · {x.jumlah} arsip)</span></li>
                  ))}
                  {!kAT.jenis.length && <li>belum ada jenis</li>}
                </ul>
              </li>
            ))}
          </ul>
        </Kartu>
      </div>
    </div>
  );
}
