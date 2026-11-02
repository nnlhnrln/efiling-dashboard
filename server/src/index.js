'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { db, sha, localStamp, todayStr, UPLOAD_DIR } = require('./db');
const { seed } = require('./seed');
const { countPages } = require('./pdfkit');

seed();

const app = express();
const PORT = process.env.PORT || 4000;
const MAX_PDF = 5 * 1024 * 1024;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    cb(isPdf ? null : new Error('Berkas harus berformat PDF.'), isPdf);
  },
});

/* ---------- util ---------- */

function addYears(iso, y) {
  const [yy, mm, dd] = String(iso).split('-').map(Number);
  let ny = yy + y;
  if (mm === 2 && dd === 29) ny -= 1;
  return `${ny}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function dayDiff(fromIso, toIso) {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

function retensiLabel(tanggalRetensi) {
  if (!tanggalRetensi) return 'AKTIF';
  const d = dayDiff(todayStr(), tanggalRetensi);
  if (d < 0) return 'LEWAT';
  if (d <= 90) return 'MENDEKATI';
  return 'AKTIF';
}

const SELECT_DOCS = `
  SELECT d.*, j.nama_jenis, j.masa_retensi, j.fields_json, k.kode, k.nama_kategori, k.id_kategori,
         p.nama_pihak, p.jenis_pihak, u.nama AS pengunggah, u.username AS username_pengunggah
  FROM dokumen d
  JOIN jenis_dokumen j ON j.id_jenis = d.id_jenis
  JOIN kategori k ON k.id_kategori = j.id_kategori
  LEFT JOIN pihak_terkait p ON p.id_pihak = d.id_pihak
  LEFT JOIN pengguna u ON u.id_pengguna = d.id_pengguna`;

function toApi(row) {
  let fields = {};
  try { fields = JSON.parse(row.fields || '{}'); } catch (e) { fields = {}; }
  return {
    idArsip: row.id_arsip,
    idDokumen: row.id_dokumen,
    idJenis: row.id_jenis,
    idKategori: row.id_kategori,
    kode: row.kode,
    kategori: row.nama_kategori,
    jenis: row.nama_jenis,
    masaRetensi: row.masa_retensi,
    nomor: row.nomor_dokumen,
    tanggal: row.tanggal_dokumen,
    pihak: row.nama_pihak || '-',
    jenisPihak: row.jenis_pihak || '',
    berkas: row.berkas_pdf,
    halaman: row.jumlah_halaman,
    tanggalRetensi: row.tanggal_retensi,
    label: retensiLabel(row.tanggal_retensi),
    sisaHari: row.tanggal_retensi ? dayDiff(todayStr(), row.tanggal_retensi) : null,
    status: row.status,
    pengunggah: row.pengunggah || '-',
    waktuUnggah: row.waktu_unggah,
    arsipTerkait: row.arsip_terkait || '',
    fields,
    fieldDefs: JSON.parse(row.fields_json || '[]'),
  };
}

function log(idPengguna, idArsip, aksi, keterangan) {
  db.prepare('INSERT INTO log_aktivitas (id_pengguna, id_arsip, aksi, waktu, keterangan) VALUES (?,?,?,?,?)')
    .run(idPengguna == null ? null : idPengguna, idArsip || null, aksi, localStamp(), keterangan || null);
}

/* ---------- auth ---------- */

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : String(req.query.t || req.query.token || '');
  const ses = token && db.prepare('SELECT * FROM sesi WHERE token = ?').get(token);
  if (!ses) return res.status(401).json({ error: 'Sesi berakhir. Silakan masuk kembali.' });
  const user = db.prepare('SELECT id_pengguna, nama, username, email, peran FROM pengguna WHERE id_pengguna = ?').get(ses.id_pengguna);
  if (!user) return res.status(401).json({ error: 'Akun tidak ditemukan.' });
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.peran === 'admin') return next();
  log(req.user.id_pengguna, req.params.id || null, 'DITOLAK',
    `Aksi ${req.method} ${req.baseUrl + req.path.split('?')[0]} ditolak: peran user biasa`);
  return res.status(403).json({ error: 'Hanya admin yang dapat melakukan aksi ini.' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM pengguna WHERE username = ?').get(String(username || '').trim());
  if (!u || u.password !== sha(String(password || ''))) {
    log(u ? u.id_pengguna : null, null, 'DITOLAK', `Percobaan login gagal (${username || '-'})`);
    return res.status(401).json({ error: 'Username atau kata sandi salah.' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sesi (token, id_pengguna, dibuat_pada) VALUES (?,?,?)').run(token, u.id_pengguna, localStamp());
  log(u.id_pengguna, null, 'MASUK', `Login sebagai ${u.peran}`);
  res.json({ token, user: { id: u.id_pengguna, nama: u.nama, username: u.username, email: u.email, peran: u.peran } });
});

app.post('/api/logout', auth, (req, res) => {
  const h = req.headers.authorization || '';
  db.prepare('DELETE FROM sesi WHERE token = ?').run(h.slice(7));
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));

/* ---------- baca ---------- */

app.get('/api/summary', auth, (req, res) => {
  const rows = db.prepare(SELECT_DOCS).all().map(toApi);
  const bulan = todayStr().slice(0, 7);
  res.json({
    total: rows.length,
    bulanIni: rows.filter((r) => String(r.waktuUnggah || '').slice(0, 7) === bulan).length,
    aktif: rows.filter((r) => r.label === 'AKTIF').length,
    mendekati: rows.filter((r) => r.label === 'MENDEKATI').length,
    lewat: rows.filter((r) => r.label === 'LEWAT').length,
    terbaru: rows.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1)).slice(0, 6),
    peringatan: rows.filter((r) => r.label !== 'AKTIF')
      .sort((a, b) => (a.sisaHari || 0) - (b.sisaHari || 0)).slice(0, 8),
  });
});

app.get('/api/master', auth, (req, res) => {
  const kategori = db.prepare('SELECT * FROM kategori ORDER BY kode').all();
  const jenis = db.prepare('SELECT * FROM jenis_dokumen ORDER BY id_kategori, nama_jenis').all();
  const pohon = kategori.map((k) => ({
    ...k,
    jenis: jenis.filter((j) => j.id_kategori === k.id_kategori)
      .map((j) => ({ ...j, jumlah: db.prepare('SELECT COUNT(*) c FROM dokumen WHERE id_jenis = ?').get(j.id_jenis).c })),
  }));
  res.json({
    kategori,
    jenis: jenis.map((j) => ({ ...j, fields: JSON.parse(j.fields_json || '[]') })),
    pihak: db.prepare('SELECT * FROM pihak_terkait ORDER BY nama_pihak').all(),
    pohon,
  });
});

app.get('/api/dokumen', auth, (req, res) => {
  const { q, kategori, tahun, status, label, idJenis, limit } = req.query;
  let rows = db.prepare(SELECT_DOCS).all().map(toApi);
  if (kategori) rows = rows.filter((r) => String(r.idKategori) === String(kategori));
  if (idJenis) rows = rows.filter((r) => String(r.idJenis) === String(idJenis));
  if (tahun) rows = rows.filter((r) => String(r.tanggal).startsWith(String(tahun)));
  if (label) rows = rows.filter((r) => r.label === label);
  if (status) rows = rows.filter((r) => r.status === status);
  if (q) {
    const s = String(q).toLowerCase();
    rows = rows.filter((r) => [r.nomor, r.pihak, r.jenis, r.kategori, r.idArsip, r.arsipTerkait,
      r.fields.perihal, r.fields.pengirim_penerima].some((v) => String(v || '').toLowerCase().includes(s)));
  }
  rows.sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : b.idDokumen - a.idDokumen));
  res.json({ jumlah: rows.length, hasil: limit ? rows.slice(0, Number(limit)) : rows });
});

app.get('/api/dokumen/:id', auth, (req, res) => {
  const row = db.prepare(SELECT_DOCS + ' WHERE d.id_arsip = ? OR d.id_dokumen = ?')
    .get(req.params.id, req.params.id);
  if (!row) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
  const api = toApi(row);
  log(req.user.id_pengguna, api.idArsip, 'LIHAT', `Membuka detail ${api.nomor}`);
  res.json(api);
});

app.get('/api/dokumen/:id/riwayat', auth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT l.*, u.nama AS pengguna, d.nomor_dokumen AS nomor
    FROM log_aktivitas l LEFT JOIN pengguna u ON u.id_pengguna = l.id_pengguna
    LEFT JOIN dokumen d ON d.id_arsip = l.id_arsip
    WHERE l.id_arsip = ? ORDER BY l.waktu DESC`).all(req.params.id);
  res.json({ hasil: rows });
});

