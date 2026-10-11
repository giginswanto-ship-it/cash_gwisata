# SISTEM BUKU KAS HARIAN TUNAI & FORMULIR KAS KECIL (SOP-FIN-01)
## SNAPRINT GWISATA — DIGITAL PRINTING, OFFSET & ADVERTISING

Aplikasi web modern, terstruktur, rapi, dan dinamis untuk pencatatan transaksi kasir, pemantauan **Saldo Tunai Hari Ini (Laci)** dan **Total Pemasukan Hari Ini (Tunai, QRIS, Transfer - Tanpa Detail Berbelit)** secara real-time.

---

## 🌟 Fitur Utama

### 1. 💵 Saldo Tunai Hari Ini (Laci Kasir)
- Ditampilkan secara **prominen di hero card utama**:
  $$\text{Saldo Tunai Laci} = \text{Modal Awal Kas (A)} + \text{Pemasukan Tunai (B)} - \text{Kas Kecil (<250rb) (D)}$$
  $$\text{Saldo Tunai Hari Ini} = \text{Rp } 500.000 + \text{Rp } 600.000 - \text{Rp } 140.000 = \mathbf{Rp\ 960.000}$$
- Status Fisik Laci: **Rp 960.000 [ SEIMBANG / 0 SELISIH ]**.

### 2. 📊 Total Pemasukan Hari Ini (Cukup Tunai, QRIS, Transfer)
Sesuai instruksi operasional, pemasukan tidak memerlukan rincian detail barang/pekerjaan yang rumit, cukup rekap total 3 saluran:
- **Total Pemasukan Hari Ini (Grand Total Omset)**: **Rp 1.300.000**
  - 💵 **Tunai**: **Rp 600.000** *(Menambah uang fisik di laci kasir)*
  - 📱 **QRIS**: **Rp 250.000** *(Non-tunai / Masuk settlement bank)*
  - 🏦 **Transfer**: **Rp 450.000** *(Non-tunai / Rekening BCA)*
- **2 Cara Input Fleksibel**:
  1. *Input Pemasukan Cepat*: Pilih saluran (Tunai/QRIS/Transfer) dan masukkan nominal tanpa perlu mengisi detail yang berbelit.
  2. *Set Total Harian Langsung*: Masukkan total 3 angka (Tunai, QRIS, Transfer) langsung sinkron dalam 1 klik.

### 3. 🛡️ Kepatuhan Kas Kecil SOP-FIN-01 (< Rp 250.000)
- Pengeluaran tunai kasir dibatasi maksimal **< Rp 250.000 per nota**.
- Belanja $\ge$ Rp 250.000 otomatis dialihkan ke Sistem Purchase Order (PO) kantor pusat atau override PIN Supervisor (`2209`).

### 4. 🧮 Rekonsiliasi Kas Fisik Laci (Closing Shift)
- Hitung uang kertas (100k, 50k, 20k, 10k, 5k, 2k, 1k) & koin (1000, 500, 200, 100) untuk mencocokkan fisik laci dengan saldo akhir sistem.

### 5. 🖨️ Cetak Ganda (A4 SOP Form & Thermal POS)
- **A4 Formulir Kas Kecil Resmi (SOP-FIN-01)**: Format formal identik lembar verifikasi SOP kasir.
- **Struk Thermal POS (58mm/80mm)**: Format struk mini printer kasir.

### 6. 👥 Otoritas Kasir & Pembuat Laporan
- **Supervisor / Pemeriksa**: **Eki Dwi Saputra**
- **Daftar Pembuat Laporan (Dapat Dipilih Langsung di Header)**:
  1. Aninditha Aisya Puteri
  2. Yudhistira Alfajri Irwan
  3. Fahrel Ferdiansyah
  4. Satria Adi Rangga
  5. Arif Furqan
  6. Sakha Arlin Azhar
  7. Eki Dwi Saputra

### 7. 🗄️ Database SQL Terpusat (MariaDB / MySQL)
- **Engine Database**: MariaDB 10.4 (Host: `localhost`, Port: `3306`)
- **Nama Database**: `db_snaprint_kas`
- **Tabel Relasional**:
  - `transactions`: Menyimpan mutasi kas masuk & keluar, nota, shift, kasir.
  - `denominations`: Menyimpan rekonsiliasi lembar & koin fisik laci kasir.
  - `settings`: Menyimpan profil toko dan aturan operasional.
  - `categories`: Menyimpan master kategori kas kecil.
- **Server API & Jaringan**: Node.js (`server.js`) pada Port `3333`.
  - Komputer/HP di jaringan WiFi/LAN yang sama dapat mengakses `http://[IP_KOMPUTER]:3333` untuk pemantauan kas real-time.
- **Sistem Dual-Engine (Hybrid)**:
  - Saat server SQL aktif: Data tersimpan langsung ke database MariaDB.
  - Saat offline: Otomatis beralih ke `localStorage` browser tanpa mengganggu operasional kasir.

---

## 🚀 Cara Menjalankan Aplikasi

### Mode 1: Jalankan dengan Database SQL Terpusat (Rekomendasi)
1. Klik ganda file **`Jalankan_Server_SQL.bat`**.
2. Jendela server akan aktif dan browser otomatis membuka `http://localhost:3333` dengan status **🟢 MariaDB Terhubung**.

### Mode 2: Mode Mandiri / Cepat
1. Klik ganda file **`Buka_Aplikasi_Kas.bat`** atau buka **`index.html`**.
2. Aplikasi akan otomatis mendeteksi server SQL jika aktif, atau berjalan dalam mode penyimpanan lokal.
