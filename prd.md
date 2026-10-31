# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# GaleriKita
### Private Self-Hosted Photo & Video Gallery

**Versi:** 1.1  
**Tanggal:** 31 Oktober 2026  
**Status:** Final — Development Reference  
**Platform:** Responsive Web Application  
**Deployment:** Linux Home Server  
**Pengguna:** 2 orang dengan hak akses yang sama

---

# 1. Product Overview

## 1.1 Deskripsi Produk

GaleriKita merupakan aplikasi galeri foto dan video berbasis website yang digunakan secara pribadi oleh dua orang.

Aplikasi dirancang menyerupai pengalaman pengguna Google Photos atau aplikasi galeri smartphone, dengan kemampuan menyimpan, melihat, mengunggah, mengunduh, mengorganisasikan, dan mengelola foto serta video melalui browser.

GaleriKita menggunakan satu password bersama untuk mengakses seluruh fitur aplikasi. Tidak ada registrasi, akun pengguna, maupun pembagian role.

Semua foto dan video disimpan secara lokal pada home server Linux, sedangkan metadata dan pengelompokan media dikelola menggunakan MySQL.

Aplikasi memiliki batas penyimpanan sebesar 50 GB dari total kapasitas home server sekitar 500 GB.

## 1.2 Tujuan Produk

1. Menyediakan galeri foto dan video pribadi yang dapat diakses bersama.
2. Memudahkan upload foto dan video langsung melalui smartphone maupun desktop.
3. Mendukung pembuatan dan pengelolaan album seperti aplikasi galeri modern.
4. Memungkinkan foto/video dipindahkan atau dimasukkan ke beberapa album tanpa duplikasi file.
5. Mempertahankan kualitas asli foto dan video.
6. Mendukung upload video berukuran besar secara andal.
7. Memberikan kontrol penuh atas data melalui home server sendiri.
8. Menjaga penggunaan storage tidak melebihi batas 50 GB.

## 1.3 Target Pengguna

Aplikasi digunakan oleh dua orang dengan satu password bersama.

Kedua pengguna mempunyai hak akses yang sama untuk:

- Melihat seluruh foto dan video.
- Mengunggah dan mengunduh file.
- Membuat, mengedit, dan menghapus album.
- Memindahkan atau menambahkan file ke album.
- Menandai favorit.
- Menghapus dan memulihkan file.

Tidak diperlukan sistem identitas individual.

---

# 2. Product Scope

## 2.1 Fitur MVP

| ID | Fitur | Prioritas |
|---|---|---|
| FR-001 | Autentikasi password bersama | P0 |
| FR-002 | Home Gallery | P0 |
| FR-003 | Upload foto/video | P0 |
| FR-004 | Multi-file dan resumable upload | P0 |
| FR-005 | Membuat dan mengelola album | P0 |
| FR-006 | Memindahkan media antaralbum | P0 |
| FR-007 | Menambahkan media ke beberapa album | P0 |
| FR-008 | Mengeluarkan media dari album | P0 |
| FR-009 | Photo & Video Viewer | P0 |
| FR-010 | Download file original | P0 |
| FR-011 | Multi-select media | P0 |
| FR-012 | Favorit | P0 |
| FR-013 | Trash dan restore | P0 |
| FR-014 | Search, filter dan sorting | P0 |
| FR-015 | Storage management 50 GB | P0 |
| FR-016 | Responsive UI | P0 |
| FR-017 | Thumbnail dan media processing | P0 |
| FR-018 | Pengaturan website | P0 |

## 2.2 Fitur Pengembangan Berikutnya

- Download banyak file sekaligus sebagai ZIP.
- Slideshow otomatis.
- Deteksi media duplikat berdasarkan hash.
- Progressive Web App (PWA).
- Dukungan tambahan format HEIC/HEIF.
- Metadata kamera dan lokasi foto yang lebih lengkap.
- Pengaturan urutan manual media dalam album.

Fitur tersebut tidak termasuk persyaratan peluncuran MVP.

---

# 3. Authentication & Authorization

## FR-001 — Shared Password Authentication

### Deskripsi

Aplikasi menggunakan satu password bersama tanpa akun individual.

### User Flow

