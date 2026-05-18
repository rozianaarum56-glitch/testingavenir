# Avenir Research — Email Blast Setup Guide

Panduan setup fitur "Blast Email" dari admin dashboard. Total waktu: ~30 menit.

---

## Step 1 — Setup Resend Account (5 menit)

1. Daftar di **https://resend.com** (gratis, no kartu kredit)
2. Pilih plan: untuk 100-3.000 subscriber per blast, gunakan **Pro $20/bulan** (50.000 email/bulan)
   - Note: free tier hanya 3.000 email/bulan total, dan hanya bisa kirim ke email Anda sendiri sebelum verified domain
3. Verifikasi email Anda

---

## Step 2 — Setup Custom Domain di Resend (15 menit)

### A. Tambah domain di Resend Dashboard

1. Login Resend → **Domains** → **Add Domain**
2. Masukkan domain Anda: `avenirfortuna.com` (atau subdomain `mail.avenirfortuna.com`)
3. Pilih region: **AP Northeast (Tokyo)** untuk latency optimal dari Indonesia
4. Resend akan kasih beberapa DNS records (MX, SPF, DKIM, DMARC)

### B. Tambah DNS records di registrar domain Anda

Login ke registrar domain Anda (Niagahoster / Domainesia / Cloudflare / dll), masuk ke DNS settings, tambahkan records sesuai instruksi Resend:

| Type   | Name           | Value                                |
|--------|----------------|--------------------------------------|
| MX     | send           | feedback-smtp.ap-northeast-1.amazonses.com (priority 10) |
| TXT    | send           | "v=spf1 include:amazonses.com ~all"   |
| TXT    | resend._domainkey | (DKIM public key dari Resend)     |
| TXT    | _dmarc         | "v=DMARC1; p=none;"                   |

**Catatan penting:**
- DNS propagation butuh 5-30 menit (kadang sampai 24 jam)
- Setelah propagate, klik **"Verify"** di Resend dashboard
- Pastikan status semua records jadi ✅ Verified

### C. Dapatkan API Key

1. Resend dashboard → **API Keys** → **Create API Key**
2. Permission: **Sending access** → All domains
3. Copy key (format `re_xxxxxx...`) — **simpan baik-baik, hanya muncul sekali**

---

## Step 3 — Update Database Schema (2 menit)

Buka Supabase Dashboard → SQL Editor → run query ini untuk tambah kolom email tracking:

```sql
-- Tambah kolom email tracking ke notifications
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notifications_email_sent ON notifications(email_sent_at);
```

---

## Step 4 — Deploy Supabase Edge Function (5 menit)

### A. Install Supabase CLI (kalau belum ada)

```bash
# Mac/Linux
brew install supabase/tap/supabase

# Windows (via scoop)
scoop install supabase

# atau via npm (semua OS)
npm install -g supabase
```

### B. Login & link project

```bash
# Di terminal, navigasi ke folder project Anda
cd path/to/avenir-portal

# Login Supabase
supabase login

# Link ke project Anda (ID project Anda: wkcqnqtwuxzcjagitkmk)
supabase link --project-ref wkcqnqtwuxzcjagitkmk
```

### C. Set environment variables (secrets)

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Set base URL site
supabase secrets set SITE_BASE_URL=https://researchavenir.com
```

**Note:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` sudah auto-tersedia di Edge Function — tidak perlu di-set manual.

### D. Deploy function

```bash
# Pastikan file ada di: supabase/functions/blast-email/index.ts
supabase functions deploy blast-email
```

Output sukses:
```
Deployed Functions on project wkcqnqtwuxzcjagitkmk: blast-email
You can inspect your deployment in the Dashboard: 
https://supabase.com/dashboard/project/wkcqnqtwuxzcjagitkmk/functions
```

---

## Step 5 — Test Blast Email

1. Login admin dashboard: `https://researchavenir.com/admin`
2. Klik tab **🔔 Notifikasi**
3. Tambah satu notifikasi test (pilih artikel dari dropdown → Simpan)
4. Klik tombol **📧 Blast** di row tersebut
5. Konfirmasi → tunggu beberapa detik
6. Cek inbox Anda — harus dapat email branded Avenir

---

## Troubleshooting

### Error: "Forbidden: not admin"
- Pastikan email login Supabase Anda = `martafikri78@gmail.com` (di-hardcode di Edge Function)

### Error: "Domain not verified" dari Resend
- Cek DNS records sudah propagate: https://mxtoolbox.com/SuperTool.aspx
- Verifikasi ulang di Resend Dashboard → Domains

### Email masuk Spam folder
- Pastikan DKIM dan DMARC sudah configured (Step 2)
- Hindari kata-kata spam di subject (mis. "FREE", "URGENT", excessive emoji)
- Warm up domain: kirim sedikit-sedikit dulu sebelum blast 1000+ sekaligus

### Edge Function timeout (lebih dari 30 detik)
- Resend batch API limit 100/request — kalau subscriber > 1000, function split otomatis
- Kalau masih timeout, edit `BATCH_SIZE` di `index.ts` jadi lebih kecil (50)

### Cek log Edge Function
```bash
supabase functions logs blast-email --tail
```

---

## Cara Kerja Singkat

1. Admin klik **📧 Blast** di admin.html
2. Browser POST ke Supabase Edge Function `/functions/v1/blast-email` dengan auth token
3. Edge Function verify admin email = `martafikri78@gmail.com`
4. Query `notifications` table untuk dapat detail artikel
5. Query `profiles` + `auth.users` untuk dapat email subscriber aktif (`is_user=true` OR `subscription_until > now()`)
6. Generate HTML email branded (logo Avenir, hero card, CTA, footer)
7. Kirim via Resend Batch API (max 100/request)
8. Update `notifications.email_sent_at` + `email_sent_count`
9. Return hasil → admin lihat alert "Berhasil X dari Y"

---

## Cost Breakdown (estimasi bulanan)

| Item | Free Tier | Paid (kalau perlu) |
|---|---|---|
| Supabase | 500 MB DB, 2 GB transfer | Pro $25/bln |
| Resend | 3.000 email/bln | Pro $20/bln (50K email) |
| Vercel | Hobby gratis | Pro $20/bln |

**Untuk 3.000 subscriber × 4 blast/bulan = 12.000 email/bulan → perlu Resend Pro ($20/bln)**

---

## File Reference

- Edge Function: `supabase/functions/blast-email/index.ts`
- Admin UI: `admin.html` (tab Notifikasi, tombol Blast)
- Database: Supabase table `notifications` + kolom `email_sent_at`, `email_sent_count`
