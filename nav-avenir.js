/*!
 * nav-avenir.js — Avenir Research single-source-of-truth navbar + AUTH module
 * 
 * USAGE di setiap HTML page:
 *   1) Pastikan Supabase library di-load (sebelum atau bareng script ini):
 *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2) Mount point untuk navbar (di awal body):
 *      <div id="avenir-nav-mount"></div>
 *   3) Load script ini (di akhir body atau dengan defer):
 *      <script src="/nav-avenir.js" defer></script>
 *
 * Setelah load, akan tersedia di window:
 *   - window.AUTH       (full auth module)
 *   - window._sb        (Supabase client)
 *   - Event 'avenir:auth-ready' di-fire setelah AUTH.init selesai
 *
 * Hook ke event untuk page-specific logic:
 *   document.addEventListener('avenir:auth-ready', (e) => {
 *     // e.detail = { user, profile }
 *     if (AUTH.hasAccess()) showContent();
 *   });
 *
 * Built from index.html — last updated: see commit / cache-busting version
 */
(function() {
  'use strict';

  // ──────────────── Backward Compat Guard ────────────────
  // Kalau halaman sudah punya inline AUTH module (legacy), skip self-init.
  if (window.AUTH && typeof window.AUTH.init === 'function') {
    console.info('[nav-avenir] AUTH sudah ada (legacy inline navbar) — skip self-init');
    return;
  }
  
  // ──────────────── Wait for Supabase Library ────────────────
  function waitForLib(check, cb, timeoutMs) {
    const start = Date.now();
    (function loop() {
      if (check()) return cb();
      if (Date.now() - start > (timeoutMs || 10000)) {
        console.error('[nav-avenir] Timeout waiting for Supabase library');
        return;
      }
      setTimeout(loop, 50);
    })();
  }
  
  function boot() {
    // Set default body class supaya CSS data-auth rules ada anchor (sebelum AUTH resolve)
    if (document.body && !document.body.classList.contains('auth-state-user') && !document.body.classList.contains('auth-state-guest')) {
      document.body.classList.add('auth-state-guest');
    }
    
    // ──────────────── Inject CSS ────────────────
    const styleEl = document.createElement('style');
    styleEl.id = 'avenir-nav-styles';
    styleEl.textContent = `

/* ═══ Toggle visibility [data-auth] — SELF-CONTAINED approach ═══ */
/* Tidak bergantung CSS residual di file HTML lain.
   Default: SEMUA data-auth elements hidden sampai body class set.
   Setelah AUTH ready, body class trigger SHOW rules.
   Drawer items semua block-level (.mob-link), jadi display:block aman. */

[data-auth="user"], [data-auth="guest"] { display: none !important; }
body.auth-state-user [data-auth="user"] { display: block !important; }
body.auth-state-guest [data-auth="guest"] { display: block !important; }

/* ═══ AVENIR AUTH MODAL ═══ */
.auth-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: none;
  align-items: center; justify-content: center; z-index: 100000; padding: 16px;
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  opacity: 0; transition: opacity .2s;
}
.auth-overlay.open { opacity: 1; }
.auth-box {
  background: #fff; border-radius: 16px; max-width: 440px; width: 100%;
  max-height: 92vh; overflow-y: auto; padding: 30px 26px; position: relative;
  box-shadow: 0 30px 60px rgba(0,0,0,0.25);
}
.auth-close {
  position: absolute; top: 12px; right: 12px; background: transparent; border: none;
  font-size: 20px; cursor: pointer; color: #9ca3af; width: 32px; height: 32px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.auth-close:hover { background: #f3f4f6; color: #111827; }
.auth-view { display: none; }
.auth-view.active { display: block; }
.auth-view h3 {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 24px; font-weight: 600; margin: 0 0 6px; color: #111827;
}
.auth-sub { font-size: 13px; color: #6b7280; margin-bottom: 18px; line-height: 1.6; }
.auth-fg { margin-bottom: 12px; }
.auth-fg label {
  display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .1em;
  color: #6b7280; text-transform: uppercase; margin-bottom: 6px;
}
.auth-fg input, .auth-fg select, .auth-fg textarea {
  width: 100%; padding: 11px 13px; border: 1px solid #e5e7eb; border-radius: 8px;
  font-size: 13.5px; font-family: inherit; box-sizing: border-box;
}
.auth-fg input:focus, .auth-fg select:focus, .auth-fg textarea:focus {
  outline: none; border-color: #1B6B3A; box-shadow: 0 0 0 3px rgba(27,107,58,0.08);
}
.auth-submit {
  width: 100%; padding: 12px; border: none; border-radius: 50px;
  font-size: 13px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  cursor: pointer; font-family: inherit; transition: all .15s; margin-top: 4px;
}
.auth-submit.grn { background: #1B6B3A; color: #fff; }
.auth-submit.grn:hover { background: #155028; }
.auth-submit.gold { background: #854d0e; color: #fff; }
.auth-submit.gold:hover { background: #6b3e0a; }
.auth-sep {
  text-align: center; font-size: 11px; color: #9ca3af; margin: 18px 0 12px;
  letter-spacing: .04em; position: relative;
}
.auth-sep::before, .auth-sep::after {
  content: ''; display: inline-block; width: 30%; height: 1px; background: #e5e7eb;
  vertical-align: middle; margin: 0 8px;
}
.auth-toggle { text-align: center; font-size: 12.5px; color: #6b7280; margin-top: 14px; }
.auth-toggle a { color: #1B6B3A; font-weight: 600; cursor: pointer; text-decoration: underline; }
.auth-err {
  padding: 10px 12px; background: #fef2f2; color: #b91c1c; border-radius: 8px;
  font-size: 12.5px; line-height: 1.5; margin-bottom: 14px; display: none;
}
.auth-success-icon { font-size: 44px; text-align: center; margin-bottom: 14px; }

:root {
  --bg: #F7F5F0; --bg2: #FFFFFF; --bg3: #F0EDE8;
  --grn: #1B6B3A; --grn-d: #155028; --grn-l: #3DAA6E;
  --t: #1a1a1a; --t2: #4b5563; --t3: #9ca3af;
  --bd: #e5e7eb;
}
.nav-global * { box-sizing: border-box; }
/* Pastikan mount div + nav sticky bekerja meskipun ada CSS overflow di parent */
#avenir-nav-mount {
  position: sticky !important;
  top: 0 !important;
  z-index: 500 !important;
}
#avenir-nav-mount .nav-global {
  position: sticky !important;
  top: 0 !important;
  z-index: 500 !important;
}
.nav-mobile-auth { display: none; }
@media (max-width: 820px) {
  .nav-mobile-auth { display: inline-flex !important; align-items: center; }
}
.mob-user-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px;
  background: #f3f4f6; border-radius: 7px; font-size: 12.5px; font-weight: 600;
  color: #374151; text-decoration: none;
}

/* ═══ AVENIR BELL (matches research portal nav style) ═══ */
.nav-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  color: #374151;
  cursor: pointer;
  position: relative;
  padding: 0;
  transition: all .15s;
  font-family: inherit;
  flex-shrink: 0;
}
.nav-bell:hover { color: #1B6B3A; border-color: #1B6B3A; background: rgba(27,107,58,.05); }
.nav-bell:focus { outline: none; }
@media (hover: none) {
  .nav-bell:hover { color: #374151; border-color: #e5e7eb; background: transparent; }
}
.nav-bell svg { display: block; }
.nav-bell-dot {
  position: absolute;
  top: 5px; right: 5px;
  width: 7px; height: 7px;
  background: #ef4444;
  border: 1.5px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(239,68,68,0.55);
  animation: avn-bell-pulse 2.4s infinite;
  pointer-events: none;
}
@keyframes avn-bell-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  50% { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
}
.nav-bell-dot.hidden { display: none; }

.nav-bell-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(380px, calc(100vw - 32px));
  max-height: 480px;
  background: #ffffff;
  color: #18211D;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08);
  overflow: hidden;
  z-index: 1000;
  display: none;
  flex-direction: column;
  text-align: left;
}
.nav-bell-panel.open { display: flex; }
.nav-bell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafaf7;
}
.nav-bell-h-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #18211D;
  text-transform: uppercase;
}
.nav-bell-mark {
  font-size: 11px;
  font-weight: 600;
  color: #1B6B3A;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 6px;
}
.nav-bell-mark:hover { text-decoration: underline; }
.nav-bell-list {
  overflow-y: auto;
  flex: 1;
  max-height: 380px;
}
.nav-bell-item {
  display: block;
  padding: 12px 16px 12px 22px;
  border-bottom: 1px solid #f3f4f1;
  text-decoration: none;
  color: #18211D;
  position: relative;
  transition: background .12s;
}
.nav-bell-item:hover { background: #fafaf7; }
.nav-bell-item:last-child { border-bottom: none; }
.nav-bell-item.unread { background: rgba(27,107,58,0.04); }
.nav-bell-item.unread::before {
  content: "";
  position: absolute;
  left: 10px; top: 50%;
  transform: translateY(-50%);
  width: 6px; height: 6px;
  background: #1B6B3A;
  border-radius: 50%;
}
.nav-bell-cat {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #1B6B3A;
  display: block;
  margin-bottom: 3px;
}
.nav-bell-cat.amber { color: #B85C1A; }
.nav-bell-cat.blue { color: #1A5C9B; }
.nav-bell-cat.grey { color: #6b6b6b; }
.nav-bell-title {
  font-size: 13px;
  font-weight: 600;
  color: #18211D;
  line-height: 1.42;
  margin-bottom: 3px;
}
.nav-bell-date {
  font-size: 10.5px;
  color: #8EA899;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.02em;
}
.nav-bell-empty {
  padding: 36px 24px;
  text-align: center;
  color: #8EA899;
  font-size: 12.5px;
}
.nav-bell-foot {
  padding: 10px 16px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  background: #fafaf7;
}
.nav-bell-foot a {
  font-size: 11px;
  font-weight: 600;
  color: #1B6B3A;
  text-decoration: none;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.nav-bell-foot a:hover { text-decoration: underline; }

@media (max-width: 820px) {
  .nav-bell-wrap {
    position: absolute !important;
    right: 62px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    z-index: 10;
    /* Isolasi: cegah transform mempengaruhi panel fixed */
    /* Panel akan keluar dari nav-bell-wrap via portal trick */
  }
  .nav-bell {
    width: 34px !important;
    height: 34px !important;
  }
  /* Panel keluar dari nav-bell-wrap context: pakai position fixed + override */
  .nav-bell-panel {
    position: fixed !important;
    top: 64px !important;
    right: 12px !important;
    left: 12px !important;
    bottom: auto !important;
    width: auto !important;
    max-width: none !important;
    max-height: calc(100vh - 88px) !important;
    transform: none !important;
  }
}
</style>
  .nav-link { padding:6px 11px; border-radius:6px; text-decoration:none; color:#4b5563; font-size:12.5px; font-weight:600; transition:all .15s; }
  .nav-link:hover { background:#f3f4f6; color:#1B6B3A; }
  .nav-link.active { background:#ecfdf5; color:#1B6B3A; }
  .nav-icon-btn { background:transparent; border:1px solid #e5e7eb; border-radius:7px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; color:#4b5563; }
  .nav-icon-btn:hover { background:#f3f4f6; }
  
  .nav-btn-secondary { padding:6px 13px; background:transparent; border:1px solid #d1d5db; border-radius:7px; font-size:12.5px; font-weight:600; color:#374151; cursor:pointer; font-family:inherit; }
  .nav-btn-secondary:hover { background:#f9fafb; border-color:#1B6B3A; color:#1B6B3A; }
  .nav-btn-primary { padding:6px 13px; background:#1B6B3A; color:#fff; border:none; border-radius:7px; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; }
  .nav-btn-primary:hover { background:#155028; }
  .nav-btn-user { padding:6px 11px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:7px; font-size:12.5px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; font-family:inherit; }
  .user-dd-item { display:flex; gap:10px; align-items:flex-start; padding:11px 14px; text-decoration:none; color:#374151; font-size:12.5px; transition:background .15s; }
  .user-dd-item:hover { background:#f9fafb; }
  .user-dd-icon { font-size:16px; flex-shrink:0; line-height:1.2; }
  .user-dd-item strong { font-weight:600; color:#111827; display:block; margin-bottom:2px; }
  .user-dd-hint { font-size:11px; color:#9ca3af; font-weight:400; }
  .user-dd-logout { display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:11px 14px; background:transparent; border:none; border-top:1px solid #f3f4f6; color:#dc2626; font-size:12.5px; font-weight:600; cursor:pointer; font-family:inherit; }
  .user-dd-logout:hover { background:#fef2f2; }
  .nav-hamburger { display:none; background:transparent; border:1px solid #e5e7eb; border-radius:7px; width:34px; height:34px; align-items:center; justify-content:center; cursor:pointer; color:#374151; }
  .mobile-drawer { display:none; position:absolute; top:54px; left:0; right:0; background:#fff; border-bottom:1px solid #e5e7eb; box-shadow:0 8px 20px rgba(0,0,0,.06); padding:8px 0 14px; max-height:calc(100vh - 54px); overflow-y:auto; z-index:499; }
  .mobile-drawer.open { display:block; }
  .mob-link { display:block; padding:11px 18px; text-decoration:none; color:#374151; font-size:14px; font-weight:600; background:transparent; border:none; width:100%; text-align:left; cursor:pointer; font-family:inherit; }
  .mob-status-hint { display:block; font-size:11.5px; font-weight:500; color:#9ca3af; margin-top:2px; }
  #mob-status-langganan.status-warning .mob-status-hint { color:#854d0e; font-weight:600; }
  #mob-status-langganan.status-urgent { background:#fff7ed; }
  #mob-status-langganan.status-urgent .mob-status-hint { color:#c2410c; font-weight:700; }
  #mob-status-langganan.status-expired { background:#fef2f2; }
  #mob-status-langganan.status-expired .mob-status-hint { color:#b91c1c; font-weight:700; }
  /* Desktop hint juga ikut style supaya konsisten */
  #user-dd-sub-hint.status-warning { color:#854d0e !important; font-weight:600 !important; }
  #user-dd-sub-hint.status-urgent { color:#c2410c !important; font-weight:700 !important; }
  #user-dd-sub-hint.status-expired { color:#b91c1c !important; font-weight:700 !important; }
  .mob-link:hover { background:#f9fafb; color:#1B6B3A; }
  .mob-divider { border-top:1px solid #f3f4f6; margin:6px 14px; }
  .mob-btn-primary-style { background:#1B6B3A !important; color:#fff !important; border-radius:8px !important; margin:6px 18px !important; width:calc(100% - 36px) !important; text-align:center !important; }
  .mob-btn-primary-style:hover { background:#155028 !important; color:#fff !important; }
  .mob-btn-logout-style { color:#dc2626 !important; }
  @media (max-width: 820px) {
    .nav-links-desktop, .nav-right-desktop { display:none !important; }
    .nav-hamburger { 
      display:flex !important;
      position:absolute !important;
      right:18px !important;
      top:50% !important;
      transform:translateY(-50%) !important;
      margin-left:0 !important;
    }
  }
  }`;
    document.head.appendChild(styleEl);
    
    // ──────────────── Render Nav + Modal ────────────────
    // Cari mount point. Kalau tidak ada, buat di awal body.
    let mount = document.getElementById('avenir-nav-mount');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'avenir-nav-mount';
      document.body.insertBefore(mount, document.body.firstChild);
    }
    mount.innerHTML = `<nav class="nav-global" style="position:sticky;top:0;z-index:500;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border-bottom:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.04)">
  <div style="max-width:1280px;margin:0 auto;padding:0 18px;display:flex;align-items:center;height:54px;gap:18px;position:relative">
    <a href="index.html" style="display:flex;align-items:center;text-decoration:none;flex-shrink:0">
      <img data-avlogo="1" src="data:image/png;base64,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" alt="Avenir" style="height:26px;width:auto">
    </a>
    <div class="nav-links-desktop" style="display:flex;gap:2px;flex:1;align-items:center">
      <a href="index.html" class="nav-link">Beranda</a>
      <a href="katalog.html" class="nav-link">Katalog</a>
      <a href="artikel.html" class="nav-link">Artikel</a>
      <a href="news.html" class="nav-link">News</a>
      <a href="tentang.html" class="nav-link">Tentang</a>
      <a href="mitra.html" class="nav-link">Mitra</a>
      <a href="langganan.html" class="nav-link">Langganan</a>
      <a href="dashboard-mitra.html" class="nav-link nav-link-mitra-only" style="display:none">Dashboard Mitra</a>
    </div>
    <div class="nav-right-desktop" style="display:flex;gap:6px;align-items:center;flex-shrink:0">
      <button data-auth="guest" onclick="AUTH.open('login')" class="nav-btn-secondary">Sign In</button>
      <button data-auth="guest" onclick="AUTH.open('register')" class="nav-btn-primary">Daftar</button>
      <div data-auth="user" style="display:none;position:relative" id="user-menu-wrap">
        <button onclick="document.getElementById('user-dropdown').style.display=document.getElementById('user-dropdown').style.display==='block'?'none':'block'" class="nav-btn-user" id="nav-user-name-item">
          👤 <span id="nav-user-name">Akun</span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="user-dropdown" style="display:none;position:absolute;top:100%;right:0;margin-top:6px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.1);min-width:200px;overflow:hidden;z-index:10">
          <a href="pengguna.html" class="user-dd-item">
            <span class="user-dd-icon">👤</span>
            <span><strong>Akun Saya</strong><br><span class="user-dd-hint">Profil &amp; pengaturan</span></span>
          </a>
          <a href="pengguna.html#langganan" class="user-dd-item">
            <span class="user-dd-icon">🎟️</span>
            <span><strong>Status Langganan</strong><br><span class="user-dd-hint" id="user-dd-sub-hint">Cek masa aktif</span></span>
          </a>
          <a onclick="AUTH.open('reset');document.getElementById('user-dropdown').style.display='none'" class="user-dd-item" style="cursor:pointer">
            <span class="user-dd-icon">🔑</span>
            <span><strong>Ganti Password</strong><br><span class="user-dd-hint">Update password akun</span></span>
          </a>
          <a href="dashboard-mitra.html" class="user-dd-item nav-link-mitra-only" style="display:none">
            <span class="user-dd-icon">📊</span>
            <span><strong>Dashboard Mitra</strong><br><span class="user-dd-hint">Performa &amp; earnings</span></span>
          </a>
          <button onclick="AUTH.logout();document.getElementById('user-dropdown').style.display='none'" class="user-dd-logout">Keluar →</button>
        </div>
      </div>
    </div>
    <!-- Mobile auth removed — akses via hamburger drawer -->
    <!-- Notification Bell -->
    <div class="nav-bell-wrap" style="position:relative;display:inline-flex;align-items:center">
      <button class="nav-bell" id="nav-bell-btn" type="button" onclick="AVN_BELL.toggle(event)" aria-label="Notifikasi">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
        <span class="nav-bell-dot" id="nav-bell-dot"></span>
      </button>
      <div class="nav-bell-panel" id="nav-bell-panel" role="dialog" aria-label="Pemberitahuan">
        <div class="nav-bell-header">
          <span class="nav-bell-h-title">Pemberitahuan</span>
          <button class="nav-bell-mark" type="button" onclick="event.stopPropagation();AVN_BELL.markAllRead()">Tandai dibaca</button>
        </div>
        <div class="nav-bell-list" id="nav-bell-list"></div>
        <div class="nav-bell-foot"><a href="news.html">Lihat semua →</a></div>
      </div>
    </div>
    <button class="nav-hamburger" onclick="document.getElementById('mobile-drawer').classList.toggle('open')" aria-label="Menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
  <div id="mobile-drawer" class="mobile-drawer">
    <a href="index.html" class="mob-link">Beranda</a>
    <a href="katalog.html" class="mob-link">Katalog Riset</a>
    <a href="artikel.html" class="mob-link">Artikel</a>
    <a href="news.html" class="mob-link">Market News</a>
    <a href="tentang.html" class="mob-link">Tentang Avenir</a>
    <a href="mitra.html" class="mob-link">Mitra Terverifikasi</a>
    <a href="langganan.html" class="mob-link">Langganan</a>
    <div class="mob-divider"></div>
    
    <!-- Guest state -->
    <button data-auth="guest" onclick="AUTH.open('login');document.getElementById('mobile-drawer').classList.remove('open')" class="mob-link mob-btn-style">Sign In</button>
    <button data-auth="guest" onclick="AUTH.open('register');document.getElementById('mobile-drawer').classList.remove('open')" class="mob-link mob-btn-primary-style">Daftar Gratis</button>
    
    <!-- User logged-in state -->
    <div data-auth="user" style="display:none;padding:8px 16px;font-size:12px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.06em">
      👤 <span id="mob-drawer-name">Akun</span>
    </div>
    <a data-auth="user" style="display:none" href="pengguna.html" class="mob-link">Akun Saya</a>
    <a data-auth="user" style="display:none" href="pengguna.html#langganan" class="mob-link" id="mob-status-langganan">🎟️ Status Langganan <span class="mob-status-hint" id="mob-status-hint">Cek masa aktif</span></a>
    <a data-auth="user" href="dashboard-mitra.html" class="mob-link nav-link-mitra-only" style="display:none">📊 Dashboard Mitra</a>
    <button data-auth="user" style="display:none" onclick="AUTH.logout();document.getElementById('mobile-drawer').classList.remove('open')" class="mob-link mob-btn-logout-style">Keluar →</button>
  </div>
</nav>` + `\n` + `<div class="auth-overlay" id="auth-overlay" style="display:none" onclick="AUTH.closeOutside(event)">
 <div class="auth-box">
  <button class="auth-close" onclick="AUTH.close()">✕</button>

  <!-- LOGIN -->
  <div class="auth-view active" id="auth-login">
   <h3>Selamat Datang</h3>
   <p class="auth-sub">Masuk untuk mengakses riset yang sudah Anda beli</p>
   <div class="auth-err" id="login-err"></div>
   <div class="auth-fg"><label>EMAIL</label><input type="email" id="l-email" placeholder="email@anda.com" autocomplete="email"></div>
   <div class="auth-fg"><label>PASSWORD</label><input type="password" id="l-pass" placeholder="••••••••" autocomplete="current-password"></div>
   <div style="text-align:right;margin:-4px 0 10px"><a onclick="AUTH.show('forgot')" style="font-size:11.5px;color:var(--t2);cursor:pointer;text-decoration:underline">Lupa password?</a></div>
   <button class="auth-submit grn" onclick="AUTH.login()">Masuk →</button>
   <div class="auth-sep">Belum punya akun?</div>
   <button class="auth-submit" style="background:transparent;border:1px solid var(--bd);color:var(--t2);font-weight:600;padding:11px;border-radius:50px;width:100%;cursor:pointer;font-family:inherit" onclick="AUTH.show('register')">Daftar Gratis</button>
   <div style="border-top:1px solid var(--bd);margin:20px 0 14px"></div>
   <div style="text-align:center;font-size:11.5px;color:var(--t3);margin-bottom:10px;letter-spacing:.04em">ANDA ANALIS PROFESIONAL?</div>
   <button class="auth-submit" style="background:#854d0e;color:#fff;border:1px solid #854d0e;padding:11px;border-radius:50px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:100%;cursor:pointer;font-family:inherit;margin-bottom:8px" onclick="AUTH.show('login-mitra')">LOGIN SEBAGAI MITRA →</button>
   <a href="daftar-mitra.html" style="display:block;text-align:center;background:#fef9c3;color:#854d0e;border:1px solid #fde68a;padding:11px;border-radius:50px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-decoration:none;text-transform:uppercase">DAFTAR SEBAGAI MITRA →</a>
  </div>

  <!-- LOGIN MITRA -->
  <div class="auth-view" id="auth-login-mitra">
   <h3 style="color:#854d0e">🟡 Masuk sebagai Mitra</h3>
   <p class="auth-sub">Login khusus untuk Mitra Analis Avenir Research yang sudah terdaftar.</p>
   <div class="auth-err" id="login-mitra-err"></div>
   <div class="auth-fg"><label>EMAIL MITRA</label><input type="email" id="lm-email" placeholder="email@anda.com" autocomplete="email"></div>
   <div class="auth-fg"><label>PASSWORD</label><input type="password" id="lm-pass" placeholder="••••••••" autocomplete="current-password"></div>
   <div style="text-align:right;margin:-4px 0 10px"><a onclick="AUTH.show('forgot')" style="font-size:11.5px;color:#854d0e;cursor:pointer;text-decoration:underline">Lupa password?</a></div>
   <button class="auth-submit" style="background:#854d0e;color:#fff;border:none;padding:12px;border-radius:50px;width:100%;cursor:pointer;font-family:inherit;font-weight:700;letter-spacing:.04em;text-transform:uppercase" onclick="AUTH.loginMitra()">MASUK SEBAGAI MITRA →</button>
   <div class="auth-sep">Belum jadi Mitra?</div>
   <a href="daftar-mitra.html" style="display:block;text-align:center;background:#fef9c3;color:#854d0e;border:1px solid #fde68a;padding:11px;border-radius:50px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-decoration:none;text-transform:uppercase">DAFTAR SEBAGAI MITRA →</a>
   <div class="auth-toggle">Mau login sebagai pengguna? <a onclick="AUTH.show('login')">Login Pengguna</a></div>
  </div>

  <!-- REGISTER -->
  <div class="auth-view" id="auth-register">
   <h3>Buat Akun</h3>
   <p class="auth-sub">Akun baru otomatis mendapat akses penuh selama 7 hari — tanpa kartu kredit, tanpa komitmen.</p>
   <div class="auth-trial-banner">
    <div class="auth-trial-icon">🎁</div>
    <div class="auth-trial-text"><strong>7 Hari Akses Gratis</strong><br><span style="font-size:11px;color:var(--t2)">Mulai aktif segera setelah Anda mengonfirmasi email.</span></div>
   </div>
   <div class="auth-err" id="reg-err"></div>
   <div class="auth-2col">
    <div class="auth-fg"><label>NAMA DEPAN</label><input type="text" id="r-fname" placeholder="Budi"></div>
    <div class="auth-fg"><label>NAMA BELAKANG</label><input type="text" id="r-lname" placeholder="Santoso"></div>
   </div>
   <div class="auth-fg"><label>EMAIL</label><input type="email" id="r-email" placeholder="email@anda.com" autocomplete="email"></div>
   <div class="auth-fg"><label>PASSWORD</label><input type="password" id="r-pass" placeholder="Min. 8 karakter" autocomplete="new-password"></div>
   <div class="auth-fg">
    <label>PROFIL INVESTOR</label>
    <select id="r-profile">
     <option>Investor Individu</option>
     <option>Trader Aktif</option>
     <option>Fund Manager</option>
     <option>Institusi / Perusahaan</option>
    </select>
   </div>
   <button class="auth-submit grn" onclick="AUTH.register()">Daftar Sekarang →</button>
   <div class="auth-toggle">Sudah punya akun? <a onclick="AUTH.show('login')">Masuk</a></div>
   <div style="border-top:1px solid var(--bd);margin:20px 0 14px"></div>
   <div style="text-align:center;font-size:11.5px;color:var(--t3);margin-bottom:10px;letter-spacing:.04em">ANDA ANALIS PROFESIONAL?</div>
   <button class="auth-submit" style="background:#854d0e;color:#fff;border:1px solid #854d0e;padding:11px;border-radius:50px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:100%;cursor:pointer;font-family:inherit;margin-bottom:8px" onclick="AUTH.show('login-mitra')">LOGIN SEBAGAI MITRA →</button>
   <a href="daftar-mitra.html" style="display:block;text-align:center;background:#fef9c3;color:#854d0e;border:1px solid #fde68a;padding:11px;border-radius:50px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-decoration:none;text-transform:uppercase">DAFTAR SEBAGAI MITRA →</a>
  </div>

  <!-- DAFTAR MITRA ANALIS -->
  <div class="auth-view" id="auth-analyst">
   <h3>Pendaftaran Mitra Analis</h3>
   <p class="auth-sub">Kirimkan aplikasi Anda sebagai analis riset freelance Avenir</p>
   <div class="auth-info-box">
    Setiap riset yang diterima akan ditinjau oleh tim editorial kami untuk pemilihan riset yang akan dipublikasikan. Analis mitra mendapatkan <strong>bagi hasil 20%</strong> dari pool subscription, dibagi ke <strong>Top 10 mitra</strong> berdasarkan peringkat views bulanan. (Sisa 80% untuk operasional Avenir: platform, kurasi editorial, marketing & pengembangan)
   </div>
   <div class="auth-err" id="analyst-err"></div>
   <div class="auth-2col">
    <div class="auth-fg"><label>NAMA DEPAN</label><input type="text" id="a-fname" placeholder="Dewi"></div>
    <div class="auth-fg"><label>NAMA BELAKANG</label><input type="text" id="a-lname" placeholder="Kusuma, CFA"></div>
   </div>
   <div class="auth-fg"><label>EMAIL PROFESIONAL</label><input type="email" id="a-email" placeholder="dewi@perusahaan.com"></div>
   <div class="auth-fg"><label>NO. HANDPHONE / WA</label><input type="tel" id="a-phone" placeholder="08xx-xxxx-xxxx"></div>
   <div class="auth-2col">
    <div class="auth-fg">
     <label>SERTIFIKASI UTAMA</label>
     <select id="a-cert">
      <option>CFA Charterholder</option>
      <option>CFA Level 1</option>
      <option>CFA Level 2</option>
      <option>WPPE</option>
      <option>WPEE</option>
      <option>WPMPM</option>
      <option>Lainnya</option>
     </select>
    </div>
    <div class="auth-fg">
     <label>SEKTOR SPESIALISASI</label>
     <select id="a-sector">
      <option>Banking & Finance</option>
      <option>Consumer & Retail</option>
      <option>Energy & Mining</option>
      <option>Technology & Telco</option>
      <option>Healthcare & Pharma</option>
      <option>Infrastruktur & Properti</option>
      <option>Multi-sektor</option>
     </select>
    </div>
   </div>
   <div class="auth-fg">
    <label>INSTITUSI / AFILIASI SAAT INI</label>
    <input type="text" id="a-company" placeholder="Nama perusahaan atau 'Independen'">
   </div>
   <div class="auth-fg">
    <label>LINK CONTOH RISET (Google Drive / Scribd / LinkedIn)</label>
    <input type="url" id="a-portfolio" placeholder="https://...">
   </div>
   <button class="auth-submit gold" onclick="AUTH.submitAnalyst()">Kirim Aplikasi →</button>
   <div class="auth-toggle" style="margin-top:12px;font-size:11px">Tim kami akan menghubungi Anda dalam <strong>5–7 hari kerja</strong></div>
  </div>

  <!-- SUCCESS -->
  <div class="auth-view" id="auth-success">
   <div class="auth-success-icon" id="success-icon">✅</div>
   <h3 style="text-align:center" id="success-title">Berhasil!</h3>
   <p class="auth-sub" style="text-align:center" id="success-msg">Selamat datang di Avenir Research.</p>
   <button class="auth-submit grn" onclick="AUTH.close()">Mulai Jelajahi Riset →</button>
  </div>

  <!-- LUPA PASSWORD: request reset link -->
  <div class="auth-view" id="auth-forgot">
   <h3>Lupa Password?</h3>
   <p class="auth-sub">Masukkan email akun Anda. Kami akan kirim link reset password ke email tersebut.</p>
   <div class="auth-err" id="forgot-err"></div>
   <div class="auth-fg"><label>EMAIL</label><input type="email" id="f-email" placeholder="email@anda.com" autocomplete="email"></div>
   <button class="auth-submit grn" onclick="AUTH.sendResetLink()">Kirim Link Reset →</button>
   <div class="auth-toggle">Ingat password Anda? <a onclick="AUTH.show('login')">Kembali ke Login</a></div>
  </div>

  <!-- RESET PASSWORD: set new password (triggered by recovery link from email) -->
  <div class="auth-view" id="auth-reset">
   <h3>Buat Password Baru</h3>
   <p class="auth-sub">Masukkan password baru Anda. Minimal 8 karakter.</p>
   <div class="auth-err" id="reset-err"></div>
   <div class="auth-fg"><label>PASSWORD BARU</label><input type="password" id="r-pass" placeholder="••••••••" autocomplete="new-password"></div>
   <div class="auth-fg"><label>KONFIRMASI PASSWORD</label><input type="password" id="r-pass2" placeholder="••••••••" autocomplete="new-password"></div>
   <button class="auth-submit grn" onclick="AUTH.resetPassword()">Simpan Password Baru →</button>
  </div>

 </div>
</div>`;
    
    // ──────────────── Init Supabase ────────────────
    const _sb = supabase.createClient('https://wkcqnqtwuxzcjagitkmk.supabase.co', 'sb_publishable_YYtylX5tqzI0Xdy3OrQPgQ_YIXP2zSM');
window._sb = _sb;
    window._sb = _sb;
    
    // ──────────────── AUTH Module ────────────────
    const AUTH = {
  currentUser: null,
  profile: null,

  async init() {
    // ═══ OPTIMISTIC AUTH CHECK ═══
    // Cek localStorage dulu untuk tahu apakah user pernah login.
    // Kalau ada token tersimpan, set body class auth-state-user DULU
    // sebelum getSession() balik — supaya UI tidak flash ke guest state.
    try {
      const keys = Object.keys(localStorage);
      const authKey = keys.find(k => k.startsWith('sb-') && k.includes('-auth-token'));
      if (authKey) {
        const raw = localStorage.getItem(authKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.user) {
            // Optimistic: set user state segera dari localStorage
            AUTH.currentUser = parsed.user;
            document.body.classList.remove('auth-state-guest');
            document.body.classList.add('auth-state-user');
          }
        }
      }
    } catch (e) {}
    
    // Get fresh session dari Supabase (tanpa timeout race yang merusak)
    try {
      const { data: { session } } = await _sb.auth.getSession();
      if (session?.user) {
        AUTH.currentUser = session.user;
        AUTH.refreshUI();
        AUTH.loadProfile().then(() => AUTH.refreshUI()).catch(() => {});
      } else {
        // Session benar-benar kosong → reset ke guest
        AUTH.currentUser = null;
        AUTH.refreshUI();
      }
    } catch (e) {
      console.warn('AUTH init error:', e.message);
      // Kalau error & kita sudah optimistic-set user, biarkan saja
      // sampai onAuthStateChange handle kemudian
      if (!AUTH.currentUser) AUTH.refreshUI();
    }
    
    _sb.auth.onAuthStateChange((event, session) => {
      AUTH.currentUser = session?.user || null;
      // Refresh UI immediately — don't await profile
      AUTH.refreshUI();
      if (AUTH.currentUser) {
        AUTH.loadProfile().then(() => AUTH.refreshUI()).catch(() => {});
      } else {
        AUTH.profile = null;
      }
      // Recovery flow: user klik link reset password di email
      if (event === 'PASSWORD_RECOVERY') {
        // Set flag supaya bisa di-detect kalau user reload
        try { sessionStorage.setItem('avenir_recovery_mode', '1'); } catch(e) {}
        AUTH.open('reset');
      }
      // PKCE flow: kalau user baru SIGNED_IN dan datang dari recovery URL,
      // auto-buka modal reset (Supabase PKCE tidak fire PASSWORD_RECOVERY)
      if (event === 'SIGNED_IN' && session) {
        try {
          const cameFromRecovery = sessionStorage.getItem('avenir_came_from_recovery');
          if (cameFromRecovery === '1') {
            sessionStorage.removeItem('avenir_came_from_recovery');
            sessionStorage.setItem('avenir_recovery_mode', '1');
            setTimeout(() => AUTH.open('reset'), 300);
          }
        } catch(e) {}
      }
    });
    
    // ═══ Recovery hash detection — multi-strategy ═══
    // Supabase recovery link format bisa beragam:
    //   #access_token=...&type=recovery&...
    //   #access_token=...&refresh_token=...&type=recovery
    //   ?code=xxx (PKCE flow - newer Supabase)
    //   ?type=recovery (query string, sangat jarang)
    function _detectRecoveryHash() {
      if (typeof window === 'undefined') return false;
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || 
             search.includes('type=recovery') ||
             (hash.includes('access_token=') && hash.includes('recovery'));
    }
    
    // Detect PKCE recovery: URL berisi ?code=xxx dan baru landing dari email
    function _detectPKCERecovery() {
      if (typeof window === 'undefined') return false;
      const search = window.location.search || '';
      // PKCE recovery: ?code=xxx (Supabase JS exchange ini otomatis)
      return /[?&]code=[a-zA-Z0-9-]+/.test(search);
    }
    
    // SET FLAG: kalau landing dari email recovery (sebelum Supabase exchange code)
    if (_detectRecoveryHash() || _detectPKCERecovery()) {
      try { sessionStorage.setItem('avenir_came_from_recovery', '1'); } catch(e) {}
    }
    
    // Detect expired/error recovery link
    function _detectRecoveryError() {
      if (typeof window === 'undefined') return null;
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const combined = hash + search;
      
      if (combined.includes('error_code=otp_expired') || combined.includes('error=access_denied')) {
        return 'expired';
      }
      if (combined.includes('error=')) {
        return 'other';
      }
      return null;
    }
    
    // Strategy 0: Cek error dulu — link expired/invalid
    const recoveryError = _detectRecoveryError();
    if (recoveryError) {
      // Wait DOM ready
      const _showExpiredError = (retries = 10) => {
        const ov = document.getElementById('auth-overlay');
        if (ov) {
          AUTH.open('forgot');
          setTimeout(() => {
            const msg = recoveryError === 'expired' 
              ? '⚠️ Link reset password sudah expired (berlaku 1 jam). Kirim ulang link baru di bawah.'
              : '⚠️ Link reset password tidak valid. Coba kirim link baru.';
            AUTH.err('forgot-err', msg);
          }, 100);
          // Clean URL setelah 1 detik
          setTimeout(() => {
            if (history.replaceState) {
              history.replaceState(null, '', window.location.pathname);
            }
          }, 1000);
        } else if (retries > 0) {
          setTimeout(() => _showExpiredError(retries - 1), 200);
        }
      };
      _showExpiredError();
    }
    
    // Strategy 1: Cek immediately (recovery hash valid)
    else if (_detectRecoveryHash()) {
      // Wait sampai DOM ready + auth-overlay di-mount
      const _tryOpenReset = (retries = 10) => {
        const ov = document.getElementById('auth-overlay');
        const resetView = document.getElementById('auth-reset');
        if (ov && resetView) {
          AUTH.open('reset');
          // Jangan langsung clear hash — biarkan onAuthStateChange handle session dulu
          // Setelah 2 detik baru clean URL (untuk mencegah link expired keulang refresh)
          setTimeout(() => {
            if (history.replaceState) {
              history.replaceState(null, '', window.location.pathname);
            }
          }, 2000);
        } else if (retries > 0) {
          setTimeout(() => _tryOpenReset(retries - 1), 200);
        }
      };
      _tryOpenReset();
    }
    
    // Strategy 2: Listen for hashchange (kalau Supabase ngubah hash setelah init)
    window.addEventListener('hashchange', () => {
      if (_detectRecoveryHash()) {
        AUTH.open('reset');
      }
    });
    
    // ═══ FIX: re-check session saat tab kembali visible / bfcache / focus ═══
    // Mencegah konten ke-lock lagi setiap pindah halaman atau pindah aplikasi
    async function _recheckSession() {
      try {
        const { data: { session } } = await _sb.auth.getSession();
        const newUser = session?.user || null;
        const changed = (newUser?.id || null) !== (AUTH.currentUser?.id || null);
        AUTH.currentUser = newUser;
        if (changed) {
          AUTH.refreshUI();
          if (newUser) AUTH.loadProfile().then(() => AUTH.refreshUI()).catch(() => {});
          else AUTH.profile = null;
        } else if (newUser && !AUTH.profile) {
          // user ada tapi profile belum loaded — coba load ulang
          AUTH.loadProfile().then(() => AUTH.refreshUI()).catch(() => {});
        }
      } catch (e) {}
    }
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') _recheckSession();
    });
    window.addEventListener('pageshow', function(e) {
      if (e.persisted) _recheckSession();
    });
    window.addEventListener('focus', _recheckSession);
  },

  // Load profile data including trial/subscription dates
  async loadProfile() {
    if (!AUTH.currentUser) { AUTH.profile = null; return; }
    try {
      // Race against timeout (5 detik max) supaya tidak nge-block UI
      const profilePromise = _sb.from('profiles').select('*').eq('id', AUTH.currentUser.id).maybeSingle();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile load timeout')), 5000));
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);
      if (error) {
        console.warn('Profile load error:', error.message);
        AUTH.profile = null;
        return;
      }
      AUTH.profile = data || null;
    } catch (e) {
      console.warn('Profile load failed:', e.message);
      AUTH.profile = null;
    }
  },

  // ─── Subscription Status ──
  // Return true jika user punya akses aktif (trial 7 hari ATAU paid subscription)
  isSubscriptionActive() {
    if (!AUTH.currentUser) return false;
    
    const now = new Date();
    const profile = AUTH.profile || {};
    
    // 0. C1 strict: mitra-only (is_user=false) tidak punya akses subscriber
    if (profile.is_user === false) return false;
    
    // 1. Paid subscription
    if (profile.subscription_until) {
      const until = new Date(profile.subscription_until);
      if (now < until) return true;
    }
    
    // 2. Trial check (durasi grandfathered via _getTrialDurationMs)
    const trialStartRaw = profile.trial_started_at || AUTH.currentUser.created_at;
    if (trialStartRaw) {
      const trialStart = new Date(trialStartRaw);
      const durationMs = AUTH._getTrialDurationMs(trialStartRaw);
      const trialEnd = new Date(trialStart.getTime() + durationMs);
      if (now < trialEnd) return true;
    }
    
    return false;
  },

  // Return status string: 'guest' | 'trial' | 'active' | 'expired_trial' | 'expired_paid'
  getSubscriptionStatus() {
    if (!AUTH.currentUser) return 'guest';
    
    const now = new Date();
    const profile = AUTH.profile || {};
    
    // 0. C1 strict: kalau is_user explicit FALSE → mitra-only (tidak akses katalog/artikel)
    if (profile.is_user === false) return 'mitra_only';
    
    // 1. Paid subscription check
    if (profile.subscription_until) {
      const until = new Date(profile.subscription_until);
      if (now < until) return 'active';
      return 'expired_paid';
    }
    
    // 2. Trial check — fallback ke user.created_at jika kolom trial_started_at belum ada di DB
    const trialStartRaw = profile.trial_started_at || AUTH.currentUser.created_at;
    if (trialStartRaw) {
      const trialStart = new Date(trialStartRaw);
      const durationMs = AUTH._getTrialDurationMs(trialStartRaw);
      const trialEnd = new Date(trialStart.getTime() + durationMs);
      if (now < trialEnd) return 'trial';
      return 'expired_trial';
    }
    
    return 'expired_trial';
  },


  // Trial duration cutoff: user register sebelum tanggal ini = 60 hari trial (grandfathered),
  // user register sesudah = 7 hari trial.
  TRIAL_CUTOFF_DATE: new Date('2026-05-19T01:36:00.000Z'),
  
  // Helper: tentukan trial duration (dalam ms) berdasarkan trial_started_at
  _getTrialDurationMs(trialStartedAt) {
    const trialStart = new Date(trialStartedAt);
    // User register SEBELUM cutoff → grandfathered 60 hari
    if (trialStart < AUTH.TRIAL_CUTOFF_DATE) {
      return 60 * 24 * 60 * 60 * 1000;
    }
    // User register SESUDAH cutoff → 7 hari
    return 7 * 24 * 60 * 60 * 1000;
  },

  // Return remaining trial days (number, can be negative)
  getTrialDaysRemaining() {
    if (!AUTH.profile?.trial_started_at) return null;
    const trialStart = new Date(AUTH.profile.trial_started_at);
    const durationMs = AUTH._getTrialDurationMs(AUTH.profile.trial_started_at);
    const trialEnd = new Date(trialStart.getTime() + durationMs);
    const now = new Date();
    return Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
  },

  // Update semua UI setelah login/logout
  async refreshUI() {
    const user = AUTH.currentUser;

    document.body.classList.toggle('auth-state-user', !!user);
    document.body.classList.toggle('auth-state-guest', !user);
    document.querySelectorAll('[data-auth="guest"], [data-auth="user"]').forEach(el => {
      if (el.style.display === 'none' && !el.dataset.preserveStyle) {
        el.style.removeProperty('display');
      }
    });
    
    if (user) {
      const nama = AUTH.profile?.nama_depan || user.user_metadata?.nama_depan || user.email?.split('@')[0] || 'Akun';
      const nameItem = document.getElementById('nav-user-name-item');
      if (nameItem) nameItem.innerHTML = '👤 <span id="nav-user-name">' + nama + '</span>';
      const mobName = document.getElementById('mob-user-name');
      if (mobName) mobName.textContent = nama;
      const mobDrawerName = document.getElementById('mob-drawer-name');
      if (mobDrawerName) mobDrawerName.textContent = nama;
      const nameSpan = document.getElementById('nav-user-name');
      if (nameSpan) nameSpan.textContent = nama;
    } else {
      const nameItem = document.getElementById('nav-user-name-item');
      if (nameItem) nameItem.innerHTML = '👤 <span id="nav-user-name">Akun</span>';
      const mobName = document.getElementById('mob-user-name');
      if (mobName) mobName.textContent = '';
      const mobDrawerName = document.getElementById('mob-drawer-name');
      if (mobDrawerName) mobDrawerName.textContent = 'Akun';
      const nameSpan = document.getElementById('nav-user-name');
      if (nameSpan) nameSpan.textContent = 'Akun';
      const accGreeting = document.getElementById('acc-greeting');
      if (accGreeting) accGreeting.textContent = 'Pengguna';
      const dashmGreeting = document.getElementById('dashm-greeting');
      if (dashmGreeting) dashmGreeting.textContent = 'Mitra';
      if (typeof NAV !== 'undefined' && NAV.closeDrop) NAV.closeDrop();
      const mobileDrawer = document.getElementById('mobile-drawer');
      if (mobileDrawer) mobileDrawer.classList.remove('open');
    }

    if (user) {
      try {
        const { data } = await _sb.from('unlocked_research').select('ticker').eq('user_id', user.id);
        if (data) localStorage.setItem('ar_unlocked', JSON.stringify(data.map(r => r.ticker)));
      } catch (e) { /* silent */ }
    } else {
      localStorage.removeItem('ar_unlocked');
    }

    if (typeof updateAllButtons === 'function') updateAllButtons();
    if (typeof updateMineFilter === 'function') updateMineFilter();
    
    if (typeof window._applyLock === 'function') window._applyLock();
    if (typeof window._updateSubscriptionStatus === 'function') window._updateSubscriptionStatus();
    
    if (typeof Dashm !== 'undefined') {
      if (!user && typeof Dashm.showNotMitra === 'function') {
        Dashm.showNotMitra();
      } else if (user && typeof Dashm.init === 'function') {
        Dashm.init();
      }
    }
    if (typeof AccPage !== 'undefined') {
      if (!user) {
        const accLoading = document.getElementById('acc-loading');
        const accNotLogged = document.getElementById('acc-not-loggedin');
        const accContent = document.getElementById('acc-content');
        if (accLoading) accLoading.style.display = 'none';
        if (accContent) accContent.style.display = 'none';
        if (accNotLogged) accNotLogged.style.display = 'block';
      } else if (typeof AccPage.init === 'function') {
        AccPage.init();
      }
    }
  },

  // Update nav (alias untuk kompatibilitas)
  updateNav() {
    const user = AUTH.currentUser;
    document.querySelectorAll('[data-auth="guest"]').forEach(el => el.style.display = user ? 'none' : '');
    document.querySelectorAll('[data-auth="user"]').forEach(el => el.style.display = user ? '' : 'none');
    if (user) {
      const nama = user.user_metadata?.nama_depan || user.email?.split('@')[0] || 'Akun';
      const nameItem = document.getElementById('nav-user-name-item');
      if (nameItem) nameItem.textContent = '👤 ' + nama;
    }
  },

  // Buka modal
  open(view) {
    const ov = document.getElementById('auth-overlay');
    if (!ov) return;
    ov.style.display = 'flex';
    ov.classList.add('open');
    AUTH.show(view || 'login');
  },

  // Tutup modal
  close() {
    const ov = document.getElementById('auth-overlay');
    if (ov) {
      ov.classList.remove('open');
      // Tunggu animasi selesai baru hide
      setTimeout(() => { if (!ov.classList.contains('open')) ov.style.display = 'none'; }, 200);
    }
  },

  closeOutside(e) { if (e.target?.id === 'auth-overlay') AUTH.close(); },

  show(viewName) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('auth-' + viewName);
    if (target) target.classList.add('active');
  },

  err(elId, msg, color) {
    const el = document.getElementById(elId);
    if (el) {
      el.textContent = msg;
      el.style.display = msg ? 'block' : 'none';
      el.style.color = color || '#e53e3e';
    }
  },

  // Register
  async register() {
    const fn    = document.getElementById('r-fname')?.value.trim();
    const ln    = document.getElementById('r-lname')?.value.trim();
    const email = document.getElementById('r-email')?.value.trim().toLowerCase();
    const pass  = document.getElementById('r-pass')?.value;
    const profil= document.getElementById('r-profile')?.value;

    AUTH.err('reg-err', '');
    if (!fn || !ln || !email || !pass) return AUTH.err('reg-err', 'Semua field wajib diisi.');
    
    // Email format validation (regex)
    const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_RE.test(email)) {
      return AUTH.err('reg-err', 'Format email tidak valid. Pastikan email lengkap (contoh: nama@gmail.com).');
    }
    
    if (pass.length < 8) return AUTH.err('reg-err', 'Password minimal 8 karakter.');

    AUTH.err('reg-err', 'Mendaftarkan akun...', 'var(--grn)');

    const { data, error } = await _sb.auth.signUp({
      email, password: pass,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: { nama_depan: fn, nama_belakang: ln, profil_investor: profil }
      }
    });

    if (error) return AUTH.err('reg-err', 'Error: ' + error.message);

    if (data.user) {
      try {
        // Race: upsert vs 4s timeout — biar gak hang kalau RLS blokir
        const upsertPromise = _sb.from('profiles').upsert({
          id: data.user.id, nama_depan: fn, nama_belakang: ln, profil_investor: profil,
          trial_started_at: new Date().toISOString(),
          is_user: true
        });
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('upsert timeout')), 4000));
        await Promise.race([upsertPromise, timeout]);
      } catch (e) {
        console.warn('Profile upsert failed (non-critical):', e.message);
      }
    }

    AUTH.show('success');
    document.getElementById('success-title').textContent = 'Pendaftaran Berhasil!';
    document.getElementById('success-msg').textContent =
      'Cek inbox ' + email + ' untuk konfirmasi akun.';
  },

  // Login
  async login() {
    const email = document.getElementById('l-email')?.value.trim();
    const pass  = document.getElementById('l-pass')?.value;

    AUTH.err('login-err', '');
    if (!email || !pass) return AUTH.err('login-err', 'Email dan password wajib diisi.');

    AUTH.err('login-err', 'Masuk...', 'var(--grn)');

    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });

    if (error) {
      const msg = error.message.includes('Email not confirmed')
        ? 'Email belum dikonfirmasi. Cek inbox/spam.'
        : error.message.includes('invalid_credentials') || error.message.includes('Invalid login')
        ? 'Email atau password salah.'
        : 'Error: ' + error.message;
      return AUTH.err('login-err', msg);
    }

    // Login berhasil - tutup modal segera
    AUTH.currentUser = data.user;
    AUTH.close();
    
    // Load profile + refresh UI (async, non-blocking)
    AUTH.loadProfile().then(() => {
      AUTH.refreshUI();
      if (typeof window._applyLock === 'function') window._applyLock();
    }).catch(e => {
      console.warn('Post-login profile load failed:', e.message);
      AUTH.refreshUI();
      if (typeof window._applyLock === 'function') window._applyLock();
    });
  },

  // Kirim link reset password ke email
  async sendResetLink() {
    const email = document.getElementById('f-email')?.value.trim().toLowerCase();
    AUTH.err('forgot-err', '');
    if (!email) return AUTH.err('forgot-err', 'Email wajib diisi.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return AUTH.err('forgot-err', 'Format email tidak valid.');

    AUTH.err('forgot-err', 'Mengirim link reset...', 'var(--grn)');

    // redirectTo: kembali ke origin + hash recovery, supaya hash detection di AUTH.init bisa
    // auto-open view reset password. User wajib whitelist URL ini di Supabase dashboard.
    const redirectTo = window.location.origin + '/#type=recovery';
    const { error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      // Smart error messages
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('429') || msg.includes('over_email_send_rate_limit')) {
        return AUTH.err('forgot-err', 'Terlalu banyak permintaan. Coba lagi dalam 1 jam.');
      }
      if (msg.includes('sending') || msg.includes('smtp') || msg.includes('email service')) {
        return AUTH.err('forgot-err', 'Layanan email sedang bermasalah. Hubungi admin: support@researchavenir.com');
      }
      if (msg.includes('not found') || msg.includes('not exist')) {
        // Tetap tampilkan generic message demi security (jangan bocorin email exists)
        return AUTH.err('forgot-err', '✓ Jika email terdaftar, link reset sudah dikirim. Cek inbox/spam.', 'var(--grn)');
      }
      return AUTH.err('forgot-err', 'Gagal kirim: ' + error.message);
    }

    AUTH.err('forgot-err', '✓ Link reset sudah dikirim ke ' + email + '. Cek inbox/spam (link berlaku 1 jam).', 'var(--grn)');
    const emailInput = document.getElementById('f-email');
    if (emailInput) emailInput.value = '';
  },

  // Simpan password baru setelah klik link recovery
  async resetPassword() {
    const pass  = document.getElementById('r-pass')?.value;
    const pass2 = document.getElementById('r-pass2')?.value;

    AUTH.err('reset-err', '');
    if (!pass || pass.length < 8) return AUTH.err('reset-err', 'Password minimal 8 karakter.');
    if (pass !== pass2) return AUTH.err('reset-err', 'Konfirmasi password tidak cocok.');

    AUTH.err('reset-err', 'Menyimpan password baru...', 'var(--grn)');

    const { error } = await _sb.auth.updateUser({ password: pass });

    if (error) {
      return AUTH.err('reset-err', 'Gagal: ' + error.message);
    }

    // Sukses: bersihkan hash recovery dari URL & redirect ke login
    try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
    try { 
      sessionStorage.removeItem('avenir_recovery_mode');
      sessionStorage.removeItem('avenir_came_from_recovery');
    } catch(e) {}
    AUTH.err('reset-err', '✓ Password berhasil diubah. Anda otomatis login dengan password baru.', 'var(--grn)');
    const r1 = document.getElementById('r-pass'); if (r1) r1.value = '';
    const r2 = document.getElementById('r-pass2'); if (r2) r2.value = '';
    setTimeout(() => { AUTH.close(); }, 1800);
  },

  // Logout
  async loginMitra() {
    const email = document.getElementById('lm-email')?.value.trim();
    const pass = document.getElementById('lm-pass')?.value;
    AUTH.err('login-mitra-err', '');
    if (!email || !pass) return AUTH.err('login-mitra-err', 'Email dan password wajib diisi.');
    
    AUTH.err('login-mitra-err', 'Memverifikasi...', 'var(--grn)');
    
    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) return AUTH.err('login-mitra-err', 'Error: ' + error.message);
    
    AUTH.currentUser = data.user;
    
    // Try fetch profile dengan timeout 10s. Kalau timeout, retry sekali.
    let profileData = null;
    let timedOut = false;
    
    async function tryFetchProfile(timeoutMs) {
      const profilePromise = _sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs));
      const result = await Promise.race([profilePromise, timeoutPromise]);
      return result?.data || null;
    }
    
    try {
      // Attempt 1: 10 detik
      profileData = await tryFetchProfile(10000);
    } catch (e1) {
      timedOut = true;
      try {
        // Attempt 2: retry dengan 8 detik
        AUTH.err('login-mitra-err', 'Koneksi lambat, mencoba lagi...', 'var(--grn)');
        profileData = await tryFetchProfile(8000);
      } catch (e2) {
        // Both failed — kemungkinan koneksi sangat lambat atau RLS issue
        AUTH.err('login-mitra-err', 
          'Verifikasi profil lambat. Cek koneksi internet Anda. <a onclick="AUTH.loginMitra()" style="color:var(--grn);font-weight:700;cursor:pointer;text-decoration:underline">Coba lagi →</a>');
        return;
      }
    }
    
    AUTH.profile = profileData;
    
    if (!AUTH.profile || AUTH.profile.is_mitra !== true) {
      await _sb.auth.signOut();
      AUTH.currentUser = null;
      AUTH.profile = null;
      AUTH.err('login-mitra-err', 
        'Akun ini bukan Mitra. <a onclick="AUTH.show(\'login\')" style="color:var(--grn);font-weight:700;cursor:pointer;text-decoration:underline">Login sebagai Pengguna →</a>');
      return;
    }
    
    AUTH.close();
    AUTH.refreshUI();
    window.location.href = 'dashboard-mitra.html';
  },

  // Helper: aggressive cleanup of residue UI elements after logout
  cleanupAfterLogout() {
    // 1. Force body class — instant, no setTimeout
    document.body.classList.remove('auth-state-user');
    document.body.classList.add('auth-state-guest');
    
    // 2. Reset semua user-displayed elements
    const els = {
      'nav-user-name': 'Akun',
      'nav-user-name-item': null, // special
      'mob-user-name': '',
      'mob-drawer-name': 'Akun',
      'acc-greeting': 'Pengguna',
      'dashm-greeting': 'Mitra'
    };
    Object.keys(els).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'nav-user-name-item') {
        el.innerHTML = '👤 <span id="nav-user-name">Akun</span>';
      } else {
        el.textContent = els[id];
      }
    });
    
    // 3. Hapus inline style.display dari semua [data-auth] elements
    // CSS override final akan handle visibility via body class
    document.querySelectorAll('[data-auth="user"], [data-auth="guest"]').forEach(el => {
      el.style.removeProperty('display');
    });
    
    // 4. Close menus & drawers
    if (typeof NAV !== 'undefined' && NAV.closeDrop) NAV.closeDrop();
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    
    // 5. Close auth modal kalau terbuka
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }
    
    // 6. Page-specific reset
    const accLoading = document.getElementById('acc-loading');
    const accNotLogged = document.getElementById('acc-not-loggedin');
    const accContent = document.getElementById('acc-content');
    if (accLoading) accLoading.style.display = 'none';
    if (accContent) accContent.style.display = 'none';
    if (accNotLogged) accNotLogged.style.display = 'block';
    
    const dashmLoading = document.getElementById('dashm-loading');
    const dashmNotMitra = document.getElementById('dashm-not-mitra');
    const dashmContent = document.getElementById('dashm-content');
    if (dashmLoading) dashmLoading.style.display = 'none';
    if (dashmContent) dashmContent.style.display = 'none';
    if (dashmNotMitra) dashmNotMitra.style.display = 'block';
  },

  async logout() {
    // 1. Sign out from Supabase (ignore errors)
    try { await _sb.auth.signOut(); } catch (e) { console.warn('signOut:', e); }
    
    // 2. Clear ALL AUTH state immediately
    AUTH.currentUser = null;
    AUTH.profile = null;
    
    // 3. Clear localStorage related to user session
    try {
      localStorage.removeItem('ar_unlocked');
      // Defensive: clear Supabase auth tokens
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-') && k.includes('-auth-token')) localStorage.removeItem(k);
      });
    } catch (e) { /* silent */ }
    
    // 4. INSTANT UI cleanup (sebelum refreshUI async) — anti-delay/residue
    if (typeof AUTH.cleanupAfterLogout === 'function') AUTH.cleanupAfterLogout();
    
    // 5. Refresh UI (will set body class via refreshUI logic juga)
    await AUTH.refreshUI();
    
    // 6. Hard reload supaya state page-specific (paywall, member-only content, dll) reset bersih
    setTimeout(() => { window.location.reload(); }, 100);
  },

  // Mitra Analis
  async submitAnalyst() {
    const fn      = document.getElementById('a-fname')?.value.trim();
    const ln      = document.getElementById('a-lname')?.value.trim();
    const email   = document.getElementById('a-email')?.value.trim().toLowerCase();
    const phone   = document.getElementById('a-phone')?.value.trim();
    const cert    = document.getElementById('a-cert')?.value;
    const sector  = document.getElementById('a-sector')?.value;
    const company = document.getElementById('a-company')?.value.trim();
    const porto   = document.getElementById('a-portfolio')?.value.trim();

    AUTH.err('analyst-err', '');
    if (!fn || !ln || !email || !phone) return AUTH.err('analyst-err', 'Nama, email, dan WA wajib diisi.');
    
    // Email format validation
    const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_RE.test(email)) {
      return AUTH.err('analyst-err', 'Format email tidak valid (contoh: nama@perusahaan.com).');
    }

    const { error } = await _sb.from('analyst_applications').insert({
      nama_depan: fn, nama_belakang: ln, email, phone,
      sertifikasi: cert, sektor: sector, institusi: company, portfolio: porto, status: 'pending'
    });

    if (error) return AUTH.err('analyst-err', 'Gagal: ' + error.message);

    AUTH.show('success');
    document.getElementById('success-title').textContent = 'Aplikasi Terkirim!';
    document.getElementById('success-msg').textContent =
      'Tim Avenir akan menghubungi Anda di ' + email + ' dalam 5–7 hari kerja.';
  },

  async unlock(ticker) {
    if (!AUTH.currentUser) return;
    await _sb.from('unlocked_research').upsert(
      { user_id: AUTH.currentUser.id, ticker },
      { onConflict: 'user_id,ticker' }
    );
  }
};

    
    // Expose
    window.AUTH = AUTH;
    
    // ──────────────── Status Updater ────────────────
    /* ═══ STATUS LANGGANAN: update hint text di menu Status Langganan ═══
   Dipanggil setelah AUTH.refreshUI. Update 2 tempat:
   1. Desktop dropdown user menu (#user-dd-sub-hint)
   2. Mobile drawer item (#mob-status-hint)
   Plus toggle CSS class status-warning/urgent/expired untuk highlight visual.
*/
window._updateSubscriptionStatus = function() {
  const hintDesktop = document.getElementById('user-dd-sub-hint');
  const hintMobile  = document.getElementById('mob-status-hint');
  const itemMobile  = document.getElementById('mob-status-langganan');
  if (!hintDesktop && !hintMobile) return;
  
  // Reset state class
  const resetClass = (el) => { if (el) el.classList.remove('status-warning', 'status-urgent', 'status-expired'); };
  resetClass(hintDesktop);
  resetClass(hintMobile);
  resetClass(itemMobile);
  
  // Guest: hint default
  if (typeof AUTH === 'undefined' || !AUTH.currentUser) {
    if (hintDesktop) hintDesktop.textContent = 'Cek masa aktif';
    if (hintMobile)  hintMobile.textContent  = 'Cek masa aktif';
    return;
  }
  
  // Profile belum loaded — coba lagi nanti
  if (!AUTH.profile) {
    setTimeout(() => window._updateSubscriptionStatus(), 500);
    return;
  }
  
  const status = AUTH.getSubscriptionStatus();
  let text, stateClass = null;
  
  if (status === 'active') {
    const until = new Date(AUTH.profile.subscription_until);
    const sisaHari = Math.ceil((until - new Date()) / (24 * 60 * 60 * 1000));
    const tglStr = until.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (sisaHari <= 3) {
      text = '⏰ Habis ' + sisaHari + ' hari lagi';
      stateClass = 'status-urgent';
    } else if (sisaHari <= 7) {
      text = '🔔 Habis dalam ' + sisaHari + ' hari';
      stateClass = 'status-warning';
    } else {
      text = '✓ Aktif sampai ' + tglStr + ' (' + sisaHari + ' hari lagi)';
    }
  } else if (status === 'trial') {
    const trialDays = AUTH.getTrialDaysRemaining();
    if (trialDays === null) {
      text = 'Cek masa aktif';
    } else if (trialDays <= 3) {
      text = '⏰ Trial habis ' + trialDays + ' hari lagi';
      stateClass = 'status-urgent';
    } else if (trialDays <= 7) {
      text = '🔔 Trial habis dalam ' + trialDays + ' hari';
      stateClass = 'status-warning';
    } else {
      text = '🎁 Trial · ' + trialDays + ' hari lagi';
    }
  } else if (status === 'expired_paid') {
    text = '🔒 Langganan habis · Perpanjang';
    stateClass = 'status-expired';
  } else if (status === 'expired_trial') {
    text = '🔒 Trial habis · Berlangganan';
    stateClass = 'status-expired';
  } else if (status === 'mitra_only') {
    text = 'Akun mitra (tidak ada langganan)';
  } else {
    text = 'Cek masa aktif';
  }
  
  if (hintDesktop) hintDesktop.textContent = text;
  if (hintMobile)  hintMobile.textContent  = text;
  if (stateClass) {
    if (hintDesktop) hintDesktop.classList.add(stateClass);
    if (hintMobile)  hintMobile.classList.add(stateClass);
    if (itemMobile)  itemMobile.classList.add(stateClass);
  }
};

