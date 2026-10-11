-- ==============================================================================
-- SNAPRINT GWISATA - DATABASE BUKU KAS HARIAN TUNAI & KAS KECIL (SOP-FIN-01)
-- Engine: MariaDB / MySQL Relational Database
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `db_snaprint_kas` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `db_snaprint_kas`;

-- 1. TABEL TRANSAKSI MUTASI BUKU KAS
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `time` VARCHAR(10) NOT NULL,
  `receipt_no` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `channel` VARCHAR(32) NOT NULL DEFAULT 'Tunai',
  `type` ENUM('income', 'expense') NOT NULL,
  `is_cash` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_modal` BOOLEAN NOT NULL DEFAULT FALSE,
  `amount_in` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `amount_out` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `verified` BOOLEAN NOT NULL DEFAULT TRUE,
  `shift` VARCHAR(64) DEFAULT 'Shift 1 / Pagi - Sore',
  `cashier` VARCHAR(100) DEFAULT 'Aninditha Aisya Puteri',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tx_date` (`date`),
  INDEX `idx_tx_type` (`type`),
  INDEX `idx_tx_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL REKONSILIASI FISIK UANG LACI (DENOMINASI)
CREATE TABLE IF NOT EXISTS `denominations` (
  `date` DATE NOT NULL PRIMARY KEY,
  `k100k` INT NOT NULL DEFAULT 0,
  `k50k` INT NOT NULL DEFAULT 0,
  `k20k` INT NOT NULL DEFAULT 0,
  `k10k` INT NOT NULL DEFAULT 0,
  `k5k` INT NOT NULL DEFAULT 0,
  `k2k` INT NOT NULL DEFAULT 0,
  `k1k` INT NOT NULL DEFAULT 0,
  `c1000` INT NOT NULL DEFAULT 0,
  `c500` INT NOT NULL DEFAULT 0,
  `c200` INT NOT NULL DEFAULT 0,
  `c100` INT NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL PENGATURAN TOKO & PROFIL
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL KATEGORI MUTASI (PENGELUARAN & PEMASUKAN)
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `type` ENUM('income', 'expense') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `group_name` VARCHAR(100) DEFAULT '',
  `description` TEXT,
  `icon` VARCHAR(64) DEFAULT 'fa-tag',
  `color` VARCHAR(32) DEFAULT 'emerald',
  `is_cash` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