1. Pengguna membuka website.
2. Sistem menampilkan halaman login.
3. Pengguna memasukkan password.
4. Backend memvalidasi password.
5. Jika valid, sistem membuat sesi autentikasi.
6. Pengguna diarahkan ke Home.
7. Pengguna dapat menggunakan seluruh fitur selama sesi valid.

### Business Rules

- Password disimpan dalam bentuk hash menggunakan Argon2id.
- Password tidak boleh disimpan sebagai plaintext di database atau source code.
- Sesi menggunakan cookie aman.
- Pengguna tidak perlu login ulang setiap membuka halaman selama sesi valid.
- Tersedia fitur logout.
- Perubahan password membatalkan seluruh sesi yang sebelumnya aktif.
- Sistem melakukan rate limiting pada percobaan login.
- Seluruh endpoint privat memeriksa autentikasi.

### Acceptance Criteria

- Password benar memberikan akses ke Home.
- Password salah ditolak.
- Pengunjung tanpa sesi tidak dapat mengakses galeri.
- URL foto atau video tidak dapat diakses tanpa autentikasi.
- Kedua pengguna memperoleh izin yang sama.

---

# 4. Home Gallery

## FR-002 — Main Gallery

### Deskripsi

Home merupakan halaman utama dan menampilkan seluruh foto/video aktif, baik yang mempunyai album maupun yang tidak mempunyai album.

### Komponen UI

- App header.
- Search bar.
- Tombol upload.
- Filter Semua, Foto, dan Video.
- Timeline berdasarkan tanggal.
- Media grid.
- Media selection toolbar.
- Navigasi utama.

### Functional Requirements

1. Media ditampilkan dalam bentuk thumbnail.
2. Timeline default berdasarkan tanggal pengambilan jika tersedia.
3. Jika tanggal pengambilan tidak tersedia, gunakan tanggal upload.
4. Tersedia sorting berdasarkan tanggal upload.
5. Media dapat dibuka melalui fullscreen viewer.
6. Media yang sudah masuk album tetap muncul di Home.
7. Media dalam Trash tidak muncul.
8. Galeri menggunakan pagination/infinite scrolling.
9. Thumbnail dimuat secara lazy loading.
10. Video memiliki indikator video dan durasi jika tersedia.

### Acceptance Criteria

- Seluruh media aktif terlihat di Home.
- Media tanpa album tetap muncul.
- Memindahkan media ke album tidak menghilangkannya dari Home.
- Scroll galeri tetap responsif saat jumlah file meningkat.

---

# 5. Media Upload

## FR-003 — Upload Photo & Video

### Deskripsi

Pengguna dapat mengunggah satu atau banyak foto/video langsung dari Home atau Detail Album.

### Upload dari Home

Media yang diunggah dari Home secara default tidak memiliki album.

Pengguna dapat memasukkannya ke album nanti.

### Upload dari Album

Media yang diunggah dari halaman album otomatis masuk ke album tersebut dan tetap muncul di Home.

### Supported Formats

**Image:**
- JPEG/JPG
- PNG
- WebP
- GIF

**Video:**
- MP4
- MOV
- WebM

Untuk format yang tidak kompatibel dengan browser, file tetap dapat didownload apabila format tersebut diterima oleh sistem. Preview tidak wajib tersedia untuk seluruh codec.

## FR-004 — Multi-file & Resumable Upload

### Functional Requirements

- Pengguna dapat memilih beberapa file sekaligus.
- Mendukung drag-and-drop di desktop.
- Upload menggunakan asynchronous I/O.
- Mendukung resumable upload.
- Menampilkan progress per file.
- Menampilkan status waiting, uploading, completed, failed, dan cancelled.
- Mendukung retry dan resume bila sesi upload masih valid.
- Memeriksa ukuran, format, dan keamanan file.
- Menolak upload yang melampaui kuota.
- Upload tidak boleh menggandakan file jika proses finalisasi dijalankan ulang.
- File yang belum selesai tidak ditampilkan di Home.
- File asli tidak boleh mengalami kompresi ulang.

### Rancangan Processing Flow

