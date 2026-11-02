'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'efiling.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS pengguna (
  id_pengguna INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  peran TEXT NOT NULL CHECK (peran IN ('admin','user'))
);
CREATE TABLE IF NOT EXISTS sesi (
  token TEXT PRIMARY KEY,
  id_pengguna INTEGER NOT NULL REFERENCES pengguna(id_pengguna),
  dibuat_pada TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kategori (
  id_kategori INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama_kategori TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jenis_dokumen (
  id_jenis INTEGER PRIMARY KEY AUTOINCREMENT,
  id_kategori INTEGER NOT NULL REFERENCES kategori(id_kategori),
  nama_jenis TEXT NOT NULL,
  masa_retensi INTEGER NOT NULL,
  fields_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS pihak_terkait (
  id_pihak INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_pihak TEXT NOT NULL,
  jenis_pihak TEXT NOT NULL DEFAULT 'Perusahaan'
);
CREATE TABLE IF NOT EXISTS dokumen (
  id_dokumen INTEGER PRIMARY KEY AUTOINCREMENT,
  id_arsip TEXT NOT NULL UNIQUE,
  id_jenis INTEGER NOT NULL REFERENCES jenis_dokumen(id_jenis),
  nomor_dokumen TEXT NOT NULL UNIQUE,
  tanggal_dokumen TEXT NOT NULL,
  id_pihak INTEGER REFERENCES pihak_terkait(id_pihak),
  berkas_pdf TEXT,
  jumlah_halaman INTEGER DEFAULT 1,
  tanggal_retensi TEXT,
  status TEXT DEFAULT 'Arsip',
  id_pengguna INTEGER REFERENCES pengguna(id_pengguna),
  waktu_unggah TEXT,
  arsip_terkait TEXT,
  fields TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS log_aktivitas (
  id_log INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pengguna INTEGER,
  id_arsip TEXT,
  aksi TEXT NOT NULL,
  waktu TEXT NOT NULL,
  keterangan TEXT
);
CREATE INDEX IF NOT EXISTS idx_dok_jenis ON dokumen(id_jenis);
CREATE INDEX IF NOT EXISTS idx_log_waktu ON log_aktivitas(waktu);
`);

function sha(s) {
  return crypto.createHash('sha256').update('efiling::' + s).digest('hex');
}

function localStamp(d, withTime) {
  const s = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Jakarta',
  }).format(d || new Date());
  return withTime === false ? s.slice(0, 10) : s.slice(0, 19);
}
function nowIso() {
  return localStamp();
}
function todayStr() {
  return localStamp(new Date(), false);
}

const count = db.prepare('SELECT COUNT(*) AS c FROM pengguna').get().c;
if (count === 0) {
  const insUser = db.prepare('INSERT INTO pengguna (nama, username, password, email, peran) VALUES (?,?,?,?,?)');
  insUser.run('Rina Amelia', 'admin.toko', sha('Admin123!'), 'rina.toko@efiling.id', 'admin');
  insUser.run('Andi Pratama', 'user.toko', sha('User123!'), 'andi.toko@efiling.id', 'user');

  const insKat = db.prepare('INSERT INTO kategori (kode, nama_kategori) VALUES (?,?)');
  const idPMB = insKat.run('PMB', 'Pembelian').lastInsertRowid;
  const idSRT = insKat.run('SRT', 'Persuratan').lastInsertRowid;
  const idKMT = insKat.run('KMT', 'Kemitraan').lastInsertRowid;

  const F = (arr) => JSON.stringify(arr);
  const insJ = db.prepare('INSERT INTO jenis_dokumen (id_kategori, nama_jenis, masa_retensi, fields_json) VALUES (?,?,?,?)');
  insJ.run(idPMB, 'Pesanan Pembelian', 5, F([
    { key: 'nilai', label: 'Nilai', type: 'number', required: true },
    { key: 'jatuh_tempo', label: 'Jatuh tempo', type: 'date', required: true },
    { key: 'status_lunas', label: 'Status lunas', type: 'select', options: ['Belum lunas', 'Lunas'], required: true },
  ]));
  insJ.run(idPMB, 'Faktur Pemasok', 5, F([
    { key: 'nilai', label: 'Nilai', type: 'number', required: true },
    { key: 'jatuh_tempo', label: 'Jatuh tempo', type: 'date', required: true },
    { key: 'status_lunas', label: 'Status lunas', type: 'select', options: ['Belum lunas', 'Lunas'], required: true },
  ]));
  insJ.run(idPMB, 'Bukti Bayar', 5, F([
    { key: 'nilai', label: 'Nilai', type: 'number', required: true },
    { key: 'tanggal_bayar', label: 'Tanggal bayar', type: 'date', required: true },
    { key: 'status_lunas', label: 'Status lunas', type: 'select', options: ['Belum lunas', 'Lunas'], required: true },
  ]));
  insJ.run(idSRT, 'Surat Jalan Masuk', 3, F([
    { key: 'pengirim_penerima', label: 'Pengirim/Penerima', type: 'text', required: true },
    { key: 'perihal', label: 'Perihal', type: 'text', required: true },
    { key: 'lampiran', label: 'Lampiran', type: 'text', required: false },
  ]));
  insJ.run(idKMT, 'Perjanjian Keagenan', 10, F([
    { key: 'masa_berlaku', label: 'Masa berlaku', type: 'text', required: true },
    { key: 'wilayah', label: 'Wilayah', type: 'text', required: true },
    { key: 'nilai_jaminan', label: 'Nilai jaminan', type: 'number', required: true },
  ]));

  const insP = db.prepare('INSERT INTO pihak_terkait (nama_pihak, jenis_pihak) VALUES (?,?)');
  ['CV Sinar Jaya', 'PT Sentosa Jaya', 'PT Prinsipal Abadi', 'PT Ekspes Kilat', 'CV Mitra Sejahtera', 'PT Unggul Material']
    .forEach((n, i) => insP.run(n, i === 3 ? 'Ekspedisi' : 'Perusahaan'));
}

module.exports = { db, sha, nowIso, todayStr, localStamp, UPLOAD_DIR, DATA_DIR };
