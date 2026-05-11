# Avenir TINS Table Cards Mobile Fix

Patch ini memperbaiki tabel naratif di halaman TINS agar tidak dempet di mobile.

Bagian yang terdampak:
- Financial Quality — Memisahkan Earnings Shock dari Earnings Power
- Avenir Valuation Take — Multiple Rendah Bisa Value Trap Jika Siklus Berbalik
- Tabel makro yang memakai class `.powr-table`

Perubahan:
- Desktop tetap tampil sebagai tabel POWR-style dengan border/header jelas.
- Mobile/tablet berubah menjadi row-card dengan label kolom di kiri, sehingga tidak perlu membaca kolom sempit yang dempet.
- Data dan copywriting tidak diubah.

Deploy cepat: replace `tins.html` lama di root repo dengan file ini.