1. Browser memilih file.
2. Aplikasi memvalidasi informasi dasar file.
3. Backend memverifikasi autentikasi dan kapasitas yang tersedia.
4. Kapasitas upload direservasi.
5. Uppy mengirim file secara resumable ke tusd.
6. tusd menyimpan file sementara pada storage privat.
7. Setelah upload selesai, sistem memvalidasi hasil dan memfinalisasi file.
8. Metadata media disimpan ke MySQL.
9. Background processing dijadwalkan.
10. Thumbnail dibuat.
11. File muncul di Home.

Jika proses thumbnail gagal, file original tetap tersimpan dan status processing dapat menunjukkan kegagalan yang bisa dicoba ulang.

### Acceptance Criteria

- Upload banyak file berjalan tanpa memblokir penggunaan halaman lain.
- Upload yang terputus bisa dilanjutkan apabila kondisi resume masih terpenuhi.
- Upload selesai menghasilkan satu file original yang valid.
- Upload yang gagal tidak muncul sebagai media aktif.
- Upload yang melebihi batas kapasitas ditolak.
- Progress upload ditampilkan secara jelas.

---

# 6. Album Management

## FR-005 — Create, Read, Update, Delete Album

### Create Album

Pengguna dapat membuat album dengan:

- Nama album (wajib).
- Deskripsi (opsional).
- Cover album (opsional).

Jika cover tidak dipilih, sistem menggunakan media pertama yang tersedia dalam album.

### Edit Album

Pengguna dapat:

- Mengubah nama.
- Mengubah deskripsi.
- Mengganti cover.
- Menambah media.
- Mengeluarkan media.

### Delete Album

Menghapus album hanya menghapus album beserta relasi pengelompokannya.

**File foto/video asli tidak ikut terhapus.**

File tetap muncul di Home dan tetap berada dalam album lain jika mempunyai relasi lain.

## FR-006 — Move Media to Another Album

### User Flow

1. Pengguna memilih satu atau beberapa media.
2. Menekan tombol Pindahkan ke Album.
3. Memilih album tujuan.
4. Sistem menampilkan konfirmasi.
5. Backend menghapus relasi album lama dan menambahkan relasi album tujuan dalam satu transaksi database.
6. UI memperbarui tampilan.

### Business Rules

- Satu media dapat mempunyai beberapa relasi album.
- Operasi Move mengganti seluruh relasi album sebelumnya.
- Pengguna diberi peringatan jika media berada dalam beberapa album.
- Perubahan dilakukan menggunakan MySQL transaction.
- File fisik tidak dipindahkan di filesystem.
- Jika terjadi kegagalan, transaction harus di-rollback.
- Home tetap menampilkan media.

## FR-007 — Add Media to Album

Berbeda dengan Move, tindakan Add hanya membuat relasi album tambahan.

Contoh:

Foto A berada dalam Album Liburan.

Pengguna menambahkan Foto A ke Album Kenangan.

Hasil:
- Foto A tetap ada di Album Liburan.
- Foto A juga muncul di Album Kenangan.
- Foto A tetap muncul di Home.
- File fisik tidak diduplikasi.

Sistem harus mencegah relasi album-media yang sama tersimpan dua kali.

## FR-008 — Remove Media from Album

Mengeluarkan media dari album hanya menghapus relasi pada album tersebut.

File asli tetap tersedia dan tidak masuk Trash.

---

# 7. Photo & Video Viewer

## FR-009 — Fullscreen Media Viewer

### Photo Viewer

- Fullscreen image.
- Zoom in dan zoom out.
- Navigasi next/previous.
- Swipe gesture pada smartphone.
- Informasi nama dan ukuran file.
- Favorit.
- Aksi album.
- Download original.
- Delete.

### Video Viewer

- HTML5 video player.
- Play dan pause.
- Timeline/seek.
- Kontrol volume.
- Fullscreen.
- Poster thumbnail.
- Download original.
- Navigasi ke media lain.

Video menggunakan streaming dengan dukungan HTTP Range Requests untuk memudahkan seek.

### Acceptance Criteria

- Foto dapat ditampilkan sesuai orientasi.
- Video dengan format dan codec yang kompatibel browser dapat diputar.
- Pengguna dapat berpindah media dengan mudah.
- Viewer tidak secara otomatis mendownload original berukuran besar.

---

# 8. Download Management

## FR-010 — Original File Download

### Requirements

