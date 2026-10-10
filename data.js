/**
 * ==============================================================================
 * SNAPRINT GWISATA - BUKU KAS HARIAN TUNAI & FORMULIR KAS KECIL (SOP-FIN-01)
 * Master Data & Configurations (CLEAN - TANPA DATA DUMMY)
 * ==============================================================================
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'snaprint_transactions_production_v1',
  SETTINGS: 'snaprint_settings_production_v1',
  CATEGORIES: 'snaprint_categories_production_v1',
  DENOMINATIONS: 'snaprint_cash_denominations_production_v1',
  OPERATIONAL: 'snaprint_operational_shift_production_v1'
};

const DEFAULT_PEMBUAT_LAPORAN_LIST = [
  'Aninditha Aisya Puteri',
  'Yudhistira Alfajri Irwan',
  'Fahrel Ferdiansyah',
  'Satria Adi Rangga',
  'Arif Furqan',
  'Sakha Arlin Azhar',
  'Eki Dwi Saputra'
];

const DEFAULT_SHOP_PROFILE = {
  name: 'SNAPRINT GWISATA',
  tagline: 'DIGITAL PRINTING, OFFSET & ADVERTISING',
  subTitle: 'BUKU KAS HARIAN TUNAI • FORMULIR KAS KECIL',
  sopDocCode: 'SOP-FIN-01',
  sopDocVersion: 'Dokumen: SOP-FIN-01 • Halaman 1 dari 2',
  pettyCashLimit: 250000,
  address: 'Grand Wisata, Jl. Sunset Avenue Tambun Selatan, Bekasi',
  phone: '0813-1193-3172',
  supervisorName: 'Eki Dwi Saputra',
  cashierName: 'Aninditha Aisya Puteri',
  pembuatLaporanList: DEFAULT_PEMBUAT_LAPORAN_LIST,
  shiftName: 'Shift 1 / Pagi - Sore',
  defaultModalAwal: 0,
  supervisorPin: '2209'
};

const DEFAULT_EXPENSE_CATEGORIES = [
  {
    id: 'exp_finishing',
    name: 'Finishing Produksi',
    group: '1. Finishing & Tools Habis Pakai',
    description: 'Lakban, cutter, lem tembak, double tape, mika jilid, staples, kawat',
    icon: 'fa-scissors',
    color: 'amber'
  },
  {
    id: 'exp_emergency',
    name: 'Kebutuhan Darurat Cetak',
    group: '2. Kebutuhan Darurat Cetak',
    description: 'Kertas eceran darurat, plastik pembungkus, bubble wrap, tali rafia, cleaner',
    icon: 'fa-triangle-exclamation',
    color: 'orange'
  },
  {
    id: 'exp_maintenance',
    name: 'Perawatan Mesin',
    group: '3. Perawatan Mesin & Kebersihan Toko',
    description: 'Alkohol 70%, lap microfiber, cleaner printhead, minyak roller',
    icon: 'fa-wrench',
    color: 'blue'
  },
  {
    id: 'exp_hygiene',
    name: 'Kebersihan & Toko',
    group: '3. Perawatan Mesin & Kebersihan Toko',
    description: 'Sabun cuci tangan, karbol lantai, plastik sampah, baterai remote AC/mouse',
    icon: 'fa-broom',
    color: 'cyan'
  },
  {
    id: 'exp_facility',
    name: 'Peralatan & Tamu',
    group: '4. Operasional, Kurir & Fasilitas Tamu',
    description: 'Air mineral galon toko, tisu pembersih head/tamu, gula kopi',
    icon: 'fa-mug-hot',
    color: 'teal'
  },
  {
    id: 'exp_logistics',
    name: 'Logistik & Kurir',
    group: '4. Operasional, Kurir & Fasilitas Tamu',
    description: 'Bensin operasional kirim pesanan urgent, ongkir GoSend, uang parkir',
    icon: 'fa-motorcycle',
    color: 'purple'
  },
  {
    id: 'exp_overtime',
    name: 'Konsumsi Lembur',
    group: '4. Operasional, Kurir & Fasilitas Tamu',
    description: 'Uang lembur makan ringan saat mengejar deadline cetak malam',
    icon: 'fa-burger',
    color: 'indigo'
  },
  {
    id: 'exp_owner',
    name: 'Tarik Kas Owner',
    group: 'Penarikan Kasir',
    description: 'Penarikan uang tunai laci oleh pemilik / setoran kantor',
    icon: 'fa-hand-holding-dollar',
    color: 'rose'
  }
];

const DEFAULT_INCOME_CATEGORIES = [
  {
    id: 'inc_tunai',
    name: 'Tunai',
    isCash: true,
    description: 'Pemasukan uang tunai langsung laci kasir',
    icon: 'fa-money-bill-wave',
    color: 'emerald'
  },
  {
    id: 'inc_qris',
    name: 'QRIS',
    isCash: false,
    description: 'Pemasukan non-tunai scan QRIS toko',
    icon: 'fa-qrcode',
    color: 'violet'
  },
  {
    id: 'inc_transfer',
    name: 'Transfer',
    isCash: false,
    description: 'Pemasukan non-tunai transfer bank resmi',
    icon: 'fa-building-columns',
    color: 'blue'
  },
  {
    id: 'inc_modal',
    name: 'Modal Kerja Kas',
    isCash: true,
    description: 'Modal awal uang receh kasir di laci kas pada awal buka shift',
    icon: 'fa-vault',
    color: 'sky'
  }
];

/**
 * Data sample/dummy dikosongkan sepenuhnya agar siap digunakan riil
 */
const SEED_TRANSACTIONS_20261010 = [];

/**
 * Default hitungan fisik uang laci: Bersih (0)
 */
const DEFAULT_DENOMINATIONS_DATA = {
  k100k: 0,
  k50k: 0,
  k20k: 0,
  k10k: 0,
  k5k: 0,
  k2k: 0,
  k1k: 0,
  c1000: 0,
  c500: 0,
  c200: 0,
  c100: 0
};
