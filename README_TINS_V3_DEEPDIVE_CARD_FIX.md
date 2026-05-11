# Avenir TINS Deep Dive V3 + Catalog Card Fix

Isi paket:
- `tins.html` — riset PT TIMAH Tbk versi deep dive dengan Avenir Take / analisis Tim Avenir.
- `katalog.html` — katalog updated dengan card TINS yang sudah dipadatkan dan dirapikan agar tidak berantakan.

Deploy cepat:
1. Replace `tins.html` di root repo production.
2. Replace `katalog.html` di root repo production.
3. Deploy ulang via Vercel/GitHub.
4. Buka `/katalog.html`, cek card `PT TIMAH Tbk`, lalu klik `Baca Riset`.

Catatan:
- Gambar di `tins.html` sudah embedded sebagai data URI, tidak perlu folder asset tambahan.
- Tidak perlu SQL ulang.
- Card TINS memakai `data-rid="tins"`, `id="btn-tins"`, dan author tracking internal.
- Inline JavaScript sudah dicek dengan `node --check`.
