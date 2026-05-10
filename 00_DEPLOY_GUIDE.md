# 📋 AVENIR FULL SESSION DEPLOY GUIDE

## File Inventory

### SQL (3 files, deploy in order)
- `01_avenir_admin_upgrade.sql` — Tim exclusion + admin dashboard RPCs (heatmap, top 10, dashboard stats)
- `02_avenir_author_attribution.sql` — Author attribution (research_meta + 16 riset → Tim Avenir)
- `03_avenir_pool_config.sql` — Pool config + earnings calculation (proporsional riset-level, bulanan)

### HTML (17 files)
- `admin.html` — Dashboard upgraded (glassmorphism, charts, heatmap, pool performance, author badges)
- 16 file riset (view exclusion untuk Tim Avenir): ades, asgr, avia, bbri, cmry, dewa, dmas, gfs, mrvl, nisp, part, powr, ptro, pyfa, smar, wifi

---

## Deploy Sequence

### STEP 1 — Deploy SQL (Supabase SQL Editor)

Buka https://supabase.com/dashboard/project/wkcqnqtwuxzcjagitkmk/sql

#### 1A. Run `01_avenir_admin_upgrade.sql`
Buka file → copy seluruh isi → paste di New query → Run

Verify:
```sql
SELECT * FROM public.avenir_team_emails;
SELECT * FROM public.get_admin_dashboard_stats();
```

#### 1B. Run `02_avenir_author_attribution.sql`
New query → paste → Run

Verify:
```sql
SELECT * FROM public.research_meta;
-- Expected: 16 rows, semua author_type='tim_avenir'
```

#### 1C. Run `03_avenir_pool_config.sql` (3 sub-blocks!)
**PENTING**: File ini punya 3 block dipisahkan dengan komentar `═══ BLOCK 2A/2B/2C ═══`. 
Run setiap block di **New query terpisah** untuk avoid syntax parser issue:

- Block 2A: TABLE pool_config + RLS + seed
- Block 2B: RPC get_pool_earnings()
- Block 2C: RPC get_pool_earnings_per_research()

Verify setelah semua jalan:
```sql
SELECT * FROM public.pool_config;
SELECT * FROM public.get_pool_earnings();
SELECT * FROM public.get_pool_earnings_per_research();
```

---

### STEP 2 — Deploy HTML (GitHub)

Replace 17 file di GitHub repo:
- `admin.html`
- 16 file riset

Commit message: `Admin dashboard upgrade + author attribution + pool earnings`

Vercel auto-deploy ~1-2 menit.

---

## Test Setelah Deploy

### A. Test View Exclusion
Login martafikri78@gmail.com → buka `/powr` (atau riset lain) → refresh beberapa kali.

Cek di Supabase:
```sql
SELECT COUNT(*) AS team_views
FROM public.research_views rv
WHERE EXISTS (
  SELECT 1 FROM auth.users u
  JOIN public.avenir_team_emails t ON LOWER(u.email) = LOWER(t.email)
  WHERE u.id = rv.user_id
);
```
Expected: 0 (atau jumlah view sebelum patch — view baru gak masuk).

### B. Test Admin Dashboard
Login admin → buka `/admin` → tab Dashboard.

Yang harus muncul:
- ✅ 6 glassmorphism stat cards (animated counters)
- ✅ Trend Views 30 Hari (line chart)
- ✅ Distribusi User (donut chart)
- ✅ Pool Performance — bulan ini (Tim Avenir card dark green, Pool Earnings: Rp 0)
- ✅ Top 10 Riset dengan author badges (TIM AVENIR hijau)
- ✅ Heatmap Aktivitas (7×24 grid GitHub-style)
- ✅ Quick Insights gradient banner

---

## Operations

### Update Pool Budget Bulanan
```sql
-- Mei 2026 = Rp 10jt
UPDATE public.pool_config 
SET pool_budget_idr = 10000000, updated_at = now() 
WHERE period_year = 2026 AND period_month = 5;
```

### Bulan Baru (mis. Juni 2026)
```sql
INSERT INTO public.pool_config (period_year, period_month, pool_budget_idr) 
VALUES (2026, 6, 15000000)
ON CONFLICT (period_year, period_month) DO UPDATE 
SET pool_budget_idr = EXCLUDED.pool_budget_idr;
```

### Tambah Email Tim Avenir
```sql
INSERT INTO public.avenir_team_emails (email, note) 
VALUES ('email@example.com', 'Tim Avenir')
ON CONFLICT DO NOTHING;
```

### Tambah Riset Baru dari Mitra
```sql
-- Cari UUID mitra
SELECT id, nama_depan, nama_belakang FROM public.profiles WHERE is_mitra = true;

-- Insert metadata
INSERT INTO public.research_meta (research_id, ticker, title, author_type, author_id, author_display_name) 
VALUES (
  'goto', 'GOTO', 'PT GoTo Gojek Tokopedia Tbk',
  'mitra', '<paste-uuid>', 'Nama Mitra'
);
```

### Audit Detail Earnings per Riset
```sql
SELECT * FROM public.get_pool_earnings_per_research();
```
