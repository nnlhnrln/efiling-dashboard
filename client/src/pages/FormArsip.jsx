import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { tgl, labelGaya } from '../format';
import { useAuth, useStats } from '../context';
import { IconPdf } from '../components/Icons';

function addYears(iso, y) {
  if (!iso) return '';
  const [yy, mm, dd] = iso.split('-').map(Number);
  return `${yy + y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function hitungLabel(due) {
  if (!due) return 'AKTIF';
  const hari = Math.round((new Date(due + 'T00:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 86400000);
  return hari < 0 ? 'LEWAT' : hari <= 90 ? 'MENDEKATI' : 'AKTIF';
}

const Label = ({ children }) => <span className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-ink-soft">{children}</span>;

export default function FormArsip() {
  const { id } = useParams();
  const ubah = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { master, refresh } = useStats();
  const fileRef = useRef(null);

  const [f, setF] = useState({
    idKategori: '', idJenis: '', nomor: '', tanggal: new Date().toISOString().slice(0, 10),
    idPihak: '', arsipTerkait: '', berkas: null, fields: {},
  });
  const [err, setErr] = useState({});
  const [dup, setDup] = useState(null);
  const [umum, setUmum] = useState('');
  const [halaman, setHalaman] = useState('-');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ubah || !master) return;
    api(`/dokumen/${id}`).then((d) => {
      setF({
        idKategori: String(d.idKategori), idJenis: String(d.idJenis), nomor: d.nomor, tanggal: d.tanggal,
        idPihak: String(d.idPihak || ''), arsipTerkait: d.arsipTerkait || '', berkas: null, fields: { ...d.fields },
      });
      setHalaman(d.halaman);
    }).catch((e) => setUmum(e.message));
  }, [ubah, id, master]);

  const kategori = master?.kategori || [];
  const jenis = useMemo(() => (master?.jenis || []).filter((j) => String(j.id_kategori) === String(f.idKategori)), [master, f.idKategori]);
  const jenisAktif = (master?.jenis || []).find((j) => String(j.id_jenis) === String(f.idJenis));
  const katAktif = kategori.find((k) => String(k.id_kategori) === String(f.idKategori));
  const defs = jenisAktif?.fields || [];

  const retensi = jenisAktif ? addYears(f.tanggal, jenisAktif.masa_retensi) : '';
  const label = hitungLabel(retensi);
  const namaBerkas = useMemo(() => {
    if (!jenisAktif || !f.nomor) return 'menunggu isian…';
    const prefix = (jenisAktif.kode + jenisAktif.nama_jenis.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
    const num = f.nomor.replace(/\D/g, '').slice(-4) || '0001';
    return `${prefix}_${num}.pdf`;
  }, [jenisAktif, f.nomor]);

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErr((e) => ({ ...e, [k]: '' })); };
  const setField = (k, v) => { setF((p) => ({ ...p, fields: { ...p.fields, [k]: v } })); setErr((e) => ({ ...e, [`fields.${k}`]: '' })); };

  const pilihBerkas = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setErr((e) => ({ ...e, berkas: 'Berkas harus berformat PDF.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr((e) => ({ ...e, berkas: `Ukuran berkas ${Math.round(file.size / 1024 / 1024 * 10) / 10} MB, maksimal 5 MB.` }));
      return;
    }
    setErr((e) => ({ ...e, berkas: '' }));
    setF((p) => ({ ...p, berkas: file }));
  };

  const validasi = () => {
    const e = {};
    if (!f.idKategori) e.idKategori = 'Pilih kategori arsip.';
    if (!f.idJenis) e.idJenis = 'Pilih jenis dokumen.';
    if (!f.nomor.trim()) e.nomor = 'Nomor dokumen wajib diisi.';
    if (!f.tanggal) e.tanggal = 'Tanggal dokumen wajib diisi.';
    else if (f.tanggal > new Date().toISOString().slice(0, 10)) e.tanggal = 'Tanggal dokumen tidak boleh melewati hari ini.';
    if (!f.idPihak) e.idPihak = 'Pilih pihak terkait.';
    defs.forEach((d) => {
      const v = f.fields[d.key];
      if (d.required && (v === undefined || String(v).trim() === '')) e[`fields.${d.key}`] = `Ruas "${d.label}" wajib diisi.`;
      if (d.type === 'number' && v !== undefined && String(v).trim() !== '' && !isFinite(Number(String(v).replace(/[^\d.-]/g, ''))))
        e[`fields.${d.key}`] = `Ruas "${d.label}" hanya boleh berisi angka.`;
    });
    if (!ubah && !f.berkas) e.berkas = 'Berkas PDF wajib diunggah, maksimal 5 MB.';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const simpan = async () => {
    setUmum('');
    setDup(null);
    if (!validasi()) return;
    const form = new FormData();
    form.append('idJenis', f.idJenis);
    form.append('nomor', f.nomor.trim());
    form.append('tanggal', f.tanggal);
    form.append('idPihak', f.idPihak);
    form.append('arsipTerkait', f.arsipTerkait || '');
    defs.forEach((d) => form.append(`fields[${d.key}]`, f.fields[d.key] ?? ''));
    if (f.berkas) form.append('berkas', f.berkas);
    setBusy(true);
    try {
      const r = await api(ubah ? `/dokumen/${id}` : '/dokumen', { method: ubah ? 'PUT' : 'POST', form });
      refresh();
      navigate(`/arsip/${r.idArsip}`);
    } catch (x) {
      if (x.status === 409) {
        setDup(x.dup);
        setErr({ nomor: x.message });
      } else {
        const map = {};
        (x.errors || []).forEach((er) => { map[er.field] = er.message; });
        if (!x.errors) map.umum = x.message;
        setErr(map);
        setUmum(x.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const E = (k) => err[k] && <p className="mt-1 text-[12.5px] font-semibold text-bad">{err[k]}</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[24px] font-extrabold leading-tight">{ubah ? `Ubah Arsip ${id}` : 'Tambah Arsip Baru'}</h1>
        <p className="text-[13.5px] text-ink-soft">Ruas bertanda * wajib. Ruas khas muncul otomatis sesuai kategori yang dipilih.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <form className="glass rounded-xl3 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); simpan(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Kategori *</Label>
              <select className="field" value={f.idKategori} onChange={(e) => { set('idKategori', e.target.value); set('idJenis', ''); }}>
                <option value="">— pilih kategori —</option>
                {kategori.map((k) => <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori} ({k.kode})</option>)}
              </select>
              {E('idKategori')}
            </div>
            <div>
              <Label>Jenis dokumen *</Label>
              <select className="field" value={f.idJenis} onChange={(e) => set('idJenis', e.target.value)} disabled={!f.idKategori}>
                <option value="">{f.idKategori ? '— pilih jenis —' : 'pilih kategori dulu'}</option>
                {jenis.map((j) => <option key={j.id_jenis} value={j.id_jenis}>{j.nama_jenis}</option>)}
              </select>
              {E('idJenis')}
            </div>
            <div>
              <Label>Nomor dokumen *</Label>
              <input className="field" value={f.nomor} onChange={(e) => set('nomor', e.target.value)} placeholder="mis. INV-2026-0455" />
              {E('nomor')}
            </div>
            <div>
              <Label>Tanggal dokumen *</Label>
              <input className="field" type="date" value={f.tanggal} max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set('tanggal', e.target.value)} />
              <p className="mt-1 text-[12px] text-ink-soft">Format tampil: {tgl(f.tanggal)}</p>
              {E('tanggal')}
            </div>
            <div className="sm:col-span-2">
              <Label>Pihak terkait *</Label>
              <select className="field" value={f.idPihak} onChange={(e) => set('idPihak', e.target.value)}>
                <option value="">— pilih pihak —</option>
                {(master?.pihak || []).map((p) => <option key={p.id_pihak} value={p.id_pihak}>{p.nama_pihak} ({p.jenis_pihak})</option>)}
              </select>
              {E('idPihak')}
            </div>
          </div>

          <div className="my-5 border-t-2 border-dashed border-stone" />
          <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-ink-soft">
            Ruas khas {katAktif ? `— ${katAktif.nama_kategori}` : '— pilih kategori'}
          </p>
          {defs.length === 0 && <p className="text-[13.5px] text-ink-soft">Jenis ini belum punya ruas khas. Tambahkan melalui Data Master.</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            {defs.map((d) => (
              <div key={d.key}>
                <Label>{d.label} {d.required ? '*' : ''}</Label>
                {d.type === 'select' ? (
                  <select className="field" value={f.fields[d.key] || ''} onChange={(e) => setField(d.key, e.target.value)}>
                    <option value="">— pilih —</option>
                    {(d.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="field" type={d.type === 'date' ? 'date' : d.type === 'number' ? 'text' : 'text'}
                    inputMode={d.type === 'number' ? 'numeric' : undefined}
                    placeholder={d.type === 'number' ? 'hanya angka' : ''}
                    value={f.fields[d.key] ?? ''} onChange={(e) => setField(d.key, e.target.value)} />
                )}
                {E(`fields.${d.key}`)}
              </div>
            ))}
          </div>

          <div className="my-5 border-t-2 border-dashed border-stone" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Berkas PDF {ubah ? '(kosongkan bila tidak diganti)' : '*'}</Label>
              <label className="field flex cursor-pointer items-center gap-3">
                <IconPdf size={20} className="text-rose-deep" />
                <span className="truncate text-[13px]">{f.berkas ? f.berkas.name : (ubah ? 'belum diganti' : 'pilih berkas .pdf maks 5 MB')}</span>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                  onChange={(e) => pilihBerkas(e.target.files[0])} />
              </label>
              {E('berkas')}
            </div>
            <div>
              <Label>Arsip terkait</Label>
              <input className="field" value={f.arsipTerkait} onChange={(e) => set('arsipTerkait', e.target.value)} placeholder="mis. PO-2026-0210" />
            </div>
          </div>

          {dup && (
            <p className="mt-4 rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-[13px] font-semibold text-bad">
              Nomor {f.nomor} sudah terdaftar.{' '}
              <Link to={`/arsip/${dup.idArsip}`} className="underline underline-offset-2">Buka arsip {dup.idArsip}?</Link>
            </p>
          )}
          {err.umum && !dup && <p className="mt-4 rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-[13px] font-semibold text-bad">{err.umum}</p>}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : (ubah ? 'Simpan Perubahan' : 'Simpan Arsip')}</button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Batal</button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="glass-soft rounded-xl3 p-5">
            <h2 className="mb-2 text-[14.5px] font-extrabold">Diisi sistem (tidak dapat diubah)</h2>
            {[
              ['ID arsip', ubah ? id : 'ARS-0000## (otomatis)'],
              ['Pengunggah', user.nama],
              ['Waktu unggah', ubah ? 'tidak berubah' : new Date().toLocaleString('id-ID')],
              ['Masa retensi', jenisAktif ? `${jenisAktif.masa_retensi} tahun` : '-'],
              ['Jatuh retensi', retensi ? tgl(retensi) : '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-stone/40 py-2 text-[13px] last:border-0">
                <span className="text-ink-soft">{k}</span><b>{v}</b>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-ink-soft">Label retensi</span>
              <span className={labelGaya(label)}>{label}</span>
            </div>
          </div>

          <div className="glass rounded-xl3 p-5">
            <h2 className="mb-2 text-[14.5px] font-extrabold">Melekat pada struktur</h2>
            {[
              ['Kode klasifikasi', katAktif ? katAktif.kode : '-'],
              ['Nama berkas otomatis', namaBerkas],
              ['Jumlah halaman', halaman],
              ['Berkas aktif', ubah ? '(lihat detail)' : '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-stone/40 py-2 text-[13px] last:border-0">
                <span className="text-ink-soft">{k}</span><b className="truncate text-right">{v}</b>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
