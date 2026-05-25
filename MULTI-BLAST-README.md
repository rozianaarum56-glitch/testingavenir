# Avenir Research — Multi-Blast Email Roundup

Fitur untuk kirim 1 email berisi 2-5 notifikasi sekaligus (roundup) ke semua subscriber aktif. Mengurangi spam ke subscriber dan hemat quota Resend ketika ada banyak news dalam 1 hari.

---

## 📦 File yang harus di-deploy

1. **`admin.html`** → upload ke Vercel/GitHub (replace yang lama)
2. **`blast-email-edge-function.ts`** → deploy ke Supabase Edge Functions (replace yang lama)

---

## 🚀 Cara Deploy Edge Function

### Option A: Via Supabase Dashboard (Paling Mudah)

1. Buka https://supabase.com/dashboard/project/wkcqnqtwuxzcjagitkmk/functions
2. Cari function `blast-email`, klik **Edit**
3. Replace seluruh isi `index.ts` dengan konten `blast-email-edge-function.ts`
4. Klik **Deploy**
5. Tunggu ~30 detik, lihat status jadi "Active"

### Option B: Via Supabase CLI (untuk yang prefer terminal)

```bash
# Install CLI (kalau belum)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref wkcqnqtwuxzcjagitkmk

# Copy file ke lokasi yang benar
mkdir -p supabase/functions/blast-email
cp blast-email-edge-function.ts supabase/functions/blast-email/index.ts

# Deploy
supabase functions deploy blast-email
```

---

## ✅ Environment Variables yang Harus Ada

Pastikan 4 env vars ini sudah di-set di Supabase → Edge Functions → Settings → Secrets:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | API key dari resend.com (yang lama, tidak berubah) |
| `SUPABASE_URL` | `https://wkcqnqtwuxzcjagitkmk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key dari Supabase API settings |
| `SUPABASE_ANON_KEY` | Anon public key dari Supabase API settings |

**Note**: Kalau `SUPABASE_ANON_KEY` belum ada (versi lama mungkin tidak butuh ini), tambahkan. Bisa dilihat di Supabase Dashboard → Project Settings → API → "Project API keys" → `anon` `public`.

---

## 🎨 Cara Pakai

### Cara Lama (single blast) — tetap berfungsi

1. Login ke admin.html
2. Tab "Notifikasi"
3. Klik tombol **📧 Blast** di kanan baris notifikasi
4. Konfirmasi → email terkirim 1-by-1 sesuai notifikasi

### Cara Baru (multi roundup) — fitur baru

1. Login ke admin.html
2. Tab "Notifikasi"
3. **Centang 2-5 checkbox** di kolom paling kiri baris notifikasi
4. Action bar hijau muncul di atas tabel: "📰 N notifikasi dipilih untuk roundup blast"
5. Klik **📧 Blast Roundup (N)**
6. Konfirmasi → semua subscriber dapat **1 email** berisi semua notifikasi yang dipilih

**Catatan**:
- Maksimum 5 notifikasi per roundup
- Tombol "Pilih Semua" otomatis pilih 5 yang paling baru
- Yang dipilih akan highlight hijau muda
- Setelah blast, semua notifikasi terpilih akan ter-update `email_sent_at` dan `email_sent_count`

---

## 📧 Format Email Roundup

Subject: `📰 Avenir Research — N Update Hari Ini (25 Mei 2026)`

Body: Header hijau Avenir + intro personal + N kartu news/artikel/riset dengan badge kategori dan tombol "Baca Selengkapnya".

Single blast (kalau pilih cuma 1 notifikasi) tetap pakai format email lama yang besar dengan 1 card.

---

## 🧪 Testing

Setelah deploy:

1. **Test single blast** dulu (yang lama) — pastikan masih jalan
2. **Test roundup blast** dengan 2 notifikasi
3. **Test maximum** dengan 5 notifikasi
4. **Test edge case**: kalau pilih 1 doang dari multi-select → fallback ke single blast otomatis
5. **Cek email di inbox subscriber** — pastikan format roundup tampil benar di Gmail, Outlook, mobile

---

## 🐛 Troubleshooting

### "Failed: 500" atau "Invalid session"

→ Cek browser console (F12) untuk detail error
→ Cek Supabase Dashboard → Edge Functions → `blast-email` → Logs
→ Logout-login ulang untuk refresh session token

### Email cuma terkirim ke beberapa subscriber

→ Cek apakah `blast_opt_in` di table `profiles` ada yang `false`
→ Cek apakah ada email format invalid (akan dihitung sebagai "skipped")
→ Cek Resend dashboard untuk rate limit

### Tombol "Blast Roundup" tidak muncul

→ Hard refresh admin.html (Ctrl+Shift+R)
→ Pastikan minimal 1 checkbox dicentang
→ Cek console untuk JS error
