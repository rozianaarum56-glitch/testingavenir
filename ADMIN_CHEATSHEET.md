# 🛠 Avenir Research — Admin Cheatsheet

Run di **Supabase Dashboard → SQL Editor**

## 1️⃣ Setup RLS (jalankan SEKALI di awal)
File `SQL_MITRA_FIX.sql` — copy-paste seluruh isinya.

---

## 2️⃣ Daily Monitoring: Lihat Mitra Applicants

```sql
-- Pending applications (belum di-approve)
SELECT 
  id,
  nama_depan || ' ' || nama_belakang AS nama,
  no_hp,
  sertifikasi,
  array_to_string(spesialisasi, ', ') AS sektor,
  link_portfolio,
  bio,
  CASE WHEN is_user THEN 'User existing (upgrade)' ELSE 'Mitra-only baru' END AS jenis,
  created_at AT TIME ZONE 'Asia/Jakarta' AS dikirim
FROM profiles 
WHERE is_mitra = FALSE 
  AND sertifikasi IS NOT NULL 
  AND sertifikasi != ''
ORDER BY created_at DESC;
```

---

## 3️⃣ Approve Mitra

```sql
-- Ganti UUID dengan id dari query di atas
UPDATE profiles 
SET is_mitra = TRUE 
WHERE id = 'PASTE-USER-UUID-HERE';
```

Setelah approve, user akan otomatis lihat link "Dashboard Mitra" di navbar saat login.

---

## 4️⃣ Reject Mitra (akun tetap aktif sebagai user biasa)

```sql
-- Hapus data mitra-nya, biarkan akun tetap aktif
UPDATE profiles 
SET sertifikasi = NULL,
    bio = NULL,
    spesialisasi = NULL,
    link_portfolio = NULL,
    no_hp = NULL,
    is_user = TRUE  -- pastikan tetap akses sebagai user
WHERE id = 'PASTE-USER-UUID-HERE';
```

---

## 5️⃣ Cek Mitra yang Sudah Aktif

```sql
SELECT 
  nama_depan || ' ' || nama_belakang AS nama,
  no_hp,
  sertifikasi,
  array_to_string(spesialisasi, ', ') AS sektor,
  link_portfolio
FROM profiles 
WHERE is_mitra = TRUE
ORDER BY nama_depan;
```

---

## 6️⃣ Statistics Dashboard

```sql
-- Quick stats
SELECT 
  COUNT(*) FILTER (WHERE is_user = TRUE) AS total_user_subscriber,
  COUNT(*) FILTER (WHERE is_mitra = TRUE) AS total_mitra_aktif,
  COUNT(*) FILTER (WHERE is_mitra = FALSE AND sertifikasi IS NOT NULL) AS pending_mitra_apply,
  COUNT(*) FILTER (WHERE is_user = FALSE AND is_mitra = FALSE) AS mitra_only_pending
FROM profiles;

-- Total views per riset bulan ini  
SELECT 
  rm.title,
  COUNT(rv.id) AS views_bulan_ini
FROM research_meta rm
LEFT JOIN research_views rv 
  ON rv.research_id = rm.research_id 
  AND rv.viewed_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY rm.research_id, rm.title
ORDER BY views_bulan_ini DESC;
```

---

## 7️⃣ Notifikasi Manual ke Applicant

Saat bang approve atau reject, bang perlu **manually email/WhatsApp** ke applicant pakai data dari query #2.

Template email approve:
> Halo [Nama],
> 
> Selamat! Aplikasi Anda sebagai Mitra Analis Avenir Research telah disetujui. 
> Silakan login ke avenirresearch.app — Anda akan otomatis melihat menu "Dashboard Mitra" di navbar.
> 
> Tracking ID Anda: [tracking ID dari user]

Template email reject:
> Halo [Nama],
> 
> Terima kasih telah submit aplikasi sebagai Mitra Analis. Sayangnya saat ini aplikasi Anda belum dapat kami terima karena [alasan].
> 
> Akun Anda di avenirresearch.app tetap aktif sebagai pengguna — Anda tetap dapat akses katalog riset dengan trial 60 hari.
