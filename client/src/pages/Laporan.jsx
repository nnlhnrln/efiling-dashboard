import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api';
import { tgl, rupiah, labelGaya } from '../format';
import { useStats } from '../context';
import { IconCsv, IconPrint, IconDownload } from '../components/Icons';

const TAB = [
  { k: 'rekap', t: 'Rekap Arsip' },
  { k: 'retensi', t: 'Retensi' },
  { k: 'utang', t: 'Jatuh Tempo Bulan Ini' },
];

function unduhBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Laporan() {
  const { master } = useStats();
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') === 'retensi' ? 'retensi' : 'rekap');
  const [rows, setRows] = useState([]);
  const [utang, setUtang] = useState({ hasil: [], total: 0, bulan: '' });
  const [f, setF] = useState({ dari: '', sampai: '', kategori: '', label: '' });
  const [bulan, setBulan] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { api('/dokumen').then((r) => setRows(r.hasil)); }, []);
  useEffect(() => { if (tab === 'utang') api(`/utang?bulan=${bulan}`).then(setUtang); }, [tab, bulan]);

  const hasil = useMemo(() => rows.filter((d) => {
    if (f.kategori && String(d.idKategori) !== String(f.kategori)) return false;
    if (f.label && d.label !== f.label) return false;
    if (tab === 'retensi' && d.label === 'AKTIF') return false;
    if (f.dari && d.tanggal < f.dari) return false;
    if (f.sampai && d.tanggal > f.sampai) return false;
    return true;
  }), [rows, f, tab]);

  const kolom = () => ['No. Arsip', 'Nomor', 'Kategori', 'Jenis', 'Tanggal', 'Pihak', 'Nilai / Keterangan', 'Retensi', 'Label'];
  const data = () => (tab === 'utang'
    ? utang.hasil.map((u) => [u.idArsip, u.nomor, 'Pembelian', u.jenis, tgl(u.jatuhTempo), u.pihak, rupiah(u.nilai), '-', 'Belum lunas'])
    : hasil.map((d) => [d.idArsip, d.nomor, d.kategori, d.jenis, tgl(d.tanggal), d.pihak,
        d.fields.nilai !== undefined ? rupiah(d.fields.nilai) : (d.fields.perihal || d.fields.masa_berlaku || '-'),
        tgl(d.tanggalRetensi), d.label]));

  const csv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = [kolom(), ...data()].map((r) => r.map(esc).join(';')).join('\r\n');
    unduhBlob('\uFEFF' + body, `laporan-${tab}-${bulan}.csv`, 'text/csv;charset=utf-8');
  };

  const pdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(15);
    doc.text('Laporan Kearsipan Elektronik — ' + TAB.find((t) => t.k === tab).t, 14, 16);
    doc.setFontSize(10);
    doc.text(`Dibuat ${tgl(new Date().toISOString().slice(0, 10))} · ${data().length} baris`, 14, 23);
    autoTable(doc, { head: [kolom()], body: data(), startY: 28, styles: { fontSize: 7.5 }, headStyles: { fillColor: [185, 152, 136] } });
    doc.save(`laporan-${tab}.pdf`);
  };

  const totalNilai = tab === 'utang' ? utang.total : hasil.reduce((s, d) => s + Number(d.fields.nilai || 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight">Laporan &amp; Retensi</h1>
          <p className="text-[13.5px] text-ink-soft">Rekap arsip, masa simpan, dan utang jatuh tempo.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => window.print()}><IconPrint size={17} /> Cetak</button>
          <button className="btn btn-ghost" onClick={csv}><IconCsv size={17} /> Ekspor CSV</button>
          <button className="btn btn-primary" onClick={pdf}><IconDownload size={17} /> Ekspor PDF</button>
        </div>
      </header>

      <div className="no-print flex flex-wrap gap-2">
        {TAB.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`pill ${tab === t.k ? 'pill-on' : ''}`}>{t.t}</button>
        ))}
      </div>

      {tab !== 'utang' && (
        <div className="glass no-print flex flex-wrap items-center gap-3 rounded-xl2 p-4">
          <div>
            <span className="mb-1 block text-[11.5px] font-bold uppercase text-ink-soft">Periode dari</span>
            <input type="date" className="field !w-auto" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} />
          </div>
          <div>
            <span className="mb-1 block text-[11.5px] font-bold uppercase text-ink-soft">sampai</span>
            <input type="date" className="field !w-auto" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} />
          </div>
          <div>
            <span className="mb-1 block text-[11.5px] font-bold uppercase text-ink-soft">Kategori</span>
            <select className="field !w-auto" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}>
              <option value="">Semua</option>
              {(master?.kategori || []).map((k) => <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori}</option>)}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-[11.5px] font-bold uppercase text-ink-soft">Label retensi</span>
            <select className="field !w-auto" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })}>
              <option value="">Semua</option>
              {['AKTIF', 'MENDEKATI', 'LEWAT'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button className="pill ml-auto" onClick={() => setF({ dari: '', sampai: '', kategori: '', label: '' })}>Bersihkan</button>
        </div>
      )}

      {tab === 'utang' && (
        <div className="glass no-print flex flex-wrap items-center gap-3 rounded-xl2 p-4">
          <span className="text-[13px] font-bold">Bulan jatuh tempo</span>
          <input type="month" className="field !w-auto" value={bulan} onChange={(e) => setBulan(e.target.value)} />
          <span className="ml-auto text-[13.5px] font-bold">Total: <span className="text-bad">{rupiah(totalNilai)}</span></span>
        </div>
      )}

      <section className="glass print-full overflow-x-auto rounded-xl3 p-4 scroll-thin">
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-[16.5px] font-extrabold">Hasil ({data().length})</h2>
          <span className="text-[12.5px] text-ink-soft">
            {tab === 'utang' ? `Utang belum lunas dengan jatuh tempo bulan ${bulan.split('-').reverse().join('-')}`
              : `Jumlah nilai tercatat: ${rupiah(totalNilai)}`}
          </span>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left">
              {kolom().map((h) => <th key={h} className="border-b-2 border-stone px-3 py-2 font-bold uppercase tracking-wide text-ink-soft">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data().map((r, i) => (
              <tr key={i} className="hover:bg-white/45">
                {r.map((c, j) => (
                  <td key={j} className="border-b border-stone/40 px-3 py-2 align-top">
                    {j === 0 ? <Link className="font-bold text-rose-deep underline-offset-2 hover:underline" to={`/arsip/${c}`}>{c}</Link>
                      : j === 8 ? <span className={labelGaya(c)}>{c}</span> : c}
                  </td>
                ))}
              </tr>
            ))}
            {!data().length && <tr><td colSpan={9} className="px-3 py-8 text-center text-ink-soft">Tidak ada data untuk filter ini.</td></tr>}
          </tbody>
        </table>
      </section>

      {tab === 'retensi' && (
        <p className="text-[12.5px] text-ink-soft">
          Label dihitung otomatis: AKTIF (masih dalam masa simpan), MENDEKATI (≤ 90 hari sebelum jatuh retensi), LEWAT (sudah lewat).
        </p>
      )}
    </div>
  );
}
