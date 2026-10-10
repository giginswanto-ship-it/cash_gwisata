/**
 * ==============================================================================
 * SNAPRINT GWISATA - BUKU KAS HARIAN TUNAI & FORMULIR KAS KECIL (SOP-FIN-01)
 * Application Controller & Financial Engine
 * Bersih Tanpa Data Dummy (Clean Production State)
 * Pemasukan Ringkas: Tunai, QRIS, Transfer (Tidak Perlu Detail)
 * ==============================================================================
 */

// Global Application State
const AppState = {
  selectedDate: '2026-10-10',
  periodMode: 'day', // 'day' or 'range'
  rangeStartDate: '2026-10-10',
  rangeEndDate: '2026-10-10',
  shift: 'Shift 1 / Pagi - Sore',
  cashier: 'Aninditha Aisya Puteri',
  supervisor: 'Eki Dwi Saputra',
  pembuatLaporanList: [ ...DEFAULT_PEMBUAT_LAPORAN_LIST ],
  modalAwal: 0,
  
  shopProfile: { ...DEFAULT_SHOP_PROFILE },
  expenseCategories: [ ...DEFAULT_EXPENSE_CATEGORIES ],
  incomeCategories: [ ...DEFAULT_INCOME_CATEGORIES ],
  transactions: [],
  denominations: { ...DEFAULT_DENOMINATIONS_DATA },
  
  filter: {
    keyword: '',
    category: 'all',
    type: 'all', // 'all', 'income', 'expense'
    channel: 'all', // 'all', 'Tunai', 'QRIS', 'Transfer'
    cashOnly: false,
    verified: 'all' // 'all', 'yes', 'no'
  },

  editingTransactionId: null
};

// ==============================================================================
// INITIALIZATION & STORAGE ENGINE
// ==============================================================================

function initApp() {
  loadDataFromStorage();
  
  // Set default date input values
  const dateInput = document.getElementById('filterDateInput');
  if (dateInput) {
    dateInput.value = AppState.selectedDate;
  }
  const rangeStart = document.getElementById('rangeStartDateInput');
  const rangeEnd = document.getElementById('rangeEndDateInput');
  if (rangeStart && rangeEnd) {
    rangeStart.value = AppState.rangeStartDate;
    rangeEnd.value = AppState.rangeEndDate;
  }

  // Prepopulate dropdowns
  populateCategoryDropdowns();
  populatePembuatLaporanDropdowns();
  
  // Render full dashboard
  renderAll();

  // Attach keyboard listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  console.log('✅ SNAPRINT GWISATA - Sistem Kasir Bersih Siap Digunakan!');
}

function loadDataFromStorage() {
  try {
    // Purge old dummy storage keys to ensure clean start
    ['snaprint_transactions_v2026', 'snaprint_transactions_live_clean', 'snaprint_cash_denominations_v2026'].forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    const storedTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (storedTx) {
      AppState.transactions = JSON.parse(storedTx);
    } else {
      AppState.transactions = [];
      saveTransactionsToStorage();
    }

    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      AppState.shopProfile = { ...AppState.shopProfile, ...parsedSettings };
      if (parsedSettings.defaultModalAwal !== undefined) {
        AppState.modalAwal = Number(parsedSettings.defaultModalAwal);
      }
      if (parsedSettings.supervisorName) {
        AppState.supervisor = parsedSettings.supervisorName;
      }
      if (parsedSettings.cashierName) {
        if (parsedSettings.cashierName === 'Ahmad Faisal') {
          AppState.cashier = 'Aninditha Aisya Puteri';
        } else {
          AppState.cashier = parsedSettings.cashierName;
        }
      }
    }

    const storedDenom = localStorage.getItem(STORAGE_KEYS.DENOMINATIONS);
    if (storedDenom) {
      AppState.denominations = JSON.parse(storedDenom);
    } else {
      AppState.denominations = { ...DEFAULT_DENOMINATIONS_DATA };
    }

    const storedCat = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (storedCat) {
      const parsedCat = JSON.parse(storedCat);
      if (parsedCat.expense) AppState.expenseCategories = parsedCat.expense;
      if (parsedCat.income) AppState.incomeCategories = parsedCat.income;
    }
  } catch (err) {
    console.error('Error loading data from localStorage:', err);
    AppState.transactions = [];
  }
}

function saveTransactionsToStorage() {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(AppState.transactions));
}

function saveSettingsToStorage() {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(AppState.shopProfile));
}

function saveDenominationsToStorage() {
  localStorage.setItem(STORAGE_KEYS.DENOMINATIONS, JSON.stringify(AppState.denominations));
}

function saveCategoriesToStorage() {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify({
    expense: AppState.expenseCategories,
    income: AppState.incomeCategories
  }));
}

// ==============================================================================
// LEDGER CALCULATION ENGINE (HERO: SALDO TUNAI HARI INI & TOTAL PEMASUKAN HARI INI)
// ==============================================================================

/**
 * Filter transactions based on active period and filter options
 */
function getFilteredTransactions() {
  return AppState.transactions.filter(tx => {
    // Date filter
    if (AppState.periodMode === 'day') {
      if (tx.date !== AppState.selectedDate) return false;
    } else {
      if (tx.date < AppState.rangeStartDate || tx.date > AppState.rangeEndDate) return false;
    }

    // Cash filter
    if (AppState.filter.cashOnly && !tx.isCash) return false;

    // Type filter
    if (AppState.filter.type !== 'all' && tx.type !== AppState.filter.type) return false;

    // Channel filter (Tunai, QRIS, Transfer)
    if (AppState.filter.channel !== 'all') {
      const ch = getTransactionChannel(tx);
      if (ch !== AppState.filter.channel) return false;
    }

    // Category filter
    if (AppState.filter.category !== 'all' && tx.category !== AppState.filter.category) return false;

    // Verification filter
    if (AppState.filter.verified === 'yes' && !tx.verified) return false;
    if (AppState.filter.verified === 'no' && tx.verified) return false;

    // Keyword search
    if (AppState.filter.keyword) {
      const kw = AppState.filter.keyword.toLowerCase();
      const matchDesc = (tx.description || '').toLowerCase().includes(kw);
      const matchReceipt = (tx.receiptNo || '').toLowerCase().includes(kw);
      const matchCat = (tx.category || '').toLowerCase().includes(kw);
      if (!matchDesc && !matchReceipt && !matchCat) return false;
    }

    return true;
  });
}

function getTransactionChannel(tx) {
  if (tx.channel) return tx.channel;
  if (tx.category === 'QRIS' || (tx.category || '').toLowerCase().includes('qris')) return 'QRIS';
  if (tx.category === 'Transfer' || (tx.category || '').toLowerCase().includes('transfer')) return 'Transfer';
  return 'Tunai';
}

/**
 * Calculate Summary Metrics:
 * 1. TOTAL PEMASUKAN HARI INI: Tunai, QRIS, Transfer
 * 2. SALDO TUNAI HARI INI (Laci Kasir): Modal Awal + Tunai - Kas Kecil
 */
function calculateCashSummary() {
  const activeTxList = AppState.transactions.filter(tx => {
    if (AppState.periodMode === 'day') {
      return tx.date === AppState.selectedDate;
    } else {
      return tx.date >= AppState.rangeStartDate && tx.date <= AppState.rangeEndDate;
    }
  });

  // A. Saldo Modal Kas Awal
  const modalTx = activeTxList.find(tx => tx.isModal && tx.isCash);
  const saldoModalAwal = modalTx ? Number(modalTx.amountIn) : Number(AppState.modalAwal || 0);

  // Pemasukan: Tunai, QRIS, Transfer (Tanpa Detail Berbelit)
  let totalPemasukanTunai = 0;
  let totalPemasukanQris = 0;
  let totalPemasukanTransfer = 0;

  activeTxList.forEach(tx => {
    if (tx.type === 'income' && !tx.isModal) {
      const ch = getTransactionChannel(tx);
      const val = Number(tx.amountIn || 0);
      if (ch === 'QRIS') {
        totalPemasukanQris += val;
      } else if (ch === 'Transfer') {
        totalPemasukanTransfer += val;
      } else {
        totalPemasukanTunai += val;
      }
    }
  });

  // Total Pemasukan Hari Ini (Grand Total Omset)
  const totalPemasukanHariIni = totalPemasukanTunai + totalPemasukanQris + totalPemasukanTransfer;

  // Total Mutasi Masuk Kas Laci (Modal + Tunai)
  const totalMutasiMasukKas = saldoModalAwal + totalPemasukanTunai;

  // D. Total Pengeluaran Kas Kecil (<250rb)
  const totalPengeluaranKasKecil = activeTxList
    .filter(tx => tx.isCash && tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amountOut || 0), 0);

  // E. SALDO AKHIR BUKU KAS (A + B - D) = SALDO TUNAI HARI INI
  const saldoAkhirBukuKas = saldoModalAwal + totalPemasukanTunai - totalPengeluaranKasKecil;

  // F. Total Fisik Uang Tunai di Laci Kasir (calculated from denominations)
  const totalFisikUangLaci = calculateDenominationsTotal(AppState.denominations);

  // G. Selisih Kasir (Fisik - Buku)
  const selisihKasir = totalFisikUangLaci - saldoAkhirBukuKas;

  let statusSelisih = 'SEIMBANG';
  let statusBadgeClass = 'bg-emerald-500 text-white';
  if (selisihKasir > 0) {
    statusSelisih = `SELISIH LEBIH (+${formatRupiah(selisihKasir)})`;
    statusBadgeClass = 'bg-amber-500 text-white';
  } else if (selisihKasir < 0) {
    statusSelisih = `SELISIH KURANG (${formatRupiah(selisihKasir)})`;
    statusBadgeClass = 'bg-rose-500 text-white';
  }

  return {
    saldoModalAwal,
    totalPemasukanTunai,
    totalPemasukanQris,
    totalPemasukanTransfer,
    totalPemasukanHariIni,
    totalMutasiMasukKas,
    totalPengeluaranKasKecil,
    saldoAkhirBukuKas,
    totalFisikUangLaci,
    selisihKasir,
    statusSelisih,
    statusBadgeClass,
    transactionCount: activeTxList.length
  };
}