- Download foto/video dalam kualitas asli.
- Filename asli dipertahankan untuk nama file download jika aman.
- File original diambil dari local filesystem.
- Backend memvalidasi sesi sebelum memberikan akses.
- Proses download menggunakan asynchronous streaming.
- Video besar tidak dibaca seluruhnya ke RAM sebelum dikirim.

### Acceptance Criteria

- File hasil download identik dengan file original yang disimpan.
- Download file besar tidak menyebabkan server kehabisan RAM.
- Request download tanpa sesi valid ditolak.

---

# 9. Multi-select

## FR-011 — Multiple Media Selection

Pengguna dapat memilih beberapa foto/video sekaligus.

### Actions

- Pindahkan ke album.
- Tambahkan ke album.
- Keluarkan dari album.
- Download.
- Tambahkan ke favorit.
- Hapus ke Trash.
- Batalkan seleksi.

Pada smartphone, seleksi dapat dimulai melalui long press.

Pada desktop, gunakan checkbox serta interaksi selection yang sesuai.

Operasi massal harus memiliki feedback keberhasilan maupun kegagalan.

---

# 10. Favorites

## FR-012 — Favorite Media

### Requirements

- Pengguna dapat menandai foto/video favorit.
- Favorit bersifat global untuk kedua pengguna.
- Media favorit ditampilkan di halaman Favorit.
- Favorit tidak membuat duplikat file.
- Menghapus favorit tidak menghapus media.
- Media di Trash tidak ditampilkan dalam Favorit.

---

# 11. Trash & Recovery

## FR-013 — Soft Delete and Restore

### Requirements

- Penghapusan biasa menggunakan soft delete.
- Media yang dihapus masuk Trash.
- File fisik tetap disimpan.
- Media dapat dipulihkan.
- Media yang dipulihkan kembali ke album yang masih tersedia.
- Penghapusan permanen memerlukan konfirmasi.
- File Trash tetap dihitung dalam kuota storage.

### Retention Policy

Retensi awal ditetapkan 30 hari dan dapat dikonfigurasi.

Setelah waktu retensi berakhir, cleanup job dapat menghapus file secara permanen.

### Permanent Delete

Penghapusan permanen menggunakan proses yang aman terhadap kegagalan.

Sistem harus:
1. Menandai media untuk penghapusan permanen.
2. Menjalankan cleanup file melalui background worker.
3. Memastikan file asli dan file turunan dibersihkan.
4. Menyelesaikan pembaruan metadata secara konsisten.

Operasi yang gagal dapat dicoba ulang tanpa merusak data.

---

# 12. Search, Filter & Sorting

## FR-014 — Search and Filter

### Search

- Pencarian media berdasarkan filename.
- Pencarian album berdasarkan nama.
- Pencarian tidak menampilkan media dalam Trash.

### Filter

- Semua.
- Foto.
- Video.

### Sorting

- Tanggal pengambilan terbaru.
- Tanggal pengambilan terlama.
- Tanggal upload terbaru.
- Tanggal upload terlama.
- Nama file.

---

# 13. Storage Management

## FR-015 — 50 GB Storage Limit

### Requirements

GaleriKita menggunakan maksimal 50 GB penyimpanan yang dialokasikan pada home server.

Komponen kuota mencakup:

- Original image.
- Original video.
- Thumbnail.
- Preview hasil pemrosesan.
- File upload sementara.
- File Trash.
- Data dan file pendukung aplikasi yang disimpan dalam volume kuota.

### Storage Indicator

Menampilkan:

- Total kapasitas aplikasi.
- Kapasitas digunakan.
- Kapasitas tersisa.
- Persentase penggunaan.

### Warning Threshold

- 80%: Storage warning.
- 90%: Critical warning.
- 100%: Upload ditolak.

### Quota Enforcement

- Validasi dilakukan di backend.
- Upload paralel menggunakan reservasi kapasitas.
- Kuota tidak boleh hanya diperiksa pada frontend.
- Sistem memperhitungkan penggunaan file sementara.
- Reservasi upload yang gagal/kedaluwarsa dibersihkan.
- Storage yang masih dipakai Trash tidak dianggap sebagai ruang kosong.
- Jika disk host memiliki ruang kosong lebih kecil daripada kuota yang tersisa, upload harus ditolak.