// Initial run setelah load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { if (typeof window._updateSubscriptionStatus === 'function') window._updateSubscriptionStatus(); }, 800);
});
    
    // ──────────────── Bell Notification (AVN_BELL) ────────────────
    /* ═══ AVENIR BELL — Fetch from Supabase ═══ */
(function() {
  let items = [];
  const KEY = 'avenir_bell_read';
  
  function monthName(m) {
    return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][m];
  }
  function formatDate(iso) {
    const d = new Date(iso);
    return d.getDate() + ' ' + monthName(d.getMonth()) + ' ' + d.getFullYear();
  }
  function getRead() {
    try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }
  function setRead(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  async function fetchItems() {
    try {
      if (typeof _sb === 'undefined' || !_sb.from) return [];
      const { data, error } = await _sb
        .from('notifications')
        .select('*')
        .order('published_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(10);
      if (error) {
        console.warn('Bell fetch error:', error.message);
        return [];
      }
      return (data || []).map(n => ({
        id: 'notif-' + n.id,
        title: n.title,
        url: n.url,
        cat: n.is_new ? n.category + ' Baru' : n.category,
        catClass: n.is_new ? 'amber' : '',
        date: formatDate(n.published_at)
      }));
    } catch (e) {
      console.warn('Bell fetch exception:', e);
      return [];
    }
  }
  function render() {
    const list = document.getElementById('nav-bell-list');
    const dot = document.getElementById('nav-bell-dot');
    if (!list || !dot) return;
    const read = getRead();
    const unread = items.filter(i => !read.includes(i.id)).length;
    dot.classList.toggle('hidden', unread === 0);
    if (items.length === 0) {
      list.innerHTML = '<div class="nav-bell-empty">Belum ada pemberitahuan.</div>';
      return;
    }
    list.innerHTML = items.map(i => {
      const u = !read.includes(i.id);
      const cc = i.catClass ? ' ' + i.catClass : '';
      return '<a class="nav-bell-item' + (u ? ' unread' : '') + '" href="' + escapeHtml(i.url) + '" onclick="AVN_BELL.markRead(\'' + i.id + '\')">' +
        '<span class="nav-bell-cat' + cc + '">' + escapeHtml(i.cat) + '</span>' +
        '<div class="nav-bell-title">' + escapeHtml(i.title) + '</div>' +
        '<div class="nav-bell-date">' + escapeHtml(i.date) + '</div>' +
        '</a>';
    }).join('');
  }
  function toggle(e) {
    if (e) e.stopPropagation();
    const p = document.getElementById('nav-bell-panel');
    if (!p) return;
    
    // Portal trick: HANYA mobile (≤820px) yang perlu move ke body untuk position:fixed.
    // Desktop pakai position:absolute relative ke nav-bell-wrap, jangan dipindah —
    // kalau dipindah ke body, top:calc(100%+10px) jadi reference body height, panel off-screen.
    const isMobile = window.innerWidth <= 820;
    
    if (!p.classList.contains('open')) {
      if (isMobile) {
        // Buka di mobile: move ke body agar position:fixed bekerja tanpa terpengaruh transform parent
        if (p.parentElement !== document.body) {
          document.body.appendChild(p);
        }
      } else {
        // Buka di desktop: pastikan panel kembali ke nav-bell-wrap (kalau sebelumnya dipindah ke body karena resize)
        const wrap = document.querySelector('.nav-bell-wrap');
        if (wrap && p.parentElement !== wrap) {
          wrap.appendChild(p);
        }
      }
    }
    p.classList.toggle('open');
    if (p.classList.contains('open')) render();
  }
  function markRead(id) {
    const r = getRead();
    if (!r.includes(id)) { r.push(id); setRead(r); }
    setTimeout(render, 60);
  }
  function markAllRead() { setRead(items.map(i => i.id)); render(); }

  document.addEventListener('click', function(e) {
    const panel = document.getElementById('nav-bell-panel');
    const wrap = document.querySelector('.nav-bell-wrap');
    if (!panel || !wrap) return;
    // Cek klik di dalam wrap (bell button) atau panel itu sendiri
    if (panel.classList.contains('open') && !wrap.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  async function init() {
    const panel = document.getElementById('nav-bell-panel');
    if (panel) panel.addEventListener('click', function(e) { e.stopPropagation(); });
    items = await fetchItems();
    render();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.AVN_BELL = { toggle: toggle, markRead: markRead, markAllRead: markAllRead };
})();
    
    // ──────────────── Init AUTH + Fire Event ────────────────
    AUTH.init().then(() => {
      // Update status hint after profile ready
      if (typeof window._updateSubscriptionStatus === 'function') {
        window._updateSubscriptionStatus();
      }
      
      // Fire event untuk page-specific logic
      document.dispatchEvent(new CustomEvent('avenir:auth-ready', {
        detail: { user: AUTH.currentUser, profile: AUTH.profile }
      }));
      
      console.info('[nav-avenir] Initialized. AUTH ready.');
    }).catch(err => {
      console.error('[nav-avenir] AUTH init failed:', err);
      // Fire event anyway supaya page logic tidak hang
      document.dispatchEvent(new CustomEvent('avenir:auth-ready', {
        detail: { user: null, profile: null, error: err }
      }));
    });

  }
  
  // ──────────────── Boot Sequence ────────────────
  function start() {
    waitForLib(
      () => typeof window.supabase !== 'undefined' && window.supabase.createClient,
      boot,
      10000
    );
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
