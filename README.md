# GaleriKita — Private Photo & Video Gallery

Aplikasi web galeri foto dan video pribadi untuk 2 pengguna dengan 1 password bersama tanpa akun individual, dibangun menggunakan **Next.js App Router (TypeScript)**, **MySQL (Connection Pool & Transactions)**, **Drizzle ORM**, **Sharp**, dan **Linux Local Filesystem (Batas Kuota 50 GB)** sesuai dokumen spesifikasi PRD v1.1 dan ERD v1.0.

---

## Fitur Utama Sesuai Scope PRD

- **Autentikasi Bersama (FR-001):** Menggunakan 1 password bersama terenkripsi dengan **Argon2id**. Sesi berbasis cookie aman (`HttpOnly`, `SameSite=lax`), proteksi rate limiting, serta invalidasi sesi otomatis saat password diubah.
- **Home Gallery (FR-002):** Menampilkan seluruh foto dan video aktif dalam timeline terkelompok per tanggal ("Hari Ini", "Kemarin", "Tanggal"), lazy-loading thumbnail, badge video, dan infinite scroll.
- **Upload Media & Resumable (FR-003, FR-004):** Drag-and-drop multi-file upload dengan indikator progress individual, validasi format (JPG, PNG, WebP, GIF, MP4, MOV, WebM), dan reservasi kuota storage atomik.
- **Manajemen Album (FR-005, FR-006, FR-007, FR-008):**
  - CRUD Album tanpa menduplikasi file fisik di disk.
  - **Move Media:** Transaksi atomik MySQL mengganti relasi album lama ke album tujuan.
  - **Add Media:** Menambahkan relasi album secara non-destruktif (`INSERT IGNORE`).
  - **Remove Media:** Mengeluarkan media dari album tanpa menghapus file asli dari galeri.
  - **Delete Album:** Menghapus album hanya menghapus pengelompokan; foto/video asli tetap aman di Home.
- **Photo & Video Viewer (FR-009):** Fullscreen viewer dengan navigasi keyboard/touch, zoom in/out, reset zoom, drawer info metadata (dimensi, ukuran file, tanggal, format, album), dan HTML5 video player dengan HTTP Range Requests (HTTP 206) untuk seeking video instan tanpa membebani RAM server.
- **Download Original (FR-010):** Unduh file asli dengan nama file original tersimpan melalui streaming asinkron.
- **Multi-select & Operasi Massal (FR-011):** Seleksi multi-media untuk Pindah Album, Tambah Album, Keluarkan dari Album, Favoritkan, Unduh, dan Hapus ke Trash.
- **Favorit (FR-012):** Menandai foto/video favorit yang sinkron untuk kedua pengguna.
- **Trash & Lifecycle (FR-013):** Soft-delete media ke Trash dengan retensi 30 hari, pemulihan (restore) media dan album, serta permanent delete (purge) melalui background worker yang membebaskan kapasitas storage.
- **Pencarian & Filter (FR-014):** Pencarian nama file media dan nama album, filter format (Semua, Foto, Video), dan sorting berdasarkan tanggal ambil, tanggal upload, atau nama file.
- **Pengelolaan Kuota 50 GB (FR-015):** Indikator visual progres kapasitas storage di desktop sidebar dan halaman Pengaturan, peringatan otomatis pada ambang batas 80% (warning), 90% (critical), dan penolakan upload pada 100% (full).
- **Background Worker & Sharp (FR-017):** Antrian pekerjaan MySQL persisten (`processing_jobs`) untuk pembuatan thumbnail dan preview WebP secara asinkron tanpa memblokir request pengguna.
- **Pengaturan Website (FR-018):** Penggantian kata sandi bersama (dengan invalidasi sesi perangkat lain), toggle tema Gelap/Terang, dan tombol logout.

---

## Skema Database (8 Tabel MySQL)

1. `app_settings` — Hash password Argon2id, versi sesi, batas kuota 50 GB, dan pelacakan bytes terpakai & direservasi.
2. `sessions` — Token sesi terhash SHA-256 dan waktu kedaluwarsa.
3. `media` — Metadata file asli foto dan video, flag favorit, soft-delete timestamp, dan dimensi.
4. `albums` — Nama, deskripsi, dan cover media album.
5. `album_media` — Relasi many-to-many antara album dan media (composite PK mencegah duplikasi).
6. `media_variants` — Derivative thumbnail dan preview teroptimasi.
7. `upload_sessions` — Pelacakan sesi upload dan reservasi kuota sementara.
8. `processing_jobs` — Antrian background worker untuk pemrosesan media Sharp dan penghapusan permanen.

File referensi skema:
- [`galerikita_schema.sql`](file:///b:/project/galeri/galerikita_schema.sql)
- [`galerikita_erd.mmd`](file:///b:/project/galeri/galerikita_erd.mmd)

---

## Konfigurasi Environment (`.env`)

```env
DATABASE_URL=mysql://root:root@localhost:3306/galerikita
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=galerikita
DB_CONNECTION_LIMIT=5
STORAGE_DIR=./storage
SESSION_SECRET=galerikita_super_secure_auth_session_key_2026
STORAGE_QUOTA_BYTES=50000000000
DEFAULT_PASSWORD=galerikita2026
```

> **Default Password:** `galerikita2026` (Dapat diubah di menu Pengaturan).

---

## Cara Menjalankan Aplikasi

### 1. Mode Development Lokal
```bash
# Pastikan MySQL aktif dan database galerikita terbuat
# Seed pengaturan awal (jika baru pertama kali):
npm run seed

# Jalankan server development:
npm run dev
```
Akses di browser: `http://localhost:3000`

### 2. Validasi Test Suite PRD & ERD
```bash
npm run test
```

### 3. Production Build
```bash
npm run build
npm start
```

### 4. Deployment Docker Compose
```bash
docker compose up -d --build
```
Aplikasi dan reverse proxy Caddy akan otomatis berjalan dengan volume penyimpanan persisten untuk file media dan database MySQL.