Kuota filesystem/volume dapat digunakan sebagai lapisan pembatas tambahan.

---

# 14. UI/UX Requirements

## FR-016 — Responsive User Interface

### Design Principles

- Modern.
- Minimalist.
- Mobile-first.
- Mengutamakan thumbnail.
- Navigasi sederhana.
- Konsisten antara desktop dan smartphone.

### Mobile Navigation

- Foto.
- Album.
- Favorit.
- Pengaturan.

Tombol Upload mudah dijangkau dari Home dan Detail Album.

### Desktop Navigation

- Sidebar navigation.
- Media grid responsif.
- Drag-and-drop upload.
- Multi-select.
- Keyboard interaction.

### UI States

Setiap halaman yang relevan harus menangani:

- Loading.
- Empty state.
- Error.
- Success feedback.
- Confirmation dialog.
- Upload progress.
- Processing media.

---

# 15. Media Processing

## FR-017 — Thumbnail and Preview Generation

### Image Processing

Gunakan Sharp untuk:
- Membuat thumbnail.
- Menyesuaikan orientasi.
- Mengoptimalkan gambar preview.

File original tidak diubah.

### Video Processing

Gunakan FFmpeg untuk:
- Mengekstrak poster/thumbnail video.
- Membaca informasi dasar video.
- Membuat preview jika diperlukan.

### Processing Rules

- Processing dilakukan melalui background job.
- Processing tidak boleh memblokir response utama Next.js.
- Processing berat tidak dijalankan langsung pada event loop.
- Jumlah worker berjalan bersamaan harus dibatasi.
- Jika proses gagal, job dapat di-retry.
- Upload original tetap dipertahankan walaupun thumbnail gagal.
- Job harus persisten sehingga dapat dilanjutkan setelah restart aplikasi.

---

# 16. Settings

## FR-018 — Website Settings

### Pengaturan yang tersedia

- Mengganti password website.
- Logout.
- Melihat kapasitas penyimpanan.
- Light/dark mode.
- Mengakses Trash.
- Mengatur retensi Trash jika fitur konfigurasi diaktifkan.

Pengaturan teknis seperti batas concurrency dan konfigurasi server dikelola melalui konfigurasi deployment, bukan harus ditampilkan di UI.

---

# 17. Technical Architecture

## 17.1 Technology Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js App Router |
| Backend | Next.js Route Handlers / Server-side Logic |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | Lucide |
| Database | MySQL |
| ORM | Drizzle ORM |
| Driver | mysql2/promise |
| Database Connection | MySQL Connection Pool |
| Storage | Linux Local Filesystem |
| Filesystem API | Node.js fs/promises dan streaming |
| Upload UI | Uppy |
| Upload Server | tusd |
| Image Processing | Sharp |
| Video Processing | FFmpeg |
| Background Processing | Worker dengan persistent MySQL job queue |
| Reverse Proxy | Caddy atau existing Nginx |
| Deployment | Docker Compose |

## 17.2 Architectural Approach

GaleriKita menggunakan:

**Asynchronous I/O + Database Connection Pool + Database Transaction + Background Worker**

### A. Asynchronous I/O

Digunakan untuk:
- Database query.
- Upload.
- Download.
- Membaca metadata.
- Operasi filesystem.
- Mengelola album.
- Memperbarui status media.

Gunakan async/await pada operasi yang membutuhkan I/O, sehingga Node.js dapat menangani request lain selama menunggu.

### B. Synchronous Operations

Digunakan hanya untuk operasi sederhana dan cepat, misalnya:

- Perhitungan ringan.
- Transformasi data sederhana.
- Validasi format data dasar yang tidak memerlukan I/O.

Operasi CPU atau filesystem berat tidak boleh dijalankan secara synchronous pada request handler.

### C. MySQL Connection Pool

Semua operasi database menggunakan connection pool.

Konfigurasi awal:

- connectionLimit: 5 per instance aplikasi.
- waitForConnections: true.
- Pool digunakan kembali untuk berbagai query.
- Koneksi harus dibebaskan setelah selesai.

Nilai pool dapat disesuaikan dengan spesifikasi server dan jumlah koneksi MySQL yang tersedia.

### D. Database Transactions

