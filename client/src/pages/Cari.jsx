import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import TicketCard from '../components/TicketCard';
import { api } from '../api';
import { useAuth, useStats } from '../context';
import { IconPlus } from '../components/Icons';

export default function Cari() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { master } = useStats();
  const { admin } = useAuth();
  const [rows, setRows] = useState([]);
  const [jumlah, setJumlah] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.get('q') || '');
  const [f, setF] = useState({
    kategori: sp.get('kategori') || '', tahun: sp.get('tahun') || '',
    status: sp.get('status') || '', label: sp.get('label') || '',
  });

  const jalankan = async (pakaiQ = q, pakaiF = f) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (pakaiQ) p.set('q', pakaiQ);
    ['kategori', 'tahun', 'status', 'label'].forEach((k) => pakaiF[k] && p.set(k, pakaiF[k]));
    setSp(p, { replace: true });
    try {
      const r = await api(`/dokumen?${p.toString()}`);
      setRows(r.hasil);
      setJumlah(r.jumlah);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { jalankan(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight">Cari Arsip</h1>
          <p className="text-[13.5px] text-ink-soft">Kata kunci mencakup nomor dokumen, pihak terkait, jenis, dan perihal.</p>
        </div>
        {admin && (
          <button className="btn btn-primary" onClick={() => navigate('/arsip/baru')}>
            <IconPlus size={18} /> Tambah Arsip
          </button>
        )}
      </header>

      <SearchBar q={q} setQ={setQ} f={f} setF={setF} master={master} onSubmit={jalankan}
        action={<button type="submit" className="btn btn-primary">Cari</button>} />

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[14.5px] font-extrabold">Hasil ({jumlah})</p>
        <span className="text-[13px] text-ink-soft">&middot; {jumlah} arsip ditemukan, terbaru di atas</span>
        {(q || Object.values(f).some(Boolean)) && (
          <button className="pill ml-auto" onClick={() => { setQ(''); setF({ kategori: '', tahun: '', status: '', label: '' }); jalankan('', { kategori: '', tahun: '', status: '', label: '' }); }}>
            Bersihkan filter
          </button>
        )}
      </div>

      {loading ? (
        <p className="glass rounded-xl2 p-6 text-[14px] text-ink-soft">Memuat arsip…</p>
      ) : rows.length ? (
        <div className="space-y-3">{rows.map((d) => <TicketCard key={d.idArsip} d={d} />)}</div>
      ) : (
        <p className="glass rounded-xl2 p-8 text-center text-[14px] text-ink-soft">
          Tidak ada arsip yang cocok. Ubah kata kunci atau longgarkan filter.
        </p>
      )}
    </div>
  );
}
