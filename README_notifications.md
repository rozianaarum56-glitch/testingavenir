# Avenir Notifications — Auto-Update System ⚡

Setiap kali Anda publish artikel/news/katalog/riset baru, **lonceng di semua halaman akan otomatis update** saat Vercel deploy. Zero manual step.

---

## 🚀 Cara kerja (full auto)

```
1. Anda tulis artikel-saham-xyz-2026.html
2. git commit + push  ───►  Vercel detect change
3. Vercel run: node update-notifications.js (otomatis, dari vercel.json)
4. Script scan folder + regenerate notifications.js
5. Deploy → semua 8 lonceng auto-sync dengan artikel terbaru
```

**Tidak ada step manual.** Tinggal commit & push artikel HTML — selesai.

---

## 📁 File-file relevan

| File | Fungsi |
|------|--------|
| `vercel.json` | Konfigurasi build hook — perintahkan Vercel jalanin script otomatis tiap deploy |
| `update-notifications.js` | Build script yang scan folder + generate notifications.js |
| `notifications.js` | Output script (auto-generated tiap deploy, jangan edit manual) |
| `README_notifications.md` | Dokumentasi ini |

---

## 🔧 Setup awal (sekali aja)

### 1. Upload semua file ke Vercel/GitHub

ZIP yang sudah saya kirim berisi:
- `vercel.json` (build config)
- `update-notifications.js` (build script)
- `notifications.js` (initial data, akan auto-override saat deploy)
- 8 HTML pages yang sudah di-patch untuk read dari notifications.js

Upload SEMUA file ini, replace existing.

### 2. Pastikan Vercel project settings

Vercel akan auto-detect `vercel.json`, jadi tidak perlu konfig manual di dashboard. Tapi cek di **Project Settings → Build & Development Settings**:
- Framework Preset: **Other** (atau biarkan auto)
- Build Command: kosong (akan diambil dari vercel.json)
- Output Directory: kosong (akan diambil dari vercel.json)
- Install Command: kosong

Atau di **Settings → Functions → Node.js Version**: pastikan **Node 18+** (default Vercel sudah ini).

### 3. Deploy

Push ke Git. Vercel akan:
1. Detect `vercel.json` 
2. Run `node update-notifications.js` (scan folder)
3. Generate `notifications.js` baru
4. Deploy seluruh static files
5. Cache `notifications.js` di-set `max-age=0` (selalu fresh)

Selesai.

---

## ✍️ Workflow harian setelah setup

### Publish artikel baru

```bash
# 1. Buat file artikel
touch artikel-bbri-q1-2026.html
# (isi dengan content, pakai TEMPLATE_riset.html sebagai base)

# 2. Pastikan ada meta tag berikut di <head>:
#    <meta property="og:title" content="Judul Artikel Lengkap">
#    <meta property="article:published_time" content="2026-05-20T08:00:00+07:00">

# 3. (Opsional) Update artikel.html / katalog.html untuk tambah card

# 4. Commit & push
git add .
git commit -m "Add: artikel BBRI Q1 2026"
git push

# Vercel akan:
#   - Run update-notifications.js (auto-scan & regenerate notifications.js)
#   - Deploy semua halaman dengan notif terbaru
# Selesai. Lonceng di seluruh site sudah update.
```

---

## 🔍 Cara build script bekerja

`update-notifications.js` melakukan:

1. **Scan folder** untuk file dengan prefix:
   - `artikel-*.html` → kategori "Artikel"
   - `news-*.html` → kategori "Market News" (badge biru)
   - `katalog-*.html` → kategori "Katalog Riset"
   - `riset/*.html` → kategori "Riset Saham"

2. **Extract metadata** dari tiap file:
   - **Title**: dari `<meta property="og:title">` atau `<title>` tag
   - **Date**: dari `<meta property="article:published_time">` (paling reliable) → atau pattern teks "DD Bulan YYYY" → atau file modification time

3. **Filter & sort**:
   - Skip dates yang di future (relatif ke hari ini)
   - Sort by tanggal descending (terbaru di atas)
   - Take top 10 items

4. **Mark "Baru"**:
   - Item paling baru auto-marked badge amber "Baru" KALAU published dalam 7 hari terakhir
   - Lebih dari 7 hari → badge default (hijau/biru sesuai kategori)

5. **Generate `notifications.js`** dengan format yang dibaca semua bell di setiap halaman

---

## 📝 Best practice untuk title/date extraction

Pastikan setiap artikel baru memiliki di `<head>`:

```html
<meta property="og:title" content="Judul Lengkap Artikel">
<meta property="article:published_time" content="2026-05-20T08:00:00+07:00">
```

Kalau dua meta tag ini ada, script 100% pasti pick title & date yang benar. Kalau tidak ada, script akan fallback ke `<title>` tag dan pattern teks — biasanya tetap benar tapi kurang reliable.

---

## 🛠️ Troubleshooting

**Notif tidak update setelah deploy?**
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Cek Vercel deploy log: pastikan "Avenir notifications generator" muncul di build log
- Buka https://your-domain.com/notifications.js langsung di browser — pastikan content terbaru

**Build script error di Vercel?**
- Cek Node version di Vercel project settings (harus ≥18)
- Cek deploy log untuk error message specific
- Fallback: jalanin script local (`node update-notifications.js`) → commit notifications.js manual → push

**Artikel baru tidak muncul di notif?**
- Pastikan filename sesuai pattern: `artikel-*.html` / `news-*.html` / `katalog-*.html`
- Pastikan ada `<meta property="og:title">` dan `<meta property="article:published_time">`
- Cek tanggal: kalau set ke tanggal future, akan di-skip

**Mau revert ke mode manual edit?**
- Hapus `"buildCommand"` line dari `vercel.json`
- Setelah itu, edit `notifications.js` manual sebelum push

---

## ✅ Summary

Setelah deploy ZIP ini:
- Push artikel baru → Vercel auto-update notif → semua lonceng sync
- Zero manual step (kecuali tulis artikel itu sendiri)
- Tidak ada drift antara content dan notifikasi
- Notif paling baru otomatis ter-highlight amber "Baru" kalau ≤ 7 hari
