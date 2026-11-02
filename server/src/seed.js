'use strict';
const fs = require('fs');
const path = require('path');
const { db, todayStr, localStamp, UPLOAD_DIR } = require('./db');
const { buildPdf } = require('./pdfkit');

function stamp(daysAgo, hourOffset) {
  const t = new Date(Date.now() - (daysAgo || 0) * 86400000 + (hourOffset || 0) * 3600000);
  return localStamp(t);
}

function addYears(iso, y) {
  const [yy, mm, dd] = iso.split('-').map(Number);
  let ny = yy + y;
  if (mm === 2 && dd === 29 && !((ny % 4 === 0 && ny % 100 !== 0) || ny % 400 === 0)) ny -= 1;
  return `${ny}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

const JENIS = {};
db.prepare(`SELECT j.id_jenis, j.masa_retensi, j.fields_json, k.kode, k.nama_kategori, j.nama_jenis
            FROM jenis_dokumen j JOIN kategori k ON k.id_kategori = j.id_kategori`).all()
  .forEach((r) => { JENIS[r.nama_jenis] = r; });

const PIHAK = {};
db.prepare('SELECT * FROM pihak_terkait').all().forEach((r) => { PIHAK[r.nama_pihak] = r.id_pihak; });

const insLog = db.prepare('INSERT INTO log_aktivitas (id_pengguna, id_arsip, aksi, waktu, keterangan) VALUES (?,?,?,?,?)');

const D = (tanggal, jenis, nomor, pihak, fields, pages) => ({ tanggal, jenis, nomor, pihak, fields, pages });

const docs = [
  D('2026-10-08', 'Faktur Pemasok', 'INV-2026-0455', 'CV Sinar Jaya', { nilai: 14250000, jatuh_tempo: '2026-10-08', status_lunas: 'Belum lunas' }, 2),
  D('2026-09-21', 'Pesanan Pembelian', 'PO-2026-0210', 'PT Sentosa Jaya', { nilai: 8750000, jatuh_tempo: '2026-10-05', status_lunas: 'Lunas' }, 1),
  D('2026-09-25', 'Bukti Bayar', 'BYR-2026-0091', 'PT Sentosa Jaya', { nilai: 8750000, tanggal_bayar: '2026-09-28', status_lunas: 'Lunas' }, 1),
  D('2026-08-30', 'Surat Jalan Masuk', 'SJ-2026-0188', 'PT Ekspes Kilat', { pengirim_penerima: 'PT Sentosa Jaya -> Toko Makmur', perihal: 'Pengiriman 120 unit material', lampiran: '1 lembar packing list' }, 1),
  D('2026-01-15', 'Perjanjian Keagenan', 'PKS-2026-0003', 'PT Prinsipal Abadi', { masa_berlaku: '15 Januari 2026 - 14 Januari 2029', wilayah: 'Jawa Tengah dan DIY', nilai_jaminan: 50000000 }, 3),
  D('2026-10-02', 'Pesanan Pembelian', 'PO-2026-0231', 'CV Mitra Sejahtera', { nilai: 3200000, jatuh_tempo: '2026-10-20', status_lunas: 'Belum lunas' }, 1),
  D('2026-10-12', 'Faktur Pemasok', 'INV-2026-0470', 'PT Unggul Material', { nilai: 6480000, jatuh_tempo: '2026-11-12', status_lunas: 'Belum lunas' }, 2),
  D('2026-10-14', 'Bukti Bayar', 'BYR-2026-0102', 'CV Sinar Jaya', { nilai: 5000000, tanggal_bayar: '2026-10-15', status_lunas: 'Lunas' }, 1),
  D('2026-10-05', 'Surat Jalan Masuk', 'SJ-2026-0201', 'PT Ekspes Kilat', { pengirim_penerima: 'CV Mitra Sejahtera -> Toko Makmur', perihal: 'Barang retur 3 unit', lampiran: 'foto kondisi barang' }, 2),
  D('2026-03-10', 'Pesanan Pembelian', 'PO-2026-0101', 'PT Sentosa Jaya', { nilai: 12400000, jatuh_tempo: '2026-03-30', status_lunas: 'Lunas' }, 1),
  D('2026-02-18', 'Faktur Pemasok', 'INV-2026-0301', 'PT Unggul Material', { nilai: 2975000, jatuh_tempo: '2026-03-05', status_lunas: 'Lunas' }, 1),
  D('2026-06-30', 'Perjanjian Keagenan', 'PKS-2026-0011', 'CV Mitra Sejahtera', { masa_berlaku: '30 Juni 2026 - 29 Juni 2028', wilayah: 'Jawa Barat', nilai_jaminan: 25000000 }, 4),
  D('2025-12-20', 'Faktur Pemasok', 'INV-2025-0988', 'CV Sinar Jaya', { nilai: 18350000, jatuh_tempo: '2026-01-10', status_lunas: 'Lunas' }, 2),
  D('2023-11-20', 'Surat Jalan Masuk', 'SJ-2023-0640', 'PT Ekspes Kilat', { pengirim_penerima: 'PT Unggul Material -> Toko Makmur', perihal: 'Pengiriman rutin November', lampiran: '-' }, 1),
  D('2021-12-05', 'Bukti Bayar', 'BYR-2021-0207', 'PT Sentosa Jaya', { nilai: 9100000, tanggal_bayar: '2021-12-08', status_lunas: 'Lunas' }, 1),
  D('2021-11-25', 'Bukti Bayar', 'BYR-2021-0155', 'CV Sinar Jaya', { nilai: 4300000, tanggal_bayar: '2021-11-28', status_lunas: 'Lunas' }, 1),
  D('2019-05-14', 'Pesanan Pembelian', 'PO-2019-0088', 'PT Unggul Material', { nilai: 7600000, jatuh_tempo: '2019-06-01', status_lunas: 'Lunas' }, 1),
  D('2018-01-09', 'Faktur Pemasok', 'INV-2018-0021', 'CV Sinar Jaya', { nilai: 12900000, jatuh_tempo: '2018-02-01', status_lunas: 'Lunas' }, 2),
  D('2015-07-22', 'Surat Jalan Masuk', 'SJ-2015-0099', 'PT Ekspes Kilat', { pengirim_penerima: 'CV Mitra Sejahtera -> Toko Makmur', perihal: 'Pengiriman barang proyek', lampiran: '-surat jalan lama' }, 1),
  D('2016-10-01', 'Perjanjian Keagenan', 'PKS-2016-0001', 'PT Prinsipal Abadi', { masa_berlaku: '01 Oktober 2016 - 30 September 2021', wilayah: 'Nasional', nilai_jaminan: 35000000 }, 5),
];

function seed() {
  const existing = db.prepare('SELECT COUNT(*) c FROM dokumen').get().c;
  if (existing > 0) {
    console.log(`Seed dilewati: sudah ada ${existing} dokumen di database.`);
    return;
  }
  const ins = db.prepare(`INSERT INTO dokumen
    (id_arsip, id_jenis, nomor_dokumen, tanggal_dokumen, id_pihak, berkas_pdf, jumlah_halaman,
     tanggal_retensi, status, id_pengguna, waktu_unggah, arsip_terkait, fields)
    VALUES (@id_arsip,@id_jenis,@nomor,@tanggal,@id_pihak,@berkas,@halaman,@retensi,@status,@uid,@waktu,@terkait,@fields)`);

  const run = db.transaction(() => {
    const usedFiles = new Set();
    docs.forEach((d, i) => {
      const j = JENIS[d.jenis];
      const prefix = (j.kode + d.jenis.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
      const num = d.nomor.replace(/\D/g, '').slice(-4);
      let file = `${prefix}_${num}.pdf`;
      for (let s = 2; usedFiles.has(file); s++) file = `${prefix}_${num}_${s}.pdf`;
      usedFiles.add(file);
      const title = `${j.nama_kategori} - ${d.nomor}`;
      const lines = [
        `Jenis   : ${j.nama_jenis}`,
        `Pihak   : ${d.pihak}`,
        `Tanggal : ${d.tanggal}`,
        ...Object.entries(d.fields).map(([k, v]) => `${k.padEnd(14)}: ${v}`),
      ];
      fs.writeFileSync(path.join(UPLOAD_DIR, file), buildPdf(d.pages, title, lines));
      const idArsip = `ARS-${String(i + 1).padStart(6, '0')}`;
      ins.run({
        id_arsip: idArsip,
        id_jenis: j.id_jenis,
        nomor: d.nomor,
        tanggal: d.tanggal,
        id_pihak: PIHAK[d.pihak],
        berkas: file,
        halaman: d.pages,
        retensi: addYears(d.tanggal, j.masa_retensi),
        status: 'Arsip',
        uid: 1,
        waktu: stamp(Math.round((docs.length - i) * 0.5), 10),
        terkait: d.nomor === 'BYR-2026-0091' ? 'PO-2026-0210' : '',
        fields: JSON.stringify(d.fields),
      });
    });
  });
  run();

  const logs = [
    [2, null, 'MASUK', 2, 'Login berhasil (user.toko)'],
    [2, 'ARS-000001', 'LIHAT', 2, 'Membuka detail INV-2026-0455'],
    [2, 'ARS-000001', 'UNDUH', 2, 'Mengunduh INV-2026-0455'],
    [null, null, 'DITOLAK', 1, 'Percobaan login dengan kata sandi salah (user.toko)'],
    [2, null, 'DITOLAK', 1, 'User mencoba membuka halaman Data Master'],
    [1, 'ARS-000005', 'UBAH', 1, 'Memperbarui metadata PKS-2026-0003'],
    [1, 'ARS-000003', 'TAMBAH', 3, 'Menambah arsip BYR-2026-0091'],
  ];
  logs.forEach(([u, a, x, daysAgo, ket]) => {
    insLog.run(u, a, x, stamp(daysAgo, 9), ket);
  });
  console.log(`Seed selesai: ${docs.length} dokumen + ${logs.length} log awal. Today=${todayStr()}`);
}

if (require.main === module) {
  seed();
  process.exit(0);
}
module.exports = { seed, addYears };
