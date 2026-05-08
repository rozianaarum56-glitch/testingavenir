-- ═══════════════════════════════════════════════════════════════
-- AVENIR RESEARCH — TAMBAH FIELD BANK KE PROFILES
-- Run di Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Tambah 3 kolom bank ke tabel profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS rekening_number TEXT,
  ADD COLUMN IF NOT EXISTS rekening_holder TEXT;

-- Verify kolom sudah ditambahkan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('bank_name', 'rekening_number', 'rekening_holder');

-- ═══════════════════════════════════════════════════════════════
-- ADMIN QUERY: View pending mitra dengan info bank lengkap
-- ═══════════════════════════════════════════════════════════════

/*
SELECT 
  id,
  nama_depan || ' ' || nama_belakang AS nama,
  no_hp,
  sertifikasi,
  array_to_string(spesialisasi, ', ') AS sektor,
  link_portfolio,
  bio,
  bank_name AS bank,
  rekening_number AS no_rek,
  rekening_holder AS atas_nama,
  CASE WHEN is_user THEN 'User existing (upgrade)' ELSE 'Mitra-only baru' END AS jenis,
  created_at AT TIME ZONE 'Asia/Jakarta' AS dikirim
FROM profiles 
WHERE is_mitra = FALSE 
  AND sertifikasi IS NOT NULL 
  AND sertifikasi != ''
ORDER BY created_at DESC;
*/

-- ═══════════════════════════════════════════════════════════════
-- ADMIN QUERY: View daftar mitra terverifikasi (untuk halaman public)
-- (Frontend juga query ini secara otomatis)
-- ═══════════════════════════════════════════════════════════════

/*
SELECT 
  nama_depan,
  nama_belakang,
  sertifikasi,
  spesialisasi,
  foto_url
FROM profiles 
WHERE is_mitra = TRUE 
ORDER BY nama_depan;
*/
