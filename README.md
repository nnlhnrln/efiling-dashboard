# Arsip Kita — Dashboard Kearsipan Elektronik (Electronic Filing System)

Sistem arsip digital untuk toko/instansi kecil: menyimpan PDF hasil pindai beserta metadatanya,
pencarian & pemfilteran, laporan, perhitungan masa retensi otomatis, dan log aktivitas.
Hak akses ditegakkan **di sisi server** (bukan sekadar menyembunyikan tombol).

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3, react-router-dom, jsPDF (ekspor PDF laporan) |
| Backend | Node.js + Express 4, better-sqlite3 (SQLite), multer (unggah PDF) |
| Penyimpanan berkas | `server/uploads/` (PDF asli, hanya bisa diakses lewat API + token) |
| Basis data | `server/data/efiling.db` (6 tabel, dibuat & di-seed otomatis saat server pertama jalan) |

## Menjalankan dari Visual Studio Code

1. **File → Open Folder…** pilih folder proyek ini.
2. Terminal internal VS Code sudah otomatis menambahkan Node portabel ke PATH
   (pengaturan di `.vscode/settings.json`), jadi tidak perlu memasang Node global.
3. Pilih salah satu:
   - **Ctrl+Shift+B** → task `Arsip: dev (server + frontend)` — API :4000 + Vite :5173 dengan hot reload.
   - **F5** → konfigurasi `Arsip: backend + Chrome` — menjalankan Express sambil membuka Chrome ke
     http://localhost:4000, plus breakpoint di kode server (`server/src`).
   - Command Palette → *Tasks: Run Task* → `Arsip: build + produksi` atau `Arsip: reset data contoh (seed ulang)`.
4. Extension yang disarankan muncul di panel Extensions (Tailwind CSS, SQLite Viewer untuk membuka
   `server/data/efiling.db`).

## Menjalankan

Prasyarat: Node.js 18+. Mesin ini belum punya Node di PATH, jadi dipakai Node portabel
yang ikut diunduh ke `.tools/node-v22.14.0-win-x64`. Bila menjalankan dari PowerShell/CMD,
tambahkan dulu ke PATH:

```powershell
$env:Path = "$PWD\.tools\node-v22.14.0-win-x64;" + $env:Path
```

Jika sistem sudah punya Node 18+, cukup gunakan `node`/`npm` biasa (folder `.tools` boleh dihapus).

```bash
npm install                 # root (concurrently)
npm --prefix server install
npm --prefix client install

# 1) Mode pengembangan: API di :4000, frontend Vite di :5173 (proxy /api ke :4000)
npm run dev
# buka http://localhost:5173

# 2) Mode produksi satu port (frontend dibangun lalu disajikan Express)
npm run build
npm start
# buka http://localhost:4000
```

Seed data (20 arsip, PDF dummy, log awal) dibuat otomatis ketika tabel `dokumen` masih kosong.
Untuk mengisi ulang dari nol:

```bash
taskkill /F /IM node.exe      # hentikan server
rm -f server/data/efiling.db* server/uploads/*.pdf
npm start
```

## Akun uji

| Peran | Username | Password |
|---|---|---|
| Admin | `admin.toko` | `Admin123!` |
| User biasa | `user.toko` | `User123!` |

Kedua akun hanya untuk demo lokal. Sebelum repo ini dipakai publik atau di-deploy, ganti kata sandi,
pasang bcrypt + masa kedaluwarsa sesi, dan hapus baris tabel akun uji ini.

Yang tidak ikut ke repository (dibuat ulang otomatis saat server pertama jalan): `server/data/*.db`,
`server/uploads/*.pdf`, `client/dist/`, `node_modules/`, dan `.tools/` (Node portabel milik mesin pengembang).

## Hak akses

- **Admin** — masuk, tambah arsip, cari/lihat, unduh, ubah metadata, hapus arsip, Data Master, Log Aktivitas.
- **User** — masuk, cari/lihat arsip, unduh berkas. Menu Data Master & Log tidak dirender sama sekali,
  dan endpoint-nya menjawab `403` (percobaan tercatat di log sebagai `DITOLAK`).

## Fitur

- **Dashboard**: sapaan, pencarian di posisi utama, tiga angka ringkas, daftar arsip terbaru,
  peringatan retensi (muncul hanya bila ada label MENDEKATI/LEWAT), panel kanan donut Aktif/Mendekati/Lewat + filter cepat.
- **Direktori Arsip**: pohon klasifikasi dari tabel (bukan kode mati), breadcrumb `Direktori > Kategori > Jenis`.
- **Form Tambah Arsip**: 5 ruas wajib + ruas khas per kategori di bawah garis putus-putus,
  ruas sistem terkunci (ID arsip, pengunggah, waktu unggah, masa retensi, jatuh retensi, label),
  ruas struktur (kode klasifikasi, nama berkas otomatis, jumlah halaman, arsip terkait).
  Validasi pesan jelas: nomor kembar → tautan "Buka arsip tersebut", tanggal tidak boleh ke depan,
  nilai hanya angka, berkas wajib PDF maks 5 MB.
- **Detail Arsip**: pratinjau PDF (halaman 1 dari N), keterangan dokumen vs keterangan sistem,
  Unduh untuk semua peran, Ubah/Hapus/Riwayat khusus admin. Setiap buka & unduh tercatat di log.
- **Retensi otomatis**: jatuh retensi = tanggal dokumen + masa simpan jenis;
  AKTIF (hijau) / MENDEKATI (kuning, ≤ 90 hari) / LEWAT (merah).
- **Laporan**: tab Rekap Arsip, Retensi, dan rekap utang jatuh tempo bulan berjalan;
  filter periode/kategori/label; cetak, ekspor CSV, ekspor PDF.
- **Log Aktivitas** (admin): waktu, pengguna, aksi, arsip, keterangan; aksi
  MASUK/TAMBAH/LIHAT/UNDUH/UBAH/HAPUS/DITOLAK. Tabel log tidak punya endpoint ubah/hapus.

## Struktur data (6 tabel)

`kategori`, `jenis_dokumen` (masa retensi + ruas khas JSON), `dokumen`,
`pihak_terkait`, `pengguna`, `log_aktivitas` — lihat `server/src/db.js`.

## API utama

```
POST /api/login  POST /api/logout  GET /api/me
GET  /api/summary  GET /api/master  GET /api/dokumen?q&kategori&tahun&status&label&idJenis
GET  /api/dokumen/:id (+ /berkas, /riwayat[admin])
POST /api/dokumen[admin]  PUT /api/dokumen/:id[admin]  DELETE /api/dokumen/:id[admin]
GET  /api/log[admin]  GET /api/utang?bulan=YYYY-MM
POST/PUT/DELETE /api/master/{kategori,jenis,pihak}[admin]
```

## Catatan keamanan versi demo

Kata sandi disimpan sebagai hash SHA-256 dan token sesi acak disimpan di tabel `sesi` — cukup untuk
demo internal, sebelum produksi ganti dengan bcrypt + masa kedaluwarsa token, dan HTTPS di depan server.

## Palet & gaya

Glassmorphism (rgba 40–65% + blur 16–24px) di atas gradasi `#EDEEE9 → #D7BDB0` dengan lingkaran blur
berwarna palet; sudut 20–28px, tombol pil, teks `#4A3F3A`. Label retensi hijau/kuning/merah diredam.
Semua teks Indonesia, format tanggal DD-MM-YYYY. Sidebar menjadi drawer di layar < 1024px.
