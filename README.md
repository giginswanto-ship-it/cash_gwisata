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

---

## 🚀 Cara Membuka Aplikasi

1. Buka folder:
   ```text
   c:\Users\Swanto\OneDrive\Desktop\SALDOTUNAI_SNAPGWISATA
   ```
2. Klik ganda (**Double Click**) file **`Buka_Aplikasi_Kas.bat`** atau **`index.html`** di browser.
3. Aplikasi langsung menampilkan **Saldo Tunai Hari Ini (Rp 960.000)** dan **Total Pemasukan Hari Ini (Tunai, QRIS, Transfer)** secara akurat dan seimbang!
