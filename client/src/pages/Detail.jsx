import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '../api';
import { tgl, tglWaktu, rupiah, labelGaya } from '../format';
import { useAuth, useStats } from '../context';
import { IconClock, IconDownload, IconEdit, IconEye, IconPdf, IconTrash, IconClose } from '../components/Icons';

function Baris({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone/40 py-2 last:border-0">
      <span className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      <span className="text-right text-[13.5px] font-semibold">{children}</span>
    </div>
  );
}

export default function Detail() {
  const { id } = useParams();
  const { admin, user } = useAuth();
  const { refresh } = useStats();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [riwayat, setRiwayat] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setErr('');
    api(`/dokumen/${id}`).then(setD).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => setRiwayat(null), [id]);

  if (err && !d) return <p className="glass rounded-xl2 p-8 text-center text-[14px] text-bad">{err}</p>;
  if (!d) return <p className="glass rounded-xl2 p-8 text-[14px] text-ink-soft">Memuat arsip…</p>;

  const nilai = (f, v) => (f === 'number' ? rupiah(v) : String(v ?? '-'));

  const hapus = async () => {
    if (!window.confirm(`Hapus arsip ${d.nomor}? Berkas PDF ikut terhapus dan aksi ini tercatat di log.`)) return;
    try {
      await api(`/dokumen/${d.idArsip}`, { method: 'DELETE' });
      refresh();
      navigate('/cari');
    } catch (e) {
      setErr(e.message);
    }
  };

  const tampilkanRiwayat = async () => {
    const r = await api(`/dokumen/${d.idArsip}/riwayat`);
    setRiwayat(r.hasil);
  };

  return (
    <div className="space-y-4">
      <nav className="text-[13px] font-semibold text-ink-soft">
        <Link to="/direktori" className="text-rose-deep">Direktori</Link>
        <span className="mx-1.5">›</span>{d.kategori}
        <span className="mx-1.5">›</span><span className="text-ink">{d.jenis}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose/25 text-rose-deep"><IconPdf size={24} /></div>
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight">{d.nomor}</h1>
            <p className="text-[13px] text-ink-soft">{d.idArsip} &middot; {d.jenis} &middot; {d.pihak}</p>
          </div>
          <span className={labelGaya(d.label) + ' ml-2'}>{d.label}</span>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <a href={fileUrl(d.idArsip, 'unduh')} className="btn btn-primary"><IconDownload size={17} /> Unduh</a>
          {admin && <Link to={`/arsip/${d.idArsip}/ubah`} className="btn btn-ghost"><IconEdit size={17} /> Ubah</Link>}
          {admin && <button className="btn btn-ghost" onClick={tampilkanRiwayat}><IconClock size={17} /> Riwayat</button>}
          {admin && <button className="btn btn-danger" onClick={hapus}><IconTrash size={17} /> Hapus</button>}
        </div>
      </header>

      {err && <p className="glass-soft rounded-xl2 border-l-4 border-l-bad px-4 py-3 text-[13px] font-semibold text-bad">{err}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="glass rounded-xl3 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">Pratinjau Dokumen</h2>
            <span className="text-[12.5px] font-semibold text-ink-soft">Halaman 1 dari {d.halaman || 1}</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/40">
            <iframe title={`Pratinjau ${d.nomor}`} src={fileUrl(d.idArsip)} className="h-[560px] w-full" />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft">
            <IconEye size={14} /> {user.peran === 'admin' ? 'Pratinjau hanya dapat dibuka admin.' : 'Pratinjau dan unduh tersedia untuk semua peran.'} {d.berkas}
          </p>
        </section>

        <section className="space-y-4">
          <div className="glass rounded-xl3 p-5">
            <h2 className="mb-2 text-[15px] font-extrabold">Keterangan dokumen</h2>
            <Baris label="Kategori">{d.kategori}</Baris>
            <Baris label="Jenis dokumen">{d.jenis}</Baris>
            <Baris label="Nomor dokumen">{d.nomor}</Baris>
            <Baris label="Tanggal dokumen">{tgl(d.tanggal)}</Baris>
            <Baris label="Pihak terkait">{d.pihak} <span className="text-ink-soft">({d.jenisPihak})</span></Baris>
            {d.fieldDefs.map((f) => (
              <Baris key={f.key} label={f.label}>{nilai(f.type, d.fields[f.key])}</Baris>
            ))}
            <Baris label="Arsip terkait">
              {d.arsipTerkait
                ? <Link to={`/arsip/${d.arsipTerkait}`} className="text-rose-deep underline underline-offset-2">{d.arsipTerkait}</Link>
                : '-'}
            </Baris>
          </div>

          <div className="glass-soft rounded-xl3 p-5">
            <h2 className="mb-2 flex items-center gap-2 text-[15px] font-extrabold">
              Keterangan sistem <span className="rounded-full bg-stone/50 px-2 py-0.5 text-[10.5px] font-bold uppercase">terkunci</span>
            </h2>
            <Baris label="ID arsip">{d.idArsip}</Baris>
            <Baris label="Kode klasifikasi">{d.kode}</Baris>
            <Baris label="Nama berkas">{d.berkas}</Baris>
            <Baris label="Jumlah halaman">{d.halaman}</Baris>
            <Baris label="Pengunggah">{d.pengunggah}</Baris>
            <Baris label="Waktu unggah">{tglWaktu(d.waktuUnggah)}</Baris>
            <Baris label="Masa retensi">{d.masaRetensi} tahun</Baris>
            <Baris label="Jatuh retensi">{tgl(d.tanggalRetensi)}</Baris>
            <Baris label="Label retensi"><span className={labelGaya(d.label)}>{d.label}</span></Baris>
          </div>
        </section>
      </div>

      {riwayat && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={() => setRiwayat(null)}>
          <div className="glass-strong max-h-[80vh] w-full max-w-[640px] overflow-y-auto rounded-xl3 p-5 scroll-thin" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold">Riwayat {d.nomor}</h3>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-white/60" onClick={() => setRiwayat(null)}><IconClose size={18} /></button>
            </div>
            {!riwayat.length ? <p className="text-[13.5px] text-ink-soft">Belum ada aktivitas tercatat untuk arsip ini.</p> : (
              <ul className="space-y-1.5">
                {riwayat.map((l) => (
                  <li key={l.id_log} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/45 px-4 py-2.5 text-[13px]">
                    <span className="font-bold">{l.aksi}</span>
                    <span className="text-ink-soft">{l.pengguna || 'Sistem'}</span>
                    <span className="ml-auto text-ink-soft">{tglWaktu(l.waktu)}</span>
                    <span className="w-full text-[12.5px] text-ink-soft">{l.keterangan}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
