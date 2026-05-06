# Avenir Research

## Diagnostic Login Bug
Buka website → F12 → Console tab → coba login.
Console akan show:
- `[DIAG] AUTH ready, _sb ready, modules loaded` ← module load OK
- `[DIAG] AUTH.login() called` ← button click ter-handle
- `[DIAG] email field: ... password field: ...` ← form field readable
- `[DIAG] Connectivity test: OK/FAILED` ← apakah Supabase reachable
- `[DIAG] Login error caught: <error>` ← error sebenarnya
- `TIMEOUT 15 detik — login tidak respons` ← kalau hang lebih dari 15 detik

Screenshot console output kalau masih bermasalah.

## Deploy
Push ke GitHub → Connect Vercel → set Site URL di Supabase Dashboard.
