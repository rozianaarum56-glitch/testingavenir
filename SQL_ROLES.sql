-- Tambah kolom is_user untuk role separation
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_user BOOLEAN DEFAULT TRUE;

-- Backfill: semua user existing yang sudah ada → is_user=TRUE (mereka daftar sebagai user/subscriber)
UPDATE profiles SET is_user = TRUE WHERE is_user IS NULL;