Transaksi digunakan untuk operasi yang harus konsisten, seperti:

- Memindahkan foto antaralbum.
- Mengubah beberapa relasi album sekaligus.
- Memfinalisasi metadata dan status upload.
- Memperbarui reservasi kuota.
- Operasi penghapusan yang melibatkan beberapa tabel.

Seluruh query dalam satu transaksi harus menggunakan koneksi database yang sama.

### E. Background Worker

Digunakan untuk:

- Membuat thumbnail foto.
- Membuat thumbnail video.
- Membaca metadata media.
- Membersihkan upload gagal.
- Membersihkan file Trash yang kedaluwarsa.
- Menghapus file fisik secara permanen.

Worker berjalan terpisah dari request utama.

Antrian pekerjaan disimpan secara persisten di MySQL. Tidak diperlukan Redis atau RabbitMQ untuk MVP.

### F. Concurrency Control

Konfigurasi awal yang direkomendasikan:

| Komponen | Batas Awal |
|---|---|
| MySQL connection pool | 5 |
| Upload file bersamaan | 2 |
| Image processing | 2 job |
| Video processing | 1 job |

Batas dapat disesuaikan berdasarkan CPU, RAM, disk, dan bandwidth home server.

---

# 18. High-Level System Architecture

Alur akses website:

**Browser → Reverse Proxy → Next.js → MySQL / Local Filesystem**

Alur upload besar:

**Browser → Uppy → Reverse Proxy → tusd → Temporary Storage → Finalization → MySQL → Processing Queue**

Alur background processing:

**MySQL Job Queue → Worker → Sharp / FFmpeg → Thumbnail Storage → Update Processing Status**

Alur download:

**Browser → Next.js Authentication → Private Media Streaming → Browser**

### Architecture Requirements

- Next.js dan upload service tidak boleh mengekspos file privat tanpa autentikasi.
- tusd harus menggunakan mekanisme validasi akses sebelum upload diterima.
- Database MySQL tidak boleh diakses langsung dari internet.
- File original dan file sementara tidak boleh diletakkan dalam direktori publik Next.js.
- Video download/streaming tidak boleh dibuffer seluruhnya ke RAM.
- Background worker harus mampu menangani retry dan restart.

---

# 19. Data Requirements

ERD detail akan dibuat secara terpisah.

Entitas data utama:

## 19.1 media

Menyimpan:
- ID media.
- Filename original.
- Lokasi penyimpanan.
- Jenis media.
- MIME type.
- Ukuran file.
- Tanggal pengambilan.
- Tanggal upload.
- Status favorit.
- Status processing.
- Status penghapusan.

## 19.2 albums

Menyimpan:
- ID album.
- Nama album.
- Deskripsi.
- Referensi cover media.
- Tanggal dibuat.
- Tanggal diperbarui.

## 19.3 album_media

Menyimpan relasi many-to-many:

- album_id.
- media_id.
- added_at.

Relasi album-media yang sama tidak boleh memiliki duplikasi.

## 19.4 sessions

Digunakan untuk mengelola sesi autentikasi apabila menggunakan sesi server-side.

Tidak diperlukan tabel users.

## 19.5 upload_sessions

Menyimpan:
- Identitas upload.
- Ukuran file yang diharapkan.
- Status upload.
- Reservasi kuota.
- Waktu dibuat.
- Waktu kedaluwarsa.

## 19.6 processing_jobs

Menyimpan:
- Job ID.
- Media ID.
- Jenis pekerjaan.
- Status pekerjaan.
- Jumlah percobaan.
- Informasi kesalahan.
- Waktu eksekusi.

---

# 20. Non-Functional Requirements

## 20.1 Security

- HTTPS wajib untuk akses publik.
- Password menggunakan Argon2id.
- Cookie sesi menggunakan HttpOnly, Secure, dan SameSite.
- Login memiliki rate limiting.
- Endpoint privat menggunakan validasi sesi.
- Operasi perubahan data dilindungi dari CSRF.
- Storage privat tidak bisa diakses langsung melalui URL filesystem.
- Validasi upload dilakukan di server.
- File disimpan menggunakan nama internal yang aman.
- Database tidak terekspos ke internet.
- Password dan secret tidak disimpan dalam repository.
- Link media yang disalin tetap memerlukan autentikasi.