function serveFile(req, res, disposition) {
  const row = db.prepare('SELECT * FROM dokumen WHERE id_arsip = ? OR id_dokumen = ?').get(req.params.id, req.params.id);
  if (!row) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
  const fp = path.join(UPLOAD_DIR, path.basename(row.berkas_pdf || ''));
  if (!row.berkas_pdf || !fs.existsSync(fp)) return res.status(404).json({ error: 'Berkas PDF belum tersedia.' });
  if (disposition === 'attachment') log(req.user.id_pengguna, row.id_arsip, 'UNDUH', `Mengunduh ${row.nomor_dokumen}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.berkas_pdf)}"`);
  if (disposition === 'attachment') {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.berkas_pdf)}"`);
  }
  fs.createReadStream(fp).pipe(res);
}

app.get('/api/dokumen/:id/berkas', auth, (req, res) => serveFile(req, res, req.query.mode === 'unduh' ? 'attachment' : 'inline'));

app.get('/api/log', auth, adminOnly, (req, res) => {
  const { aksi, q, limit } = req.query;
  let rows = db.prepare(`SELECT l.*, u.nama AS pengguna, d.nomor_dokumen AS nomor
    FROM log_aktivitas l LEFT JOIN pengguna u ON u.id_pengguna = l.id_pengguna
    LEFT JOIN dokumen d ON d.id_arsip = l.id_arsip
    ORDER BY l.waktu DESC, l.id_log DESC`).all();
  if (aksi) rows = rows.filter((r) => r.aksi === aksi);
  if (q) {
    const s = String(q).toLowerCase();
    rows = rows.filter((r) => [r.pengguna, r.aksi, r.id_arsip, r.nomor, r.keterangan]
      .some((v) => String(v || '').toLowerCase().includes(s)));
  }
  res.json({ jumlah: rows.length, hasil: limit ? rows.slice(0, Number(limit)) : rows });
});

