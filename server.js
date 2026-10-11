/**
 * ==============================================================================
 * SNAPRINT GWISATA - SERVER API & DATABASE TERPUSAT (MARIADB / MYSQL)
 * Standar Operasional Prosedur Kasir & Kas Kecil (SOP-FIN-01)
 * ==============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3333;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'db_snaprint_kas',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Memastikan tanggal YYYY-MM-DD dikembalikan sebagai string murni
};

let pool;

try {
  pool = mysql.createPool(DB_CONFIG);
  console.log(`🔌 Database Pool MariaDB terinisialisasi untuk database: ${DB_CONFIG.database}`);
} catch (err) {
  console.error('❌ Gagal inisialisasi pool database:', err.message);
}

// MIME Types untuk Static Files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

// Helper: Parse JSON Body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Format JSON tidak valid: ' + err.message));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Helper: Send JSON Response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Main HTTP Request Handler
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // ============================================================================
  // API ENDPOINTS
  // ============================================================================

  if (pathname.startsWith('/api/')) {
    try {
      // 1. GET /api/status - Health Check
      if (pathname === '/api/status' && req.method === 'GET') {
        const [rows] = await pool.query('SELECT 1 + 1 AS check_val, NOW() AS server_time');
        const [countRes] = await pool.query('SELECT COUNT(*) AS total_tx FROM transactions');
        sendJson(res, 200, {
          status: 'connected',
          database: DB_CONFIG.database,
          engine: 'MariaDB / MySQL',
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          serverTime: rows[0].server_time,
          totalTransactions: countRes[0].total_tx,
          version: '1.0.0-sql-production'
        });
        return;
      }

      // 2. GET /api/transactions - Ambil Daftar Transaksi
      if (pathname === '/api/transactions' && req.method === 'GET') {
        const date = urlObj.searchParams.get('date');
        const startDate = urlObj.searchParams.get('start');
        const endDate = urlObj.searchParams.get('end');

        let query = 'SELECT * FROM transactions';
        const params = [];

        if (date) {
          query += ' WHERE date = ?';
          params.push(date);
        } else if (startDate && endDate) {
          query += ' WHERE date >= ? AND date <= ?';
          params.push(startDate, endDate);
        }

        query += ' ORDER BY date DESC, time DESC, created_at DESC';
        const [rows] = await pool.query(query, params);

        // Transform row agar sesuai struktur frontend (camelCase & boolean)
        const transactions = rows.map(r => ({
          id: r.id,
          date: r.date,
          time: r.time,
          receiptNo: r.receipt_no,
          description: r.description,
          category: r.category,
          channel: r.channel,
          type: r.type,
          isCash: Boolean(r.is_cash),
          isModal: Boolean(r.is_modal),
          amountIn: Number(r.amount_in),
          amountOut: Number(r.amount_out),
          verified: Boolean(r.verified),
          shift: r.shift,
          cashier: r.cashier
        }));

        sendJson(res, 200, { success: true, count: transactions.length, data: transactions });
        return;
      }

      // 3. POST /api/transactions - Tambah Transaksi Satuan (Pemasukan / Pengeluaran)
      if (pathname === '/api/transactions' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.description || (!body.amountIn && !body.amountOut)) {
          sendJson(res, 400, { success: false, message: 'Data transaksi tidak lengkap.' });
          return;
        }

        const id = body.id || `tx-${Date.now()}`;
        const query = `
          INSERT INTO transactions 
          (id, date, time, receipt_no, description, category, channel, type, is_cash, is_modal, amount_in, amount_out, verified, shift, cashier)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          id,
          body.date,
          body.time || '00:00',
          body.receiptNo || 'STR-00',
          body.description,
          body.category || 'Operasional',
          body.channel || (body.isCash ? 'Tunai' : 'Non-Tunai'),
          body.type || (body.amountIn > 0 ? 'income' : 'expense'),
          body.isCash ? 1 : 0,
          body.isModal ? 1 : 0,
          Number(body.amountIn) || 0,
          Number(body.amountOut) || 0,
          body.verified !== false ? 1 : 0,
          body.shift || 'Shift 1',
          body.cashier || 'Kasir'
        ];

        await pool.query(query, params);
        sendJson(res, 201, { success: true, id, message: 'Transaksi berhasil disimpan ke SQL.' });
        return;
      }

      // 4. DELETE /api/transactions/:id - Hapus Transaksi
      if (pathname.startsWith('/api/transactions/') && req.method === 'DELETE') {
        const txId = pathname.replace('/api/transactions/', '');
        const [result] = await pool.query('DELETE FROM transactions WHERE id = ?', [txId]);
        sendJson(res, 200, { success: true, deleted: result.affectedRows > 0 });
        return;
      }

      // 5. POST /api/transactions/set-totals - Atur Total Pemasukan 3 Kanal (Atomic)
      if (pathname === '/api/transactions/set-totals' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { date, tunai, qris, transfer, shift, cashier } = body;

        if (!date) {
          sendJson(res, 400, { success: false, message: 'Tanggal wajib disertakan.' });
          return;
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          // Hapus pemasukan lama non-modal pada tanggal ini
          await conn.query(
            "DELETE FROM transactions WHERE date = ? AND type = 'income' AND is_modal = 0",
            [date]
          );

          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const currentShift = shift || 'Shift 1 / Pagi - Sore';
          const currentCashier = cashier || 'Aninditha Aisya Puteri';

          if (Number(tunai) > 0) {
            await conn.query(
              `INSERT INTO transactions (id, date, time, receipt_no, description, category, channel, type, is_cash, is_modal, amount_in, amount_out, verified, shift, cashier)
               VALUES (?, ?, ?, 'TOT-TUNAI', 'Total Pemasukan Tunai Hari Ini', 'Tunai', 'Tunai', 'income', 1, 0, ?, 0, 1, ?, ?)`,
              [`tx-tot-tunai-${Date.now()}`, date, time, Number(tunai), currentShift, currentCashier]
            );
          }

          if (Number(qris) > 0) {
            await conn.query(
              `INSERT INTO transactions (id, date, time, receipt_no, description, category, channel, type, is_cash, is_modal, amount_in, amount_out, verified, shift, cashier)
               VALUES (?, ?, ?, 'TOT-QRIS', 'Total Pemasukan QRIS Hari Ini', 'QRIS', 'QRIS', 'income', 0, 0, ?, 0, 1, ?, ?)`,
              [`tx-tot-qris-${Date.now() + 1}`, date, time, Number(qris), currentShift, currentCashier]
            );
          }

          if (Number(transfer) > 0) {
            await conn.query(
              `INSERT INTO transactions (id, date, time, receipt_no, description, category, channel, type, is_cash, is_modal, amount_in, amount_out, verified, shift, cashier)
               VALUES (?, ?, ?, 'TOT-TRF', 'Total Pemasukan Transfer Hari Ini', 'Transfer', 'Transfer', 'income', 0, 0, ?, 0, 1, ?, ?)`,
              [`tx-tot-trf-${Date.now() + 2}`, date, time, Number(transfer), currentShift, currentCashier]
            );
          }

          await conn.commit();
          sendJson(res, 200, { success: true, message: 'Total pemasukan 3 saluran berhasil disinkronkan ke SQL.' });
        } catch (txErr) {
          await conn.rollback();
          throw txErr;
        } finally {
          conn.release();
        }
        return;
      }

      // 6. POST /api/transactions/set-modal-awal - Atur Modal Kas Awal
      if (pathname === '/api/transactions/set-modal-awal' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { date, amount, shift, cashier } = body;
        const val = Number(amount) || 0;

        if (!date) {
          sendJson(res, 400, { success: false, message: 'Tanggal wajib disertakan.' });
          return;
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          await conn.query(
            "DELETE FROM transactions WHERE date = ? AND is_modal = 1",
            [date]
          );

          if (val > 0) {
            await conn.query(
              `INSERT INTO transactions (id, date, time, receipt_no, description, category, channel, type, is_cash, is_modal, amount_in, amount_out, verified, shift, cashier)
               VALUES (?, ?, '08:00', 'MODAL-01', 'Modal awal uang receh kasir di laci kas', 'Modal Kerja Kas', 'Tunai', 'income', 1, 1, ?, 0, 1, ?, ?)`,
              [`tx-modal-${Date.now()}`, date, val, shift || 'Shift 1', cashier || 'Aninditha Aisya Puteri']
            );
          }

          await conn.commit();
          sendJson(res, 200, { success: true, message: 'Modal awal berhasil disimpan ke SQL.' });
        } catch (txErr) {
          await conn.rollback();
          throw txErr;
        } finally {
          conn.release();
        }
        return;
      }

      // 7. GET /api/denominations/:date - Ambil Hitungan Fisik Laci
      if (pathname.startsWith('/api/denominations/') && req.method === 'GET') {
        const date = pathname.replace('/api/denominations/', '');
        const [rows] = await pool.query('SELECT * FROM denominations WHERE date = ?', [date]);
        if (rows.length > 0) {
          const r = rows[0];
          sendJson(res, 200, {
            success: true,
            data: {
              k100k: r.k100k,
              k50k: r.k50k,
              k20k: r.k20k,
              k10k: r.k10k,
              k5k: r.k5k,
              k2k: r.k2k,
              k1k: r.k1k,
              c1000: r.c1000,
              c500: r.c500,
              c200: r.c200,
              c100: r.c100
            }
          });
        } else {
          sendJson(res, 200, { success: true, data: null });
        }
        return;
      }

      // 8. POST /api/denominations - Simpan Hitungan Fisik Laci
      if (pathname === '/api/denominations' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { date, counts, total } = body;

        if (!date || !counts) {
          sendJson(res, 400, { success: false, message: 'Data denominasi tidak lengkap.' });
          return;
        }

        const query = `
          INSERT INTO denominations 
          (date, k100k, k50k, k20k, k10k, k5k, k2k, k1k, c1000, c500, c200, c100, total_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            k100k = VALUES(k100k), k50k = VALUES(k50k), k20k = VALUES(k20k), k10k = VALUES(k10k),
            k5k = VALUES(k5k), k2k = VALUES(k2k), k1k = VALUES(k1k),
            c1000 = VALUES(c1000), c500 = VALUES(c500), c200 = VALUES(c200), c100 = VALUES(c100),
            total_amount = VALUES(total_amount)
        `;

        await pool.query(query, [
          date,
          counts.k100k || 0,
          counts.k50k || 0,
          counts.k20k || 0,
          counts.k10k || 0,
          counts.k5k || 0,
          counts.k2k || 0,
          counts.k1k || 0,
          counts.c1000 || 0,
          counts.c500 || 0,
          counts.c200 || 0,
          counts.c100 || 0,
          Number(total) || 0
        ]);

        sendJson(res, 200, { success: true, message: 'Hitungan fisik laci tersimpan di SQL.' });
        return;
      }

      // 9. GET /api/settings - Ambil Pengaturan Toko
      if (pathname === '/api/settings' && req.method === 'GET') {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(r => {
          try {
            settings[r.setting_key] = JSON.parse(r.setting_value);
          } catch (e) {
            settings[r.setting_key] = r.setting_value;
          }
        });
        sendJson(res, 200, { success: true, data: settings });
        return;
      }

      // 10. POST /api/settings - Simpan Pengaturan Toko
      if (pathname === '/api/settings' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        for (const [key, val] of Object.entries(body)) {
          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
            [key, strVal]
          );
        }
        sendJson(res, 200, { success: true, message: 'Pengaturan berhasil disimpan ke SQL.' });
        return;
      }

      // 11. POST /api/sync-from-local - Migrasi / Impor dari LocalStorage
      if (pathname === '/api/sync-from-local' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { transactions, settings, denominations } = body;

        let importedTx = 0;
        if (Array.isArray(transactions) && transactions.length > 0) {
          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();
            for (const tx of transactions) {
              await conn.query(
                `INSERT INTO transactions 
                 (id, date, time, receipt_no, description, category, channel, type, is_cash, is_modal, amount_in, amount_out, verified, shift, cashier)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   date = VALUES(date), time = VALUES(time), receipt_no = VALUES(receipt_no),
                   description = VALUES(description), category = VALUES(category), channel = VALUES(channel),
                   type = VALUES(type), is_cash = VALUES(is_cash), is_modal = VALUES(is_modal),
                   amount_in = VALUES(amount_in), amount_out = VALUES(amount_out), verified = VALUES(verified)`,
                [
                  tx.id, tx.date, tx.time || '00:00', tx.receiptNo || 'STR-00', tx.description,
                  tx.category || 'Operasional', tx.channel || (tx.isCash ? 'Tunai' : 'Non-Tunai'),
                  tx.type, tx.isCash ? 1 : 0, tx.isModal ? 1 : 0,
                  Number(tx.amountIn) || 0, Number(tx.amountOut) || 0,
                  tx.verified !== false ? 1 : 0, tx.shift || 'Shift 1', tx.cashier || 'Kasir'
                ]
              );
              importedTx++;
            }
            await conn.commit();
          } catch (err) {
            await conn.rollback();
            throw err;
          } finally {
            conn.release();
          }
        }

        if (settings) {
          await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
            ['shopProfile', JSON.stringify(settings)]
          );
        }

        sendJson(res, 200, {
          success: true,
          message: `Sinkronisasi selesai! ${importedTx} transaksi masuk ke MariaDB.`,
          importedTransactions: importedTx
        });
        return;
      }

      // Endpoint API tidak ditemukan
      sendJson(res, 404, { success: false, message: 'API Endpoint tidak ditemukan.' });
      return;

    } catch (apiErr) {
      console.error('API Error:', apiErr);
      sendJson(res, 500, { success: false, message: apiErr.message });
      return;
    }
  }

  // ============================================================================
  // STATIC FILE SERVER
  // ============================================================================

  let safePath = pathname;
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  // Mencegah directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Helper: Ambil Alamat IP Lokal untuk Akses Jaringan (WiFi/LAN)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start Server
server.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  console.log('\n================================================================');
  console.log('🚀 SNAPRINT GWISATA - SERVER SQL TERPUSAT TELAH AKTIF!');
  console.log('================================================================');
  console.log(`📡 Komputer Kasir Lokal : http://localhost:${PORT}`);
  console.log(`🌐 Komputer / HP Toko   : http://${localIp}:${PORT}`);
  console.log(`💾 Database Terhubung   : MariaDB / MySQL (${DB_CONFIG.database})`);
  console.log('================================================================\n');
});