## 20.2 Performance

- Thumbnail menggunakan ukuran teroptimasi.
- Lazy loading dan pagination.
- Streaming untuk download.
- HTTP Range untuk video.
- Async database operations.
- Connection pooling.
- Background processing untuk pekerjaan berat.
- Concurrency worker dibatasi sesuai resource server.

## 20.3 Reliability

- Upload yang selesai divalidasi sebelum dipublikasikan.
- Upload yang gagal dapat dibersihkan.
- Job processing persisten.
- Transaksi database menggunakan rollback jika gagal.
- Penghapusan permanen dapat di-retry dengan aman.
- Restart server tidak menghapus data permanen.
- Backup MySQL dan file media disimpan secara terpisah, idealnya pada perangkat lain.

## 20.4 Compatibility

- Chrome.
- Safari.
- Firefox.
- Edge.
- Smartphone Android dan iOS.
- Desktop Windows, Linux, dan macOS.

---

# 21. Business Rules

| ID | Aturan |
|---|---|
| BR-001 | Satu password digunakan bersama |
| BR-002 | Tidak ada akun atau role |
| BR-003 | Semua pengguna terautentikasi mempunyai hak sama |
| BR-004 | Home menampilkan seluruh media aktif |
| BR-005 | Media boleh tidak mempunyai album |
| BR-006 | Media dapat masuk ke beberapa album |
| BR-007 | Media original tidak diduplikasi untuk relasi album |
| BR-008 | Move mengganti seluruh relasi album sebelumnya |
| BR-009 | Add mempertahankan relasi album sebelumnya |
| BR-010 | Remove from Album tidak menghapus file |
| BR-011 | Delete Album tidak menghapus file original |
| BR-012 | Delete Media melakukan soft delete |
| BR-013 | Permanent Delete menghapus file original dan turunannya |
| BR-014 | Trash tetap menggunakan storage |
| BR-015 | Storage dibatasi 50 GB |
| BR-016 | Upload belum selesai tidak tampil di galeri |
| BR-017 | Seluruh file privat memerlukan autentikasi |
| BR-018 | Pengolahan thumbnail/video menggunakan background job |
| BR-019 | Operasi relasi album yang kompleks menggunakan transaction |
| BR-020 | File original tidak dikompresi ulang |

---

# 22. User Acceptance Testing (UAT)

| ID | Skenario | Expected Result |
|---|---|---|
| UAT-01 | Login password benar | Masuk ke Home |
| UAT-02 | Login password salah | Akses ditolak |
| UAT-03 | Upload 10 foto ke Home | Muncul tanpa album |
| UAT-04 | Upload video ke album | Muncul di album dan Home |
| UAT-05 | Pindahkan foto ke album lain | Relasi sebelumnya diganti |
| UAT-06 | Tambahkan foto ke dua album | Muncul di dua album, satu file fisik |
| UAT-07 | Keluarkan foto dari album | Tetap muncul di Home |
| UAT-08 | Hapus album | File original tetap tersedia |
| UAT-09 | Tambahkan favorit | Muncul di Favorit |
| UAT-10 | Hapus media | Masuk Trash |
| UAT-11 | Restore media | Kembali ke galeri |
| UAT-12 | Download video | File original berhasil didownload |
| UAT-13 | Upload melebihi 50 GB | Ditolak |
| UAT-14 | Upload video terputus | Dapat resume apabila masih valid |
| UAT-15 | Akses file tanpa login | Ditolak |
| UAT-16 | Dua pengguna upload bersamaan | Kuota dan metadata konsisten |
| UAT-17 | Thumbnail gagal dibuat | Original tetap aman, job dapat di-retry |
| UAT-18 | Restart aplikasi | Media dan album tetap tersedia |
| UAT-19 | Pindah album gagal di tengah transaksi | Tidak terjadi perubahan sebagian |
| UAT-20 | Penghapusan permanen gagal | Cleanup dapat diulang dengan aman |

---

# 23. Development Phases

## Phase 1 — Project Foundation

- Inisialisasi Next.js dan TypeScript.
- Tailwind dan shadcn/ui.
- Setup Drizzle ORM.
- Koneksi MySQL menggunakan connection pool.
- Login password bersama.
- Session authentication.
- Layout dan navigasi utama.