app.get('/api/utang', auth, (req, res) => {
  const bulan = req.query.bulan || todayStr().slice(0, 7);
  const rows = db.prepare(SELECT_DOCS).all().map(toApi)
    .filter((r) => r.fields.status_lunas === 'Belum lunas'
      && String(r.fields.jatuh_tempo || '').startsWith(bulan))
    .sort((a, b) => String(a.fields.jatuh_tempo).localeCompare(String(b.fields.jatuh_tempo)));
  res.json({
    bulan,
    hasil: rows.map((r) => ({
      idArsip: r.idArsip, nomor: r.nomor, pihak: r.pihak, jenis: r.jenis,
      nilai: Number(r.fields.nilai || 0), jatuhTempo: r.fields.jatuh_tempo,
    })),
    total: rows.reduce((s, r) => s + Number(r.fields.nilai || 0), 0),
  });
});

/* ---------- tulis (admin) ---------- */

function validateBody(body, defs, isNew) {
  const errors = [];
  const req = ['idJenis', 'nomor', 'tanggal', 'idPihak'];
  const val = {
    idJenis: body.idJenis, nomor: String(body.nomor || '').trim(),
    tanggal: body.tanggal, idPihak: body.idPihak, arsipTerkait: String(body.arsipTerkait || '').trim(),
    fields: {},
  };
  req.forEach((k) => { if (val[k] === undefined || val[k] === '' || val[k] === null) errors.push({ field: k, message: 'Ruas ini wajib diisi.' }); });
  if (val.tanggal && val.tanggal > todayStr()) errors.push({ field: 'tanggal', message: `Tanggal dokumen tidak boleh melewati hari ini (${todayStr().split('-').reverse().join('-')}).` });

  const src = typeof body.fields === 'object' && body.fields ? body.fields : {};
  (defs || []).forEach((f) => {
    const v = src[f.key];
    if (v === undefined || String(v).trim() === '') {
      if (f.required) errors.push({ field: `fields.${f.key}`, message: `Ruas khas "${f.label}" wajib diisi.` });
      return;
    }
    if (f.type === 'number') {
      const n = Number(String(v).replace(/[^\d.-]/g, ''));
      if (!isFinite(n)) return errors.push({ field: `fields.${f.key}`, message: `Ruas "${f.label}" hanya boleh berisi angka.` });
      val.fields[f.key] = n;
    } else val.fields[f.key] = String(v).trim();
  });
  return { errors, val };
}

