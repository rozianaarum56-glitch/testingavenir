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
    // ──────────────── Inject CSS ────────────────
    const styleEl = document.createElement('style');
    styleEl.id = 'avenir-nav-styles';
    styleEl.textContent = `
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
      <img data-avlogo="1" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Avenir" style="height:26px;width:auto">
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
          <a href="dashboard-mitra.html" class="user-dd-item nav-link-mitra-only" style="display:none">
            <span class="user-dd-icon">📊</span>
            <span><strong>Dashboard Mitra</strong><br><span class="user-dd-hint">Performa &amp; earnings</span></span>
          </a>
          <button onclick="AUTH.logout();document.getElementById('user-dropdown').style.display='none'" class="user-dd-logout">Keluar →</button>
        </div>
      </div>
    </div>
    <!-- Mobile auth indicator (shown < 820px) -->
    <div class="nav-mobile-auth" data-auth="user" style="display:none">
      <a href="pengguna.html" class="mob-user-chip" id="mob-user-chip">
        <span class="mob-user-icon">👤</span>
        <span id="mob-user-name">Akun</span>
      </a>
    </div>
    <button data-auth="guest" class="nav-mobile-auth nav-mobile-login" onclick="AUTH.open('login')" style="display:none">Masuk</button>
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
   <p class="auth-sub">Akun baru otomatis mendapat akses penuh selama 2 bulan — tanpa kartu kredit, tanpa komitmen.</p>
   <div class="auth-trial-banner">
    <div class="auth-trial-icon">🎁</div>
    <div class="auth-trial-text"><strong>2 Bulan Akses Gratis</strong><br><span style="font-size:11px;color:var(--t2)">Mulai aktif segera setelah Anda mengonfirmasi email.</span></div>
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
        AUTH.open('reset');
      }
    });
    
    // Fallback: deteksi hash recovery manual jika event belum fire
    // (URL example: https://researchavenir.com/#access_token=...&type=recovery)
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      AUTH.open('reset');
    }
    
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
  // Return true jika user punya akses aktif (trial 60 hari ATAU paid subscription)
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
    
    // 2. 60-day trial — fallback ke user.created_at
    const trialStartRaw = profile.trial_started_at || AUTH.currentUser.created_at;
    if (trialStartRaw) {
      const trialStart = new Date(trialStartRaw);
      const trialEnd = new Date(trialStart.getTime() + 60 * 24 * 60 * 60 * 1000);
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
      const trialEnd = new Date(trialStart.getTime() + 60 * 24 * 60 * 60 * 1000);
      if (now < trialEnd) return 'trial';
      return 'expired_trial';
    }
    
    return 'expired_trial';
  },

  // Return remaining trial days (number, can be negative)
  getTrialDaysRemaining() {
    if (!AUTH.profile?.trial_started_at) return null;
    const trialStart = new Date(AUTH.profile.trial_started_at);
    const trialEnd = new Date(trialStart.getTime() + 60 * 24 * 60 * 60 * 1000);
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
    const email = document.getElementById('r-email')?.value.trim();
    const pass  = document.getElementById('r-pass')?.value;
    const profil= document.getElementById('r-profile')?.value;

    AUTH.err('reg-err', '');
    if (!fn || !ln || !email || !pass) return AUTH.err('reg-err', 'Semua field wajib diisi.');
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
    const email = document.getElementById('f-email')?.value.trim();
    AUTH.err('forgot-err', '');
    if (!email) return AUTH.err('forgot-err', 'Email wajib diisi.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return AUTH.err('forgot-err', 'Format email tidak valid.');

    AUTH.err('forgot-err', 'Mengirim link reset...', 'var(--grn)');

    // redirectTo: kembali ke origin + hash recovery, supaya hash detection di AUTH.init bisa
    // auto-open view reset password. User wajib whitelist URL ini di Supabase dashboard.
    const redirectTo = window.location.origin + '/#type=recovery';
    const { error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
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
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
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
  },

  // Mitra Analis
  async submitAnalyst() {
    const fn      = document.getElementById('a-fname')?.value.trim();
    const ln      = document.getElementById('a-lname')?.value.trim();
    const email   = document.getElementById('a-email')?.value.trim();
    const phone   = document.getElementById('a-phone')?.value.trim();
    const cert    = document.getElementById('a-cert')?.value;
    const sector  = document.getElementById('a-sector')?.value;
    const company = document.getElementById('a-company')?.value.trim();
    const porto   = document.getElementById('a-portfolio')?.value.trim();

    AUTH.err('analyst-err', '');
    if (!fn || !ln || !email || !phone) return AUTH.err('analyst-err', 'Nama, email, dan WA wajib diisi.');

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