## Phase 2 — Media Foundation

- Integrasi local filesystem.
- Uppy dan tusd.
- Upload progress/resume.
- Metadata media.
- Private file access.
- Streaming dan download original.

## Phase 3 — Gallery Experience

- Home Gallery.
- Thumbnail.
- Photo Viewer.
- Video Player.
- Timeline.
- Search/filter/sorting.
- Responsive design.

## Phase 4 — Album Management

- CRUD album.
- Multi-select.
- Move media.
- Add to Album.
- Remove from Album.
- MySQL transaction untuk operasi relasi.

## Phase 5 — Media Lifecycle

- Background worker.
- Sharp.
- FFmpeg.
- Processing queue.
- Favorit.
- Trash.
- Restore.
- Permanent cleanup.
- Storage quota 50 GB.

## Phase 6 — Deployment & Hardening

- Docker Compose.
- Reverse proxy.
- HTTPS.
- Security hardening.
- Backup dan recovery.
- Validasi upload besar.
- UAT.
- Optimasi penggunaan resource.

---

# 24. Out of Scope

Untuk MVP tidak perlu:

- Registrasi pengguna.
- Multi-user account.
- Role-based access control.
- Redis.
- RabbitMQ.
- Kubernetes.
- Microservices.
- Cloud storage pihak ketiga.
- AI face recognition.
- Face grouping.
- Native mobile application.
- Editing foto/video.
- Auto-sync seluruh galeri HP.
- Sistem komentar atau chat.
- Monetisasi dan pembayaran.

---

# 25. Definition of Done

GaleriKita dinyatakan siap digunakan apabila:

1. Website dapat diakses dengan aman melalui internet.
2. Kedua pengguna dapat login menggunakan password bersama.
3. Foto dan video dapat diunggah dari Home dan album.
4. File asli disimpan secara lokal.
5. Foto/video dapat ditampilkan dalam galeri.
6. Pengguna dapat membuat dan mengelola album.
7. File dapat dipindahkan dan ditambahkan ke beberapa album tanpa duplikasi.
8. Viewer dan download original berjalan.
9. Favorit dan Trash berfungsi.
10. Upload besar mempunyai mekanisme resume.
11. Background processing berjalan tanpa memblokir aplikasi.
12. Operasi album menjaga konsistensi data melalui transaksi.
13. Kuota penyimpanan 50 GB ditegakkan.
14. Seluruh API dan akses file privat dilindungi autentikasi.
15. Data tetap tersedia setelah restart server.
16. Backup dan proses pemulihan sudah diverifikasi.

---

# 26. Final Technical Decisions

**Application:** Next.js App Router + TypeScript  
**Database:** Existing MySQL Home Server  
**ORM:** Drizzle ORM  
**MySQL Driver:** mysql2/promise  
**Connection Pool:** 5 connections sebagai konfigurasi awal  
**Storage:** Local filesystem dengan kuota 50 GB  
**Upload:** Uppy + tusd  
**Media Processing:** Sharp + FFmpeg  
**Background Jobs:** Persistent MySQL queue + worker terpisah  
**Deployment:** Docker Compose  
**Reverse Proxy:** Caddy atau Nginx existing  
**Authentication:** Shared password + secure session  
**Architecture:** Async I/O + Connection Pool + DB Transaction + Background Worker

---

# 27. Penutup

GaleriKita dikembangkan sebagai aplikasi galeri pribadi yang sederhana dari sisi pengguna, tetapi memiliki fondasi teknis yang aman dan dapat diandalkan.

Prioritas utama aplikasi adalah pengalaman melihat serta mengelola foto/video seperti galeri smartphone, upload dan download file original, pengelolaan album yang fleksibel, serta pengelolaan penyimpanan lokal yang efisien.

Penerapan asynchronous I/O, MySQL connection pooling, database transaction, dan background worker bertujuan menjaga aplikasi tetap responsif serta data tetap konsisten, tanpa menggunakan infrastruktur berlebihan untuk kebutuhan dua pengguna.

**Dokumen ini menjadi acuan kebutuhan produk untuk tahap ERD, API contract, technical design, implementasi, dan user acceptance testing.**