function nextArsip() {
  const max = db.prepare('SELECT MAX(id_dokumen) m FROM dokumen').get().m || 0;
  return `ARS-${String(max + 1).padStart(6, '0')}`;
}

function uniqueFile(prefix, num) {
  let f = `${prefix}_${num}.pdf`;
  let s = 2;
  while (fs.existsSync(path.join(UPLOAD_DIR, f))) f = `${prefix}_${num}_${s++}.pdf`;
  return f;
}

app.post('/api/dokumen', auth, adminOnly, upload.single('berkas'), (req, res) => {
  const jenis = db.prepare('SELECT j.*, k.kode FROM jenis_dokumen j JOIN kategori k ON k.id_kategori=j.id_kategori WHERE j.id_jenis = ?')
    .get(req.body.idJenis);
  if (!jenis) return res.status(400).json({ errors: [{ field: 'idJenis', message: 'Jenis dokumen tidak dikenali.' }] });
  const { errors, val } = validateBody(req.body, JSON.parse(jenis.fields_json || '[]'), true);
  if (!req.file) errors.push({ field: 'berkas', message: 'Berkas PDF wajib diunggah, maksimal 5 MB.' });
  const dup = db.prepare('SELECT * FROM dokumen WHERE nomor_dokumen = ?').get(val.nomor);
  if (dup) {
    return res.status(409).json({
      error: `Nomor ${val.nomor} sudah terdaftar pada ${dup.tanggal_dokumen.split('-').reverse().join('-')}. Buka arsip tersebut?`,
      dup: { idArsip: dup.id_arsip, nomor: dup.nomor_dokumen, tanggal: dup.tanggal_dokumen },
    });
  }
  if (errors.length) return res.status(400).json({ errors, error: errors[0].message });

  const prefix = (jenis.kode + jenis.nama_jenis.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
  const num = String(val.nomor).replace(/\D/g, '').slice(-4) || '0001';
  const file = uniqueFile(prefix, num);
  fs.writeFileSync(path.join(UPLOAD_DIR, file), req.file.buffer);
  const idArsip = nextArsip();
  const retensi = addYears(val.tanggal, jenis.masa_retensi);
  db.prepare(`INSERT INTO dokumen (id_arsip, id_jenis, nomor_dokumen, tanggal_dokumen, id_pihak, berkas_pdf,
      jumlah_halaman, tanggal_retensi, status, id_pengguna, waktu_unggah, arsip_terkait, fields)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(idArsip, jenis.id_jenis, val.nomor, val.tanggal, val.idPihak, file, countPages(req.file.buffer),
      retensi, 'Arsip', req.user.id_pengguna, localStamp(), val.arsipTerkait, JSON.stringify(val.fields));
  log(req.user.id_pengguna, idArsip, 'TAMBAH', `Menambah arsip ${val.nomor} (${jenis.nama_jenis})`);
  res.status(201).json(toApi(db.prepare(SELECT_DOCS + ' WHERE d.id_arsip = ?').get(idArsip)));
});

app.put('/api/dokumen/:id', auth, adminOnly, upload.single('berkas'), (req, res) => {
  const row = db.prepare('SELECT * FROM dokumen WHERE id_arsip = ? OR id_dokumen = ?').get(req.params.id, req.params.id);
  if (!row) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
  const jenisId = req.body.idJenis || row.id_jenis;
  const jenis = db.prepare('SELECT j.*, k.kode FROM jenis_dokumen j JOIN kategori k ON k.id_kategori=j.id_kategori WHERE j.id_jenis = ?').get(jenisId);
  const { errors, val } = validateBody(req.body, JSON.parse(jenis.fields_json || '[]'), false);
  const dup = db.prepare('SELECT * FROM dokumen WHERE nomor_dokumen = ? AND id_dokumen <> ?').get(val.nomor, row.id_dokumen);
  if (dup) {
    return res.status(409).json({
      error: `Nomor ${val.nomor} sudah terdaftar pada ${dup.tanggal_dokumen.split('-').reverse().join('-')}. Buka arsip tersebut?`,
      dup: { idArsip: dup.id_arsip, nomor: dup.nomor_dokumen, tanggal: dup.tanggal_dokumen },
    });
  }
  if (errors.length) return res.status(400).json({ errors, error: errors[0].message });
  let berkas = row.berkas_pdf, halaman = row.jumlah_halaman;
  if (req.file) {
    const prefix = (jenis.kode + jenis.nama_jenis.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
    const num = String(val.nomor).replace(/\D/g, '').slice(-4) || '0001';
    berkas = uniqueFile(prefix, num);
    fs.writeFileSync(path.join(UPLOAD_DIR, berkas), req.file.buffer);
    halaman = countPages(req.file.buffer);
  }
  db.prepare(`UPDATE dokumen SET id_jenis=?, nomor_dokumen=?, tanggal_dokumen=?, id_pihak=?, berkas_pdf=?,
      jumlah_halaman=?, tanggal_retensi=?, arsip_terkait=?, fields=?, waktu_unggah=?, id_pengguna=? WHERE id_dokumen=?`)
    .run(jenis.id_jenis, val.nomor, val.tanggal, val.idPihak, berkas, halaman,
      addYears(val.tanggal, jenis.masa_retensi), val.arsipTerkait, JSON.stringify(val.fields),
      row.waktu_unggah, row.id_pengguna, row.id_dokumen);
  log(req.user.id_pengguna, row.id_arsip, 'UBAH', `Memperbarui metadata ${val.nomor}`);
  res.json(toApi(db.prepare(SELECT_DOCS + ' WHERE d.id_dokumen = ?').get(row.id_dokumen)));
});

app.delete('/api/dokumen/:id', auth, adminOnly, (req, res) => {
  const row = db.prepare('SELECT * FROM dokumen WHERE id_arsip = ? OR id_dokumen = ?').get(req.params.id, req.params.id);
  if (!row) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
  db.prepare('DELETE FROM dokumen WHERE id_dokumen = ?').run(row.id_dokumen);
  if (row.berkas_pdf) {
    const fp = path.join(UPLOAD_DIR, path.basename(row.berkas_pdf));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  log(req.user.id_pengguna, row.id_arsip, 'HAPUS', `Menghapus arsip ${row.nomor_dokumen}`);
  res.json({ ok: true });
});

/* ---------- data master (admin) ---------- */

const MASTER = {
  kategori: { table: 'kategori', pk: 'id_kategori' },
  jenis: { table: 'jenis_dokumen', pk: 'id_jenis' },
  pihak: { table: 'pihak_terkait', pk: 'id_pihak' },
};

function masterHandler(kind) {
  const meta = MASTER[kind];
  const router = express.Router();
  router.use(auth, adminOnly);
  router.post('/', (req, res) => {
    const b = req.body || {};
    try {
      if (kind === 'kategori') {
        const r = db.prepare('INSERT INTO kategori (kode, nama_kategori) VALUES (?,?)').run(String(b.kode).trim().toUpperCase(), String(b.nama_kategori).trim());
        log(req.user.id_pengguna, null, 'UBAH', `Data Master: tambah kategori ${b.nama_kategori}`);
        return res.status(201).json(db.prepare('SELECT * FROM kategori WHERE id_kategori=?').get(r.lastInsertRowid));
      }
      if (kind === 'jenis') {
        const fields = Array.isArray(b.fields) ? JSON.stringify(b.fields) : '[]';
        const r = db.prepare('INSERT INTO jenis_dokumen (id_kategori, nama_jenis, masa_retensi, fields_json) VALUES (?,?,?,?)')
          .run(b.id_kategori, String(b.nama_jenis).trim(), Number(b.masa_retensi) || 1, fields);
        log(req.user.id_pengguna, null, 'UBAH', `Data Master: tambah jenis ${b.nama_jenis}`);
        return res.status(201).json(db.prepare('SELECT * FROM jenis_dokumen WHERE id_jenis=?').get(r.lastInsertRowid));
      }
      const r = db.prepare('INSERT INTO pihak_terkait (nama_pihak, jenis_pihak) VALUES (?,?)')
        .run(String(b.nama_pihak).trim(), String(b.jenis_pihak || 'Perusahaan').trim());
      log(req.user.id_pengguna, null, 'UBAH', `Data Master: tambah pihak ${b.nama_pihak}`);
      return res.status(201).json(db.prepare('SELECT * FROM pihak_terkait WHERE id_pihak=?').get(r.lastInsertRowid));
    } catch (e) {
      return res.status(400).json({ error: 'Data gagal disimpan: ' + e.message });
    }
  });
  router.put('/:id', (req, res) => {
    const b = req.body || {};
    try {
      if (kind === 'kategori') {
        db.prepare('UPDATE kategori SET kode=?, nama_kategori=? WHERE id_kategori=?')
          .run(String(b.kode).trim().toUpperCase(), String(b.nama_kategori).trim(), req.params.id);
      } else if (kind === 'jenis') {
        db.prepare('UPDATE jenis_dokumen SET id_kategori=?, nama_jenis=?, masa_retensi=?, fields_json=? WHERE id_jenis=?')
          .run(b.id_kategori, String(b.nama_jenis).trim(), Number(b.masa_retensi) || 1,
            Array.isArray(b.fields) ? JSON.stringify(b.fields) : '[]', req.params.id);
      } else {
        db.prepare('UPDATE pihak_terkait SET nama_pihak=?, jenis_pihak=? WHERE id_pihak=?')
          .run(String(b.nama_pihak).trim(), String(b.jenis_pihak || 'Perusahaan').trim(), req.params.id);
      }
      log(req.user.id_pengguna, null, 'UBAH', `Data Master: mengubah ${kind} #${req.params.id}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: 'Data gagal diperbarui: ' + e.message });
    }
  });
  router.delete('/:id', (req, res) => {
    try {
      if (kind === 'jenis') {
        const c = db.prepare('SELECT COUNT(*) c FROM dokumen WHERE id_jenis=?').get(req.params.id).c;
        if (c) return res.status(400).json({ error: `Jenis ini masih dipakai ${c} arsip. Pindahkan arsip terlebih dahulu.` });
        db.prepare('DELETE FROM jenis_dokumen WHERE id_jenis=?').run(req.params.id);
      } else if (kind === 'kategori') {
        const c = db.prepare('SELECT COUNT(*) c FROM jenis_dokumen WHERE id_kategori=?').get(req.params.id).c;
        if (c) return res.status(400).json({ error: `Kategori ini masih punya ${c} jenis dokumen.` });
        db.prepare('DELETE FROM kategori WHERE id_kategori=?').run(req.params.id);
      } else {
        db.prepare('DELETE FROM pihak_terkait WHERE id_pihak=?').run(req.params.id);
      }
      log(req.user.id_pengguna, null, 'UBAH', `Data Master: menghapus ${kind} #${req.params.id}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: 'Data gagal dihapus: ' + e.message });
    }
  });
  return router;
}

app.use('/api/master/kategori', masterHandler('kategori'));
app.use('/api/master/jenis', masterHandler('jenis'));
app.use('/api/master/pihak', masterHandler('pihak'));

/* ---------- static + errors ---------- */

app.use('/uploads', (req, res) => {
  res.status(403).json({ error: 'Berkas hanya dapat diakses melalui API.' });
});

const CLIENT = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(CLIENT)) {
  app.use(express.static(CLIENT));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(CLIENT, 'index.html')));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Ukuran berkas maksimal 5 MB.', errors: [{ field: 'berkas', message: 'Ukuran berkas maksimal 5 MB.' }] });
  }
  if (err && /PDF/.test(err.message || '')) {
    return res.status(400).json({ error: err.message, errors: [{ field: 'berkas', message: err.message }] });
  }
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`Server arsip jalan di http://localhost:${PORT}`);
});