function calculateDenominationsTotal(denom) {
  const values = {
    k100k: 100000,
    k50k: 50000,
    k20k: 20000,
    k10k: 10000,
    k5k: 5000,
    k2k: 2000,
    k1k: 1000,
    c1000: 1000,
    c500: 500,
    c200: 200,
    c100: 100
  };

  let total = 0;
  for (const key in values) {
    total += (Number(denom[key]) || 0) * values[key];
  }
  return total;
}

// ==============================================================================
// RENDER ENGINE (HERO CARDS & TABLE)
// ==============================================================================

function renderAll() {
  const summary = calculateCashSummary();
  renderHeroCards(summary);
  renderSummaryRecapBoxes(summary);
  renderTransactionTable();
  renderDenominationSummary(summary);
  renderHeaderMetadata();
}

/**
 * Render Two Companion Hero Cards:
 * 1. SALDO TUNAI HARI INI (Laci Kasir)
 * 2. TOTAL PEMASUKAN HARI INI (Tunai, QRIS, Transfer)
 */
function renderHeroCards(summary) {
  // 1. Saldo Tunai Hari Ini (Laci)
  const elSaldoHariIni = document.getElementById('heroSaldoTunaiDisplay');
  const elStatusBadge = document.getElementById('heroStatusBadge');
  const elStatusText = document.getElementById('heroStatusText');
  const elDateTitle = document.getElementById('heroDateTitle');
  const elShiftBadge = document.getElementById('heroShiftBadge');

  if (elSaldoHariIni) elSaldoHariIni.textContent = formatRupiah(summary.saldoAkhirBukuKas);

  if (elStatusBadge) {
    elStatusBadge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm flex items-center space-x-1.5 ${summary.statusBadgeClass}`;
    elStatusBadge.innerHTML = summary.selisihKasir === 0
      ? `<i class="fa-solid fa-circle-check"></i><span>SEIMBANG (0 SELISIH)</span>`
      : summary.selisihKasir > 0
        ? `<i class="fa-solid fa-triangle-exclamation"></i><span>LEBIH: +${formatRupiah(summary.selisihKasir)}</span>`
        : `<i class="fa-solid fa-circle-xmark"></i><span>KURANG: ${formatRupiah(summary.selisihKasir)}</span>`;
  }

  if (elStatusText) {
    elStatusText.textContent = `Fisik Laci: ${formatRupiah(summary.totalFisikUangLaci)} • Buku: ${formatRupiah(summary.saldoAkhirBukuKas)}`;
  }

  if (elDateTitle) elDateTitle.textContent = formatIndonesianDate(AppState.selectedDate);
  if (elShiftBadge) elShiftBadge.textContent = AppState.shift;

  // Mini-stats inside Hero Saldo Tunai
  document.getElementById('heroModalAwal').textContent = formatRupiah(summary.saldoModalAwal);
  document.getElementById('heroTunaiMasuk').textContent = `(+) ${formatRupiah(summary.totalPemasukanTunai)}`;
  document.getElementById('heroPengeluaranKasKecil').textContent = `(-) ${formatRupiah(summary.totalPengeluaranKasKecil)}`;

  // 2. Total Pemasukan Hari Ini (Tunai, QRIS, Transfer)
  const elTotalPemasukan = document.getElementById('cardTotalPemasukanDisplay');
  const elIncomeTunai = document.getElementById('cardIncomeTunaiDisplay');
  const elIncomeQris = document.getElementById('cardIncomeQrisDisplay');
  const elIncomeTransfer = document.getElementById('cardIncomeTransferDisplay');

  if (elTotalPemasukan) elTotalPemasukan.textContent = formatRupiah(summary.totalPemasukanHariIni);
  if (elIncomeTunai) elIncomeTunai.textContent = formatRupiah(summary.totalPemasukanTunai);
  if (elIncomeQris) elIncomeQris.textContent = formatRupiah(summary.totalPemasukanQris);
  if (elIncomeTransfer) elIncomeTransfer.textContent = formatRupiah(summary.totalPemasukanTransfer);
}

/**
 * Render Rekapitulasi Posisi Kas (Closing Shift) A s/d G box
 */
function renderSummaryRecapBoxes(summary) {
  document.getElementById('recapModalAwal').textContent = formatRupiah(summary.saldoModalAwal);
  document.getElementById('recapPenjualanTunai').textContent = `(+) ${formatRupiah(summary.totalPemasukanTunai)}`;
  document.getElementById('recapPemasukanQris').textContent = formatRupiah(summary.totalPemasukanQris);
  document.getElementById('recapPemasukanTransfer').textContent = formatRupiah(summary.totalPemasukanTransfer);
  document.getElementById('recapGrandTotalPemasukan').textContent = formatRupiah(summary.totalPemasukanHariIni);
  document.getElementById('recapPengeluaranKasKecil').textContent = `(-) ${formatRupiah(summary.totalPengeluaranKasKecil)}`;
  document.getElementById('recapSaldoAkhirBuku').textContent = formatRupiah(summary.saldoAkhirBukuKas);
  document.getElementById('recapTotalFisikLaci').textContent = formatRupiah(summary.totalFisikUangLaci);
  
  const elSelisih = document.getElementById('recapSelisihKasir');
  elSelisih.textContent = summary.selisihKasir === 0
    ? `Rp 0 (SEIMBANG)`
    : summary.selisihKasir > 0
      ? `+${formatRupiah(summary.selisihKasir)} (LEBIH)`
      : `${formatRupiah(summary.selisihKasir)} (KURANG)`;

  elSelisih.className = `font-bold font-mono-num ${
    summary.selisihKasir === 0
      ? 'text-emerald-700'
      : summary.selisihKasir > 0
        ? 'text-amber-700'
        : 'text-rose-700'
  }`;

  // Footer Totals in Transaction Table
  document.getElementById('tableTotalMasuk').textContent = formatRupiah(summary.totalMutasiMasukKas);
  document.getElementById('tableTotalKeluar').textContent = formatRupiah(summary.totalPengeluaranKasKecil);
}

function renderHeaderMetadata() {
  const storeNameEl = document.getElementById('storeHeaderName');
  if (storeNameEl) storeNameEl.textContent = AppState.shopProfile.name;

  const headerSelect = document.getElementById('headerPembuatLaporanSelect');
  if (headerSelect && headerSelect.value !== AppState.cashier) {
    headerSelect.value = AppState.cashier;
  }

  const cashierEl = document.getElementById('headerCashierName');
  if (cashierEl) cashierEl.textContent = AppState.cashier;

  const supervisorEl = document.getElementById('headerSupervisorName');
  if (supervisorEl) supervisorEl.textContent = AppState.supervisor;

  const signBoxSupervisorEl = document.getElementById('signBoxSupervisor');
  if (signBoxSupervisorEl) signBoxSupervisorEl.textContent = `( ${AppState.supervisor} )`;

  const signBoxCashierEl = document.getElementById('signBoxCashier');
  if (signBoxCashierEl) signBoxCashierEl.textContent = `( ${AppState.cashier} )`;
}

/**
 * Render Transaction Table with running balance & official SOP-FIN-01 columns
 */
function renderTransactionTable() {
  const tbody = document.getElementById('transactionTableBody');
  const emptyState = document.getElementById('tableEmptyState');
  const countBadge = document.getElementById('txCountBadge');
  
  const transactions = getFilteredTransactions();

  if (countBadge) countBadge.textContent = `${transactions.length} Baris`;

  if (transactions.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Sort by time or creation
  transactions.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  let html = '';
  let runningBalance = 0;

  transactions.forEach((tx, index) => {
    // Running balance for cash ledger
    if (tx.isCash) {
      runningBalance += Number(tx.amountIn || 0) - Number(tx.amountOut || 0);
    }

    const channel = getTransactionChannel(tx);
    const isOverLimit = tx.type === 'expense' && tx.amountOut >= AppState.shopProfile.pettyCashLimit;
    const rowClass = isOverLimit ? 'bg-amber-50/70' : '';

    html += `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition group ${rowClass}">
        <!-- NO -->
        <td class="py-3 px-3 text-center font-bold text-slate-500 font-mono-num text-xs">
          ${index + 1}
        </td>

        <!-- WAKTU -->
        <td class="py-3 px-3 text-center text-slate-700 font-mono-num text-xs font-semibold whitespace-nowrap">
          <i class="fa-regular fa-clock text-slate-400 mr-1 text-[11px]"></i>${tx.time || '00:00'}
        </td>

        <!-- NO. BUKTI / NOTA -->
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-900 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
            ${escapeHtml(tx.receiptNo || '-')}
          </span>
        </td>

        <!-- KETERANGAN TRANSAKSI -->
        <td class="py-3 px-3 text-slate-800 text-xs">
          <div class="font-medium flex items-center gap-1.5 flex-wrap">
            <span>${escapeHtml(tx.description)}</span>
            ${tx.type === 'income' ? `
              <span class="px-2 py-0.2 rounded-full text-[10px] font-bold ${
                channel === 'Tunai'
                  ? 'bg-emerald-100 text-emerald-800'
                  : channel === 'QRIS'
                    ? 'bg-violet-100 text-violet-800'
                    : 'bg-blue-100 text-blue-800'
              }">${channel}</span>
            ` : ''}
            ${isOverLimit ? `<span class="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-300" title="Melebihi limit SOP"><i class="fa-solid fa-triangle-exclamation"></i> ≥250rb</span>` : ''}
          </div>
        </td>

        <!-- KATEGORI AKUN -->
        <td class="py-3 px-3 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${getCategoryBadgeColor(tx.category, tx.type)}">
            <i class="fa-solid ${getCategoryIcon(tx.category)} text-[10px]"></i>
            ${escapeHtml(tx.category)}
          </span>
        </td>

        <!-- MASUK (RP) -->
        <td class="py-3 px-3 text-right font-mono-num text-xs font-bold text-emerald-700 whitespace-nowrap">
          ${tx.amountIn > 0 ? formatRupiah(tx.amountIn) : '-'}
        </td>

        <!-- KELUAR (<250RB) -->
        <td class="py-3 px-3 text-right font-mono-num text-xs font-bold text-rose-600 whitespace-nowrap">
          ${tx.amountOut > 0 ? formatRupiah(tx.amountOut) : '-'}
        </td>

        <!-- SALDO BERJALAN -->
        <td class="py-3 px-3 text-right font-mono-num text-xs font-black text-slate-800 bg-slate-50/60 whitespace-nowrap">
          ${tx.isCash ? formatRupiah(runningBalance) : '<span class="text-slate-400 font-normal text-[11px]">Non-Laci</span>'}
        </td>

        <!-- PARAF / VERIFIKASI -->
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <button onclick="toggleVerifyTransaction('${tx.id}')" title="Klik untuk mengubah verifikasi" class="inline-flex items-center justify-center w-7 h-7 rounded-lg border ${tx.verified ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-300 text-slate-400'} hover:scale-105 transition">
            <i class="fa-solid ${tx.verified ? 'fa-check' : 'fa-minus'} text-xs"></i>
          </button>
        </td>

        <!-- AKSI -->
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <div class="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition">
            <button onclick="openEditTransactionModal('${tx.id}')" title="Edit Transaksi" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition">
              <i class="fa-regular fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deleteTransaction('${tx.id}')" title="Hapus Transaksi" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function getCategoryBadgeColor(catName, type) {
  if (type === 'income') {
    if (catName === 'Tunai' || catName === 'Penjualan Tunai') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (catName === 'QRIS' || catName === 'Pembayaran QRIS') return 'bg-violet-100 text-violet-800 border border-violet-200';
    if (catName === 'Transfer' || catName === 'Transfer Bank BCA') return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (catName === 'Modal Kerja Kas') return 'bg-sky-100 text-sky-800 border border-sky-200';
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  } else {
    if (catName === 'Finishing Produksi') return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (catName === 'Kebutuhan Darurat Cetak') return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (catName === 'Perawatan Mesin') return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    if (catName === 'Logistik & Kurir') return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (catName === 'Peralatan & Tamu') return 'bg-teal-100 text-teal-800 border border-teal-200';
    return 'bg-rose-100 text-rose-800 border border-rose-200';
  }
}

function getCategoryIcon(catName) {
  if (catName === 'Tunai' || catName === 'Penjualan Tunai') return 'fa-money-bill-wave';
  if (catName === 'QRIS' || catName === 'Pembayaran QRIS') return 'fa-qrcode';
  if (catName === 'Transfer' || catName === 'Transfer Bank BCA') return 'fa-building-columns';
  if (catName === 'Modal Kerja Kas') return 'fa-vault';

  const matchExp = AppState.expenseCategories.find(c => c.name === catName);
  if (matchExp) return matchExp.icon || 'fa-tag';
  return 'fa-receipt';
}

function renderDenominationSummary(summary) {
  const denomPreviewEl = document.getElementById('denomDrawerTotalPreview');
  if (denomPreviewEl) {
    denomPreviewEl.textContent = formatRupiah(summary.totalFisikUangLaci);
  }
}

// ==============================================================================
// MODAL: PEMASUKAN RINGKAS (TUNAI, QRIS, TRANSFER - TIDAK PERLU DETAIL)
// ==============================================================================

let selectedIncomeChannel = 'Tunai';

function openQuickIncomeModal(defaultChannel = 'Tunai') {
  selectedIncomeChannel = defaultChannel;
  selectIncomeChannelTab(defaultChannel);
  
  document.getElementById('quickIncomeAmount').value = '';
  document.getElementById('quickIncomeDesc').value = '';
  document.getElementById('quickIncomeDate').value = AppState.selectedDate;

  openModal('quickIncomeModal');
}

function selectIncomeChannelTab(channel) {
  selectedIncomeChannel = channel;
  
  const btnTunai = document.getElementById('btnChannelTunai');
  const btnQris = document.getElementById('btnChannelQris');
  const btnTransfer = document.getElementById('btnChannelTransfer');
  const badgeNote = document.getElementById('incomeChannelNote');

  btnTunai.className = 'flex-1 py-3 px-3 rounded-2xl border-2 text-xs font-black transition flex flex-col items-center gap-1 ' +
    (channel === 'Tunai' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50');
  
  btnQris.className = 'flex-1 py-3 px-3 rounded-2xl border-2 text-xs font-black transition flex flex-col items-center gap-1 ' +
    (channel === 'QRIS' ? 'border-violet-600 bg-violet-50 text-violet-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50');
  
  btnTransfer.className = 'flex-1 py-3 px-3 rounded-2xl border-2 text-xs font-black transition flex flex-col items-center gap-1 ' +
    (channel === 'Transfer' ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50');

  if (channel === 'Tunai') {
    badgeNote.className = 'p-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-2';
    badgeNote.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i><span>Uang Tunai langsung menambah Saldo Kas Laci Kasir.</span>';
  } else if (channel === 'QRIS') {
    badgeNote.className = 'p-2.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-900 border border-violet-200 flex items-center gap-2';
    badgeNote.innerHTML = '<i class="fa-solid fa-mobile-screen-button text-violet-600"></i><span>Pemasukan QRIS masuk ke settlement bank (Non-Tunai).</span>';
  } else {
    badgeNote.className = 'p-2.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-2';
    badgeNote.innerHTML = '<i class="fa-solid fa-building-columns text-blue-600"></i><span>Pemasukan Transfer masuk ke rekening bank (Non-Tunai).</span>';
  }
}

function addQuickIncomeChip(amount) {
  const input = document.getElementById('quickIncomeAmount');
  const current = Number(input.value) || 0;
  input.value = current + amount;
}

function handleSaveQuickIncome(event) {
  event.preventDefault();

  const amount = Number(document.getElementById('quickIncomeAmount').value);
  const date = document.getElementById('quickIncomeDate').value || AppState.selectedDate;
  let desc = document.getElementById('quickIncomeDesc').value.trim();

  if (!amount || amount <= 0) {
    showToast('Nominal pemasukan harus lebih dari 0!', 'warning');
    return;
  }

  // Auto description if empty (Tidak perlu detail)
  if (!desc) {
    desc = `Pemasukan ${selectedIncomeChannel}`;
  }

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const prefix = selectedIncomeChannel === 'Tunai' ? 'SP-' : selectedIncomeChannel === 'QRIS' ? 'QRIS-' : 'TRF-';
  const receiptNo = `${prefix}${Math.floor(100 + Math.random() * 900)}`;

  const newTx = {
    id: `tx-${Date.now()}`,
    time,
    date,
    receiptNo,
    description: desc,
    category: selectedIncomeChannel,
    channel: selectedIncomeChannel,
    type: 'income',
    isCash: selectedIncomeChannel === 'Tunai',
    isModal: false,
    amountIn: amount,
    amountOut: 0,
    verified: true,
    shift: AppState.shift,
    cashier: AppState.cashier
  };

  AppState.transactions.push(newTx);
  saveTransactionsToStorage();
  closeModal('quickIncomeModal');
  renderAll();
  showToast(`Pemasukan ${selectedIncomeChannel} sebesar ${formatRupiah(amount)} berhasil dicatat!`, 'success');
}

/**
 * Direct Update Total Pemasukan Hari Ini: Tunai, QRIS, Transfer (Hanya 3 angka)
 */
function openSetTotalIncomeModal() {
  const summary = calculateCashSummary();
  document.getElementById('setTotalTunaiInput').value = summary.totalPemasukanTunai;
  document.getElementById('setTotalQrisInput').value = summary.totalPemasukanQris;
  document.getElementById('setTotalTransferInput').value = summary.totalPemasukanTransfer;

  openModal('setTotalIncomeModal');
}

function handleSaveSetTotalIncome(event) {
  event.preventDefault();

  const newTunai = Number(document.getElementById('setTotalTunaiInput').value) || 0;
  const newQris = Number(document.getElementById('setTotalQrisInput').value) || 0;
  const newTransfer = Number(document.getElementById('setTotalTransferInput').value) || 0;

  // Remove existing non-modal income for the selected date
  AppState.transactions = AppState.transactions.filter(tx => {
    if (tx.date === AppState.selectedDate && tx.type === 'income' && !tx.isModal) {
      return false;
    }
    return true;
  });

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Add consolidated rows (Tunai, QRIS, Transfer)
  if (newTunai > 0) {
    AppState.transactions.push({
      id: `tx-tot-tunai-${Date.now()}`,
      time,
      date: AppState.selectedDate,
      receiptNo: 'TOT-TUNAI',
      description: 'Total Pemasukan Tunai Hari Ini',
      category: 'Tunai',
      channel: 'Tunai',
      type: 'income',
      isCash: true,
      isModal: false,
      amountIn: newTunai,
      amountOut: 0,
      verified: true,
      shift: AppState.shift,
      cashier: AppState.cashier
    });
  }

  if (newQris > 0) {
    AppState.transactions.push({
      id: `tx-tot-qris-${Date.now()}`,
      time,
      date: AppState.selectedDate,
      receiptNo: 'TOT-QRIS',
      description: 'Total Pemasukan QRIS Hari Ini',
      category: 'QRIS',
      channel: 'QRIS',
      type: 'income',
      isCash: false,
      isModal: false,
      amountIn: newQris,
      amountOut: 0,
      verified: true,
      shift: AppState.shift,
      cashier: AppState.cashier
    });
  }

  if (newTransfer > 0) {
    AppState.transactions.push({
      id: `tx-tot-trf-${Date.now()}`,
      time,
      date: AppState.selectedDate,
      receiptNo: 'TOT-TRF',
      description: 'Total Pemasukan Transfer Hari Ini',
      category: 'Transfer',
      channel: 'Transfer',
      type: 'income',
      isCash: false,
      isModal: false,
      amountIn: newTransfer,
      amountOut: 0,
      verified: true,
      shift: AppState.shift,
      cashier: AppState.cashier
    });
  }

  saveTransactionsToStorage();
  closeModal('setTotalIncomeModal');
  renderAll();
  showToast('Total pemasukan hari ini (Tunai, QRIS, Transfer) berhasil diperbarui!', 'success');
}

// ==============================================================================
// MODAL: MODAL AWAL KASIR (UANG RECEH BUKA SHIFT)
// ==============================================================================

function openSetModalAwal() {
  const summary = calculateCashSummary();
  document.getElementById('setModalAwalInput').value = summary.saldoModalAwal || 0;
  openModal('modalAwalDialog');
}

function handleSaveModalAwal(event) {
  event.preventDefault();

  const val = Number(document.getElementById('setModalAwalInput').value) || 0;
  AppState.modalAwal = val;
  AppState.shopProfile.defaultModalAwal = val;

  const existingModal = AppState.transactions.find(tx => tx.date === AppState.selectedDate && tx.isModal);
  if (existingModal) {
    if (val > 0) {
      existingModal.amountIn = val;
    } else {
      AppState.transactions = AppState.transactions.filter(t => t.id !== existingModal.id);
    }
  } else if (val > 0) {
    AppState.transactions.unshift({
      id: `tx-modal-${Date.now()}`,
      time: '08:00',
      date: AppState.selectedDate,
      receiptNo: 'MODAL-01',
      description: 'Modal awal uang receh kasir di laci kas',
      category: 'Modal Kerja Kas',
      channel: 'Tunai',
      type: 'income',
      isCash: true,
      isModal: true,
      amountIn: val,
      amountOut: 0,
      verified: true,
      shift: AppState.shift,
      cashier: AppState.cashier
    });
  }

  saveTransactionsToStorage();
  saveSettingsToStorage();
  closeModal('modalAwalDialog');
  renderAll();
  showToast(`Modal awal kasir berhasil diatur: ${formatRupiah(val)}`, 'success');
}

// ==============================================================================
// MODAL: CATAT PENGELUARAN KAS KECIL (<250RB) & SOP COMPLIANCE
// ==============================================================================

function populateCategoryDropdowns() {
  const expSelect = document.getElementById('modalExpCategory');
  if (expSelect) {
    expSelect.innerHTML = AppState.expenseCategories.map(c => `
      <option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${escapeHtml(c.group)})</option>
    `).join('');
  }
}

function populatePembuatLaporanDropdowns() {
  const headerSelect = document.getElementById('headerPembuatLaporanSelect');
  const setCashierSelect = document.getElementById('setCashierName');
  const names = (AppState.pembuatLaporanList && AppState.pembuatLaporanList.length)
    ? AppState.pembuatLaporanList
    : DEFAULT_PEMBUAT_LAPORAN_LIST;

  const optionsHtml = names.map(name => 
    `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
  ).join('');

  if (headerSelect) {
    headerSelect.innerHTML = optionsHtml;
    headerSelect.value = AppState.cashier;
  }

  if (setCashierSelect) {
    setCashierSelect.innerHTML = optionsHtml;
    setCashierSelect.value = AppState.cashier;
  }
}

function changePembuatLaporan(selectedName) {
  if (!selectedName) return;
  AppState.cashier = selectedName;
  AppState.shopProfile.cashierName = selectedName;
  saveSettingsToStorage();
  
  const headerSelect = document.getElementById('headerPembuatLaporanSelect');
  if (headerSelect && headerSelect.value !== selectedName) {
    headerSelect.value = selectedName;
  }
  const setCashierSelect = document.getElementById('setCashierName');
  if (setCashierSelect && setCashierSelect.value !== selectedName) {
    setCashierSelect.value = selectedName;
  }

  renderHeaderMetadata();
  showToast(`Pembuat Laporan aktif diubah menjadi: ${selectedName}`, 'info');
}

function openAddExpenseModal() {
  AppState.editingTransactionId = null;
  document.getElementById('txExpDateInput').value = AppState.selectedDate;
  
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  document.getElementById('txExpTimeInput').value = timeStr;

  const randomNum = Math.floor(100 + Math.random() * 900);
  document.getElementById('txExpReceiptInput').value = `STR-${randomNum}`;
  document.getElementById('txExpDescriptionInput').value = '';
  document.getElementById('txExpAmountInput').value = '';

  openModal('expenseModal');
}

function handleSaveExpense(event) {
  event.preventDefault();

  const date = document.getElementById('txExpDateInput').value;
  const time = document.getElementById('txExpTimeInput').value;
  const receiptNo = document.getElementById('txExpReceiptInput').value.trim();
  const description = document.getElementById('txExpDescriptionInput').value.trim();
  const rawAmount = Number(document.getElementById('txExpAmountInput').value);
  const category = document.getElementById('modalExpCategory').value;

  if (!description) {
    showToast('Keterangan belanja kas kecil wajib diisi!', 'warning');
    return;
  }
  if (!rawAmount || rawAmount <= 0) {
    showToast('Nominal harus lebih dari 0!', 'warning');
    return;
  }

  // SOP-FIN-01: Batas Maksimal < Rp 250.000
  if (rawAmount >= AppState.shopProfile.pettyCashLimit) {
    openSopLimitAlertModal({
      amount: rawAmount,
      type: 'expense',
      date,
      time,
      receiptNo,
      description,
      category,
      isCash: true,
      verified: true
    });
    return;
  }

  commitExpenseTransaction({
    date,
    time,
    receiptNo,
    description,
    category,
    amount: rawAmount
  });
}

function commitExpenseTransaction(data) {
  const txData = {
    id: `tx-exp-${Date.now()}`,
    time: data.time || '00:00',
    date: data.date,
    receiptNo: data.receiptNo || 'STR-00',
    description: data.description,
    category: data.category,
    channel: 'Tunai',
    type: 'expense',
    isCash: true,
    isModal: false,
    amountIn: 0,
    amountOut: data.amount,
    verified: true,
    shift: AppState.shift,
    cashier: AppState.cashier
  };

  AppState.transactions.push(txData);
  saveTransactionsToStorage();
  closeModal('expenseModal');
  renderAll();
  showToast('Pengeluaran kas kecil berhasil dicatat!', 'success');
}

function deleteTransaction(id) {
  const tx = AppState.transactions.find(t => t.id === id);
  if (!tx) return;

  if (confirm(`Yakin ingin menghapus transaksi "${tx.description}" (${formatRupiah(tx.amountIn || tx.amountOut)})?`)) {
    AppState.transactions = AppState.transactions.filter(t => t.id !== id);
    saveTransactionsToStorage();
    renderAll();
    showToast('Transaksi telah dihapus.', 'info');
  }
}

function clearAllTransactions() {
  if (confirm('Yakin ingin mengosongkan/menghapus seluruh data transaksi? Semua mutasi kas akan dihapus dan kembali ke 0.')) {
    AppState.transactions = [];
    AppState.denominations = { ...DEFAULT_DENOMINATIONS_DATA };
    AppState.modalAwal = 0;
    saveTransactionsToStorage();
    saveDenominationsToStorage();
    renderAll();
    showToast('Seluruh data transaksi telah dikosongkan.', 'info');
  }
}

function toggleVerifyTransaction(id) {
  const tx = AppState.transactions.find(t => t.id === id);
  if (!tx) return;

  tx.verified = !tx.verified;
  saveTransactionsToStorage();
  renderAll();
  showToast(`Status verifikasi: ${tx.verified ? 'Terverifikasi (Paraf ✓)' : 'Batal Verifikasi'}`, 'info');
}

function openEditTransactionModal(id) {
  const tx = AppState.transactions.find(t => t.id === id);
  if (!tx) return;

  AppState.editingTransactionId = id;
  document.getElementById('editTxId').value = tx.id;
  document.getElementById('editTxReceipt').value = tx.receiptNo || '';
  document.getElementById('editTxDesc').value = tx.description || '';
  document.getElementById('editTxAmount').value = tx.type === 'income' ? tx.amountIn : tx.amountOut;

  openModal('editTransactionModal');
}

function handleSaveEditTransaction(event) {
  event.preventDefault();
  const id = document.getElementById('editTxId').value;
  const tx = AppState.transactions.find(t => t.id === id);
  if (!tx) return;

  tx.receiptNo = document.getElementById('editTxReceipt').value.trim();
  tx.description = document.getElementById('editTxDesc').value.trim();
  const val = Number(document.getElementById('editTxAmount').value) || 0;

  if (tx.type === 'income') {
    tx.amountIn = val;
  } else {
    tx.amountOut = val;
  }

  saveTransactionsToStorage();
  closeModal('editTransactionModal');
  renderAll();
  showToast('Perubahan transaksi disimpan!', 'success');
}

// ==============================================================================
// SOP-FIN-01 LIMIT ALERT MODAL (>= Rp 250.000)
// ==============================================================================

let pendingSopTransaction = null;

function openSopLimitAlertModal(txPayload) {
  pendingSopTransaction = txPayload;
  document.getElementById('sopAlertAmount').textContent = formatRupiah(txPayload.amount);
  document.getElementById('sopSupervisorPinInput').value = '';
  document.getElementById('sopPinErrorMsg').classList.add('hidden');
  openModal('sopLimitAlertModal');
}

function handleSopRedirectToPo() {
  if (!pendingSopTransaction) return;
  pendingSopTransaction.isCash = false;
  pendingSopTransaction.channel = 'Transfer';
  pendingSopTransaction.description = `[PO / Pengadaan Kantor] ${pendingSopTransaction.description}`;
  commitExpenseTransaction(pendingSopTransaction);
  closeModal('sopLimitAlertModal');
  closeModal('expenseModal');
  showToast('Pengeluaran dialihkan ke Sistem Pengadaan PO (Non-Kasir).', 'success');
  pendingSopTransaction = null;
}

function handleSopOverrideWithPin() {
  if (!pendingSopTransaction) return;
  const pinInput = document.getElementById('sopSupervisorPinInput').value.trim();
  const errorMsg = document.getElementById('sopPinErrorMsg');

  if (pinInput !== AppState.shopProfile.supervisorPin) {
    errorMsg.classList.remove('hidden');
    return;
  }

  errorMsg.classList.add('hidden');
  pendingSopTransaction.description = `[Otorisasi Supervisor] ${pendingSopTransaction.description}`;
  commitExpenseTransaction(pendingSopTransaction);
  closeModal('sopLimitAlertModal');
  closeModal('expenseModal');
  showToast('Pengeluaran disetujui melalui Otorisasi Supervisor.', 'warning');
  pendingSopTransaction = null;
}

// ==============================================================================
// DENOMINATIONS RECONCILIATION CALCULATOR (CLOSING SHIFT)
// ==============================================================================

function openCashCalculatorModal() {
  for (const key in AppState.denominations) {
    const input = document.getElementById(`denom_${key}`);
    if (input) {
      input.value = AppState.denominations[key] || 0;
    }
  }

  calculateDenominationsLive();
  openModal('cashCalculatorModal');
}

function calculateDenominationsLive() {
  const tempDenom = {};
  const keys = ['k100k', 'k50k', 'k20k', 'k10k', 'k5k', 'k2k', 'k1k', 'c1000', 'c500', 'c200', 'c100'];
  
  keys.forEach(key => {
    const input = document.getElementById(`denom_${key}`);
    tempDenom[key] = input ? Math.max(0, parseInt(input.value) || 0) : 0;

    const subtotalEl = document.getElementById(`subtotal_${key}`);
    if (subtotalEl) {
      const val = getDenominationValue(key);
      subtotalEl.textContent = formatRupiah(tempDenom[key] * val);
    }
  });

  const totalFisik = calculateDenominationsTotal(tempDenom);
  const summary = calculateCashSummary();
  const selisih = totalFisik - summary.saldoAkhirBukuKas;

  document.getElementById('denomCalcTotalFisik').textContent = formatRupiah(totalFisik);
  document.getElementById('denomCalcSaldoBuku').textContent = formatRupiah(summary.saldoAkhirBukuKas);

  const selisihEl = document.getElementById('denomCalcSelisih');
  if (selisih === 0) {
    selisihEl.textContent = 'Rp 0 (SEIMBANG / PAS)';
    selisihEl.className = 'text-emerald-700 font-bold font-mono-num';
  } else if (selisih > 0) {
    selisihEl.textContent = `+${formatRupiah(selisih)} (SELISIH LEBIH)`;
    selisihEl.className = 'text-amber-700 font-bold font-mono-num';
  } else {
    selisihEl.textContent = `${formatRupiah(selisih)} (SELISIH KURANG)`;
    selisihEl.className = 'text-rose-700 font-bold font-mono-num';
  }
}

function getDenominationValue(key) {
  const dict = {
    k100k: 100000, k50k: 50000, k20k: 20000, k10k: 10000,
    k5k: 5000, k2k: 2000, k1k: 1000,
    c1000: 1000, c500: 500, c200: 200, c100: 100
  };
  return dict[key] || 0;
}

function saveDenominationsModal() {
  const keys = ['k100k', 'k50k', 'k20k', 'k10k', 'k5k', 'k2k', 'k1k', 'c1000', 'c500', 'c200', 'c100'];
  keys.forEach(key => {
    const input = document.getElementById(`denom_${key}`);
    AppState.denominations[key] = input ? Math.max(0, parseInt(input.value) || 0) : 0;
  });

  saveDenominationsToStorage();
  closeModal('cashCalculatorModal');
  renderAll();
  showToast('Hitungan kas fisik laci berhasil disimpan!', 'success');
}

// ==============================================================================
// MODAL MANAGEMENT & CHIPS
// ==============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.body.classList.remove('overflow-hidden');
}

function addExpenseChip(amount) {
  const input = document.getElementById('txExpAmountInput');
  const current = Number(input.value) || 0;
  input.value = current + amount;
}

// ==============================================================================
// DATE & PERIOD NAVIGATION CONTROLS
// ==============================================================================

function setPeriodMode(mode) {
  AppState.periodMode = mode;
  const dayControls = document.getElementById('dayNavControls');
  const rangeControls = document.getElementById('rangeNavControls');
  const btnDay = document.getElementById('periodModeBtn-day');
  const btnRange = document.getElementById('periodModeBtn-range');

  if (mode === 'day') {
    dayControls.classList.remove('hidden');
    rangeControls.classList.add('hidden');
    btnDay.className = 'px-3 py-1.5 rounded-lg bg-white font-bold text-slate-900 shadow-sm transition';
    btnRange.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 transition';
  } else {
    dayControls.classList.add('hidden');
    rangeControls.classList.remove('hidden');
    btnDay.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 transition';
    btnRange.className = 'px-3 py-1.5 rounded-lg bg-white font-bold text-slate-900 shadow-sm transition';
  }
  renderAll();
}

function handleDateChange(newDate) {
  if (!newDate) return;
  AppState.selectedDate = newDate;
  renderAll();
}

function navigateDate(days) {
  const current = new Date(AppState.selectedDate);
  current.setDate(current.getDate() + days);
  const formatted = current.toISOString().split('T')[0];
  AppState.selectedDate = formatted;
  document.getElementById('filterDateInput').value = formatted;
  renderAll();
}

function setTodayDate() {
  AppState.selectedDate = '2026-10-10';
  document.getElementById('filterDateInput').value = AppState.selectedDate;
  renderAll();
}

function applyDateRange() {
  const start = document.getElementById('rangeStartDateInput').value;
  const end = document.getElementById('rangeEndDateInput').value;
  if (!start || !end) {
    showToast('Tentukan tanggal mulai dan selesai.', 'warning');
    return;
  }
  if (start > end) {
    showToast('Tanggal mulai tidak boleh lebih dari tanggal selesai.', 'warning');
    return;
  }
  AppState.rangeStartDate = start;
  AppState.rangeEndDate = end;
  renderAll();
}

// ==============================================================================
// FILTERING & SEARCH CONTROLS
// ==============================================================================

function handleSearchInput(value) {
  AppState.filter.keyword = value.trim();
  renderTransactionTable();
}

function handleChannelFilter(ch) {
  AppState.filter.channel = ch;
  renderTransactionTable();
}

function handleTypeFilter(type) {
  AppState.filter.type = type;
  renderTransactionTable();
}

// ==============================================================================
// DUAL PRINT LAYOUT ENGINE (A4 SOP-FIN-01 FORM & THERMAL POS RECEIPT)
// ==============================================================================

function printSopFormA4() {
  const summary = calculateCashSummary();
  const transactions = getFilteredTransactions();
  transactions.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  let tableRowsHtml = '';
  const maxRows = Math.max(12, transactions.length);

  for (let i = 0; i < maxRows; i++) {
    const tx = transactions[i];
    if (tx) {
      tableRowsHtml += `
        <tr>
          <td style="text-align:center; padding: 4px; border: 1px solid #334155; font-size: 8.5pt;">${i + 1}</td>
          <td style="text-align:center; padding: 4px; border: 1px solid #334155; font-size: 8.5pt;">${tx.time || '-'}</td>
          <td style="padding: 4px 6px; border: 1px solid #334155; font-size: 8.5pt; font-weight: bold;">${escapeHtml(tx.receiptNo || '-')}</td>
          <td style="padding: 4px 6px; border: 1px solid #334155; font-size: 8.5pt;">${escapeHtml(tx.description)}</td>
          <td style="padding: 4px 6px; border: 1px solid #334155; font-size: 8.5pt;">${escapeHtml(tx.category)}</td>
          <td style="text-align:right; padding: 4px 6px; border: 1px solid #334155; font-size: 8.5pt; font-weight: bold;">${tx.amountIn > 0 ? formatNumberOnly(tx.amountIn) : '-'}</td>
          <td style="text-align:right; padding: 4px 6px; border: 1px solid #334155; font-size: 8.5pt; font-weight: bold;">${tx.amountOut > 0 ? formatNumberOnly(tx.amountOut) : '-'}</td>
          <td style="text-align:center; padding: 4px; border: 1px solid #334155; font-size: 8.5pt;">${tx.verified ? '✓' : ''}</td>
        </tr>
      `;
    } else {
      tableRowsHtml += `
        <tr>
          <td style="text-align:center; padding: 6px; border: 1px solid #334155; font-size: 8.5pt;">${i + 1}</td>
          <td style="border: 1px solid #334155;"></td>
          <td style="border: 1px solid #334155;"></td>
          <td style="border: 1px solid #334155;"></td>
          <td style="border: 1px solid #334155;"></td>
          <td style="border: 1px solid #334155;"></td>
          <td style="border: 1px solid #334155;"></td>
          <td style="border: 1px solid #334155;"></td>
        </tr>
      `;
    }
  }

  const dateParts = AppState.selectedDate.split('-');
  const displayFormattedDate = `${dateParts[2]} / ${dateParts[1]} / ${dateParts[0]}`;

  const a4Container = document.getElementById('printA4Document');
  a4Container.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #000; width: 100%; max-width: 200mm; margin: 0 auto; line-height: 1.25;">
      
      <!-- HEADER -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <tr>
          <td style="vertical-align: top;">
            <div style="font-size: 16pt; font-weight: 900; letter-spacing: -0.5px;">SNAPRINT GWISATA</div>
            <div style="font-size: 7.5pt; font-weight: bold; color: #334155; margin-top: 2px;">
              DIGITAL PRINTING, OFFSET & ADVERTISING • BUKU KAS HARIAN TUNAI
            </div>
          </td>
          <td style="vertical-align: top; text-align: right;">
            <div style="background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; display: inline-block; text-align: right;">
              <div style="font-size: 9pt; font-weight: 800;">FORMULIR KAS KECIL</div>
              <div style="font-size: 7pt;">Batas Max: Rp 250.000 / Transaksi</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- METADATA 4-COL BOX -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #334155; margin-bottom: 8px; font-size: 8pt; background: #fafafa;">
        <tr>
          <td style="padding: 6px; border: 1px solid #334155; width: 25%;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #475569;">TANGGAL OPERASIONAL</div>
            <div style="font-size: 8.5pt; font-weight: bold; margin-top: 2px;">[ ${displayFormattedDate} ]</div>
          </td>
          <td style="padding: 6px; border: 1px solid #334155; width: 25%;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #475569;">PEMBUAT LAPORAN / KASIR</div>
            <div style="font-size: 8.5pt; font-weight: bold; margin-top: 2px;">[ ${escapeHtml(AppState.cashier)} ]</div>
          </td>
          <td style="padding: 6px; border: 1px solid #334155; width: 25%;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #475569;">SHIFT / JAM KERJA</div>
            <div style="font-size: 8.5pt; font-weight: bold; margin-top: 2px;">[ ${escapeHtml(AppState.shift)} ]</div>
          </td>
          <td style="padding: 6px; border: 1px solid #334155; width: 25%;">
            <div style="font-size: 6.5pt; font-weight: bold; color: #475569;">SALDO AWAL LACI (MODAL)</div>
            <div style="font-size: 8.5pt; font-weight: bold; margin-top: 2px;">Rp [ ${formatNumberOnly(summary.saldoModalAwal)} ]</div>
          </td>
        </tr>
      </table>

      <!-- ATURAN TRANSAKSI KASIR -->
      <div style="border: 1px solid #64748b; border-left: 3px solid #0284c7; background: #f0f9ff; padding: 5px 8px; font-size: 7pt; margin-bottom: 8px; line-height: 1.3;">
        <strong>Aturan Transaksi Kasir:</strong> Seluruh pemasukan tunai wajib dicatat beserta nomor nota resmi. Pengeluaran tunai langsung dibatasi maksimal <strong>Rp 250.000 per nota</strong> untuk kebutuhan operasional kecil. Belanja di atas Rp 250.000 wajib melalui pengajuan PO di sistem utama.
      </div>

      <!-- TABEL TRANSAKSI MUTASI -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 5px 4px; border: 1px solid #334155; font-size: 7.5pt; text-align: center; width: 4%;">NO</th>
            <th style="padding: 5px 4px; border: 1px solid #334155; font-size: 7.5pt; text-align: center; width: 8%;">WAKTU</th>
            <th style="padding: 5px 6px; border: 1px solid #334155; font-size: 7.5pt; text-align: left; width: 15%;">NO. BUKTI / NOTA</th>
            <th style="padding: 5px 6px; border: 1px solid #334155; font-size: 7.5pt; text-align: left; width: 32%;">KETERANGAN TRANSAKSI</th>
            <th style="padding: 5px 6px; border: 1px solid #334155; font-size: 7.5pt; text-align: left; width: 18%;">KATEGORI AKUN</th>
            <th style="padding: 5px 6px; border: 1px solid #334155; font-size: 7.5pt; text-align: right; width: 11%;">MASUK (RP)</th>
            <th style="padding: 5px 6px; border: 1px solid #334155; font-size: 7.5pt; text-align: right; width: 11%;">KELUAR (&lt;250RB)</th>
            <th style="padding: 5px 4px; border: 1px solid #334155; font-size: 7.5pt; text-align: center; width: 5%;">PARAF</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #e2e8f0; font-weight: bold; font-size: 8pt;">
            <td colspan="5" style="padding: 6px; border: 1px solid #334155; text-align: right;">TOTAL MUTASI HARI INI</td>
            <td style="padding: 6px; border: 1px solid #334155; text-align: right;">Rp ${formatNumberOnly(summary.totalMutasiMasukKas)}</td>
            <td style="padding: 6px; border: 1px solid #334155; text-align: right;">Rp ${formatNumberOnly(summary.totalPengeluaranKasKecil)}</td>
            <td style="border: 1px solid #334155;"></td>
          </tr>
        </tfoot>
      </table>

      <!-- REKAPITULASI POSISI KAS & RINGKASAN PEMASUKAN -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <tr>
          <!-- LEFT: REKAPITULASI POSISI KAS LACI -->
          <td style="width: 55%; vertical-align: top; padding-right: 6px;">
            <div style="border: 1px solid #334155; border-radius: 3px; padding: 8px;">
              <div style="font-size: 8pt; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
                REKAPITULASI POSISI KAS LACI (CLOSING SHIFT)
              </div>
              <table style="width: 100%; font-size: 7.5pt; line-height: 1.5;">
                <tr>
                  <td>A. Saldo Modal Kas Awal</td>
                  <td style="text-align: right; font-weight: bold;">Rp ${formatNumberOnly(summary.saldoModalAwal)}</td>
                </tr>
                <tr>
                  <td>B. Total Pemasukan Tunai Laci</td>
                  <td style="text-align: right; font-weight: bold;">(+) Rp ${formatNumberOnly(summary.totalPemasukanTunai)}</td>
                </tr>
                <tr>
                  <td>D. Total Pengeluaran Kas Kecil (&lt;250rb)</td>
                  <td style="text-align: right; font-weight: bold;">(-) Rp ${formatNumberOnly(summary.totalPengeluaranKasKecil)}</td>
                </tr>
                <tr style="border-top: 1px dashed #64748b; font-weight: bold;">
                  <td style="padding-top: 3px;">E. SALDO AKHIR BUKU KAS (A + B - D)</td>
                  <td style="padding-top: 3px; text-align: right; font-size: 8.5pt;">Rp ${formatNumberOnly(summary.saldoAkhirBukuKas)}</td>
                </tr>
                <tr>
                  <td>F. Total Fisik Uang Tunai di Laci</td>
                  <td style="text-align: right; font-weight: bold;">Rp [ ${formatNumberOnly(summary.totalFisikUangLaci)} ]</td>
                </tr>
                <tr style="font-weight: bold;">
                  <td>G. Selisih Kasir (Fisik - Buku)</td>
                  <td style="text-align: right;">Rp [ ${summary.selisihKasir} ] (${summary.selisihKasir === 0 ? 'SEIMBANG' : summary.selisihKasir > 0 ? 'LEBIH' : 'KURANG'})</td>
                </tr>
              </table>

              <!-- Non-Cash Pemasukan Summary Box (Ringkas) -->
              <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dotted #94a3b8; font-size: 7pt; color: #334155;">
                <strong>Ringkasan Total Pemasukan Hari Ini:</strong><br>
                • Tunai: Rp ${formatNumberOnly(summary.totalPemasukanTunai)} | • QRIS: Rp ${formatNumberOnly(summary.totalPemasukanQris)} | • Transfer: Rp ${formatNumberOnly(summary.totalPemasukanTransfer)}<br>
                <strong>Total Omset Pemasukan: Rp ${formatNumberOnly(summary.totalPemasukanHariIni)}</strong>
              </div>
            </div>
          </td>

          <!-- RIGHT: LEMBAR PENGESAHAN & VERIFIKASI -->
          <td style="width: 45%; vertical-align: top; padding-left: 6px;">
            <div style="border: 1px solid #334155; border-radius: 3px; padding: 8px;">
              <div style="font-size: 8pt; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
                LEMBAR PENGESAHAN & VERIFIKASI
              </div>
              <table style="width: 100%; text-align: center; font-size: 7.5pt;">
                <tr>
                  <td style="width: 50%;">Dibuat oleh (Pembuat Laporan):</td>
                  <td style="width: 50%;">Diperiksa (Supervisor/Admin):</td>
                </tr>
                <tr>
                  <td style="height: 48px; vertical-align: bottom;">
                    <div>( ${escapeHtml(AppState.cashier)} )</div>
                    <div style="font-size: 6.5pt; color: #475569;">Tgl: ${displayFormattedDate}</div>
                  </td>
                  <td style="height: 48px; vertical-align: bottom;">
                    <div>( ${escapeHtml(AppState.supervisor)} )</div>
                    <div style="font-size: 6.5pt; color: #475569;">Tgl: ${displayFormattedDate}</div>
                  </td>
                </tr>
              </table>
              <div style="font-size: 6.5pt; font-style: italic; color: #475569; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                *Seluruh struk/nota belanja wajib di-staples di balik lembar laporan ini saat serah terima kas.
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- FOOTER -->
      <table style="width: 100%; border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 6.5pt; color: #475569;">
        <tr>
          <td>Snaprint Gwisata • Sistem Kontrol Kas Harian</td>
          <td style="text-align: right;">Dokumen: SOP-FIN-01 • Halaman 1 dari 2</td>
        </tr>
      </table>

    </div>
  `;

  document.body.classList.remove('printing-thermal');
  document.body.classList.add('printing-a4');
  window.print();
}

function printThermalReceipt() {
  const summary = calculateCashSummary();

  const receiptContainer = document.getElementById('printThermalReceipt');
  receiptContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 6px;">
      <div style="font-weight: 900; font-size: 11pt;">${escapeHtml(AppState.shopProfile.name)}</div>
      <div style="font-size: 8pt;">${escapeHtml(AppState.shopProfile.tagline)}</div>
      <div style="font-size: 7.5pt;">${escapeHtml(AppState.shopProfile.address)}</div>
      <div class="thermal-divider"></div>
      <div style="font-size: 8.5pt; font-weight: bold;">TOTAL PEMASUKAN & POSISI KAS</div>
      <div style="font-size: 7.5pt;">${formatIndonesianDate(AppState.selectedDate)} • ${escapeHtml(AppState.shift)}</div>
      <div style="font-size: 7.5pt;">Pembuat: ${escapeHtml(AppState.cashier)} | Spv: ${escapeHtml(AppState.supervisor)}</div>
      <div class="thermal-divider"></div>
    </div>

    <!-- TOTAL PEMASUKAN HARI INI -->
    <div style="font-size: 8.5pt; line-height: 1.5;">
      <div style="font-weight: bold; margin-bottom: 3px;">TOTAL PEMASUKAN HARI INI:</div>
      <div style="display: flex; justify-content: space-between;">
        <span>• Tunai:</span>
        <span style="font-weight: bold;">${formatRupiah(summary.totalPemasukanTunai)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>• QRIS:</span>
        <span style="font-weight: bold;">${formatRupiah(summary.totalPemasukanQris)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>• Transfer:</span>
        <span style="font-weight: bold;">${formatRupiah(summary.totalPemasukanTransfer)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 3px; border-top: 1px dashed #64748b; padding-top: 2px;">
        <span>TOTAL OMSET:</span>
        <span>${formatRupiah(summary.totalPemasukanHariIni)}</span>
      </div>
    </div>

    <div class="thermal-double-divider"></div>

    <!-- REKAPITULASI KAS LACI -->
    <div style="font-size: 8.5pt; line-height: 1.5;">
      <div style="font-weight: bold; margin-bottom: 3px;">KAS TUNAI LACI:</div>
      <div style="display: flex; justify-content: space-between;">
        <span>Modal Awal:</span>
        <span>${formatRupiah(summary.saldoModalAwal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>(+) Masuk Tunai:</span>
        <span>${formatRupiah(summary.totalPemasukanTunai)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>(-) Kas Kecil:</span>
        <span>${formatRupiah(summary.totalPengeluaranKasKecil)}</span>
      </div>
      <div class="thermal-divider"></div>
      <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 9.5pt;">
        <span>SALDO TUNAI LACI:</span>
        <span>${formatRupiah(summary.saldoAkhirBukuKas)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Fisik Uang Laci:</span>
        <span>${formatRupiah(summary.totalFisikUangLaci)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>Status:</span>
        <span>${summary.statusSelisih}</span>
      </div>
    </div>

    <div class="thermal-divider"></div>

    <div style="text-align: center; font-size: 7.5pt; margin-top: 6px;">
      <div>Dokumen Resmi: SOP-FIN-01</div>
      <div>Terima Kasih Atas Kerjasama Anda</div>
    </div>
  `;

  document.body.classList.remove('printing-a4');
  document.body.classList.add('printing-thermal');
  window.print();
}

// ==============================================================================
// EXPORT TO EXCEL & BACKUP/RESTORE ENGINE
// ==============================================================================

function exportToExcel() {
  const transactions = getFilteredTransactions();
  const summary = calculateCashSummary();

  let csvContent = '\uFEFF';
  csvContent += `SNAPRINT GWISATA - BUKU KAS HARIAN TUNAI (SOP-FIN-01)\n`;
  csvContent += `Tanggal:;${AppState.selectedDate}\n`;
  csvContent += `Kasir:;${AppState.cashier}\n`;
  csvContent += `Shift:;${AppState.shift}\n\n`;

  csvContent += `RINGKASAN TOTAL PEMASUKAN HARI INI\n`;
  csvContent += `Pemasukan Tunai:;${summary.totalPemasukanTunai}\n`;
  csvContent += `Pemasukan QRIS:;${summary.totalPemasukanQris}\n`;
  csvContent += `Pemasukan Transfer:;${summary.totalPemasukanTransfer}\n`;
  csvContent += `TOTAL PEMASUKAN HARI INI:;${summary.totalPemasukanHariIni}\n\n`;

  csvContent += `REKAPITULASI POSISI KAS LACI\n`;
  csvContent += `A. Saldo Modal Kas Awal:;${summary.saldoModalAwal}\n`;
  csvContent += `B. Total Pemasukan Tunai:;${summary.totalPemasukanTunai}\n`;
  csvContent += `D. Total Kas Kecil (<250rb):;${summary.totalPengeluaranKasKecil}\n`;
  csvContent += `E. SALDO AKHIR BUKU KAS:;${summary.saldoAkhirBukuKas}\n`;
  csvContent += `F. Total Fisik Laci:;${summary.totalFisikUangLaci}\n`;
  csvContent += `G. Selisih:;${summary.selisihKasir} (${summary.statusSelisih})\n\n`;

  csvContent += `TABEL TRANSAKSI MUTASI\n`;
  csvContent += `NO;WAKTU;NO. BUKTI;KETERANGAN;CHANNEL;KATEGORI;MASUK (RP);KELUAR (RP);PARAF\n`;

  transactions.forEach((tx, idx) => {
    csvContent += `${idx + 1};"${tx.time || ''}";"${tx.receiptNo || ''}";"${tx.description.replace(/"/g, '""')}";"${getTransactionChannel(tx)}";"${tx.category}";${tx.amountIn || 0};${tx.amountOut || 0};"${tx.verified ? 'Verifikasi' : 'Belum'}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Buku_Kas_Snaprint_${AppState.selectedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('File Excel/CSV berhasil diunduh!', 'success');
}

function exportBackupJSON() {
  const payload = {
    appName: 'SNAPRINT_GWISATA_CASH_SYSTEM',
    version: '2026.10',
    exportDate: new Date().toISOString(),
    shopProfile: AppState.shopProfile,
    expenseCategories: AppState.expenseCategories,
    incomeCategories: AppState.incomeCategories,
    denominations: AppState.denominations,
    transactions: AppState.transactions
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Backup_Kas_Snaprint_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  showToast('Cadangan database JSON berhasil diekspor!', 'success');
}

function importBackupJSON(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.transactions && Array.isArray(data.transactions)) {
        AppState.transactions = data.transactions;
        if (data.shopProfile) AppState.shopProfile = data.shopProfile;
        if (data.denominations) AppState.denominations = data.denominations;
        if (data.expenseCategories) AppState.expenseCategories = data.expenseCategories;
        if (data.incomeCategories) AppState.incomeCategories = data.incomeCategories;

        saveTransactionsToStorage();
        saveSettingsToStorage();
        saveDenominationsToStorage();
        saveCategoriesToStorage();

        renderAll();
        showToast('Database berhasil dipulihkan dari file JSON!', 'success');
        closeModal('settingsModal');
      } else {
        showToast('Format file JSON tidak valid.', 'error');
      }
    } catch (err) {
      showToast('Gagal membaca file JSON: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// ==============================================================================
// SETTINGS & PROFILE MANAGEMENT
// ==============================================================================

function openSettingsModal() {
  document.getElementById('setStoreName').value = AppState.shopProfile.name;
  document.getElementById('setStoreTagline').value = AppState.shopProfile.tagline;
  document.getElementById('setStoreAddress').value = AppState.shopProfile.address;
  document.getElementById('setStorePhone').value = AppState.shopProfile.phone;
  document.getElementById('setCashierName').value = AppState.cashier;
  document.getElementById('setSupervisorName').value = AppState.supervisor;
  document.getElementById('setShiftName').value = AppState.shift;
  document.getElementById('setModalAwal').value = AppState.modalAwal;
  document.getElementById('setPettyLimit').value = AppState.shopProfile.pettyCashLimit;
  document.getElementById('setSupervisorPin').value = AppState.shopProfile.supervisorPin;

  openModal('settingsModal');
}

function saveSettingsModal(event) {
  event.preventDefault();

  AppState.shopProfile.name = document.getElementById('setStoreName').value.trim() || DEFAULT_SHOP_PROFILE.name;
  AppState.shopProfile.tagline = document.getElementById('setStoreTagline').value.trim();
  AppState.shopProfile.address = document.getElementById('setStoreAddress').value.trim();
  AppState.shopProfile.phone = document.getElementById('setStorePhone').value.trim();
  
  AppState.cashier = document.getElementById('setCashierName').value.trim() || 'Aninditha Aisya Puteri';
  AppState.supervisor = document.getElementById('setSupervisorName').value.trim() || 'Eki Dwi Saputra';
  AppState.shopProfile.cashierName = AppState.cashier;
  AppState.shopProfile.supervisorName = AppState.supervisor;
  AppState.shift = document.getElementById('setShiftName').value.trim() || 'Shift 1';
  AppState.modalAwal = Number(document.getElementById('setModalAwal').value) || 0;
  AppState.shopProfile.defaultModalAwal = AppState.modalAwal;
  AppState.shopProfile.pettyCashLimit = Number(document.getElementById('setPettyLimit').value) || 250000;
  AppState.shopProfile.supervisorPin = document.getElementById('setSupervisorPin').value.trim() || '2209';

  const headerSelect = document.getElementById('headerPembuatLaporanSelect');
  if (headerSelect) headerSelect.value = AppState.cashier;

  saveSettingsToStorage();
  closeModal('settingsModal');
  renderAll();
  showToast('Pengaturan sistem berhasil disimpan!', 'success');
}

// ==============================================================================
// UTILITY & FORMATTERS
// ==============================================================================

function formatRupiah(num) {
  const val = Number(num) || 0;
  return 'Rp ' + val.toLocaleString('id-ID');
}

function formatNumberOnly(num) {
  const val = Number(num) || 0;
  return val.toLocaleString('id-ID');
}

function formatIndonesianDate(dateStr) {
  if (!dateStr) return '';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const d = new Date(dateStr + 'T00:00:00');
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();

  return `${dayName}, ${day} ${monthName} ${year}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-600 text-white',
    info: 'bg-slate-900 text-white'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  toast.className = `flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Global bootstrap on window load
window.addEventListener('DOMContentLoaded', initApp);
