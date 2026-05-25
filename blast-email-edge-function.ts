// supabase/functions/blast-email/index.ts
// Avenir Research — Email Blast Edge Function v2 (Multi-Roundup Support)
// Last updated: 2026-05-25

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM_EMAIL = "Avenir Research <noreply@researchavenir.com>";
const SITE_URL = "https://researchavenir.com";

// Email validation regex (same as nav-avenir.js)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Max notifications per roundup
const MAX_ROUNDUP = 5;

// ─────────────────────────────────────────────────────
// Category styling helper
// ─────────────────────────────────────────────────────
function getCategoryStyle(category: string) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    "News":     { bg: "#fef3c7", color: "#92400e", label: "NEWS" },
    "Artikel":  { bg: "#dbeafe", color: "#1e40af", label: "ARTIKEL" },
    "Riset":    { bg: "#dcfce7", color: "#15803d", label: "RISET" },
  };
  return styles[category] || { bg: "#f1f5f9", color: "#475569", label: category.toUpperCase() };
}

// Format date Indonesian
function formatDateID(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const d = new Date(iso);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────
// HTML template — SINGLE news email
// ─────────────────────────────────────────────────────
function renderSingleEmail(notification: any, subscriberName: string): string {
  const catStyle = getCategoryStyle(notification.category);
  const dateStr = formatDateID(notification.published_at);
  const fullUrl = notification.url.startsWith("http") 
    ? notification.url 
    : `${SITE_URL}/${notification.url}`;
  
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(notification.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:Inter,Arial,sans-serif;color:#1f2937">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <!-- Header -->
  <div style="text-align:center;padding:24px 0 32px">
    <div style="font-family:Georgia,serif;font-size:26px;color:#1B6B3A;font-weight:700;letter-spacing:-.5px">Avenir Research</div>
    <div style="font-size:11px;color:#94a3b8;letter-spacing:.2em;margin-top:4px;text-transform:uppercase">Equity Research · Indonesia</div>
  </div>
  
  <!-- Main card -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:32px 28px;margin-bottom:20px">
    <div style="margin-bottom:16px">
      <span style="display:inline-block;padding:4px 12px;border-radius:12px;background:${catStyle.bg};color:${catStyle.color};font-size:11px;font-weight:700;letter-spacing:.1em">${catStyle.label}</span>
      <span style="font-size:12px;color:#94a3b8;margin-left:8px">${dateStr}</span>
    </div>
    
    <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.25;color:#0f172a;margin:0 0 20px;font-weight:600">${escapeHtml(notification.title)}</h1>
    
    <div style="margin:24px 0">
      <a href="${fullUrl}" style="display:inline-block;background:#1B6B3A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:.02em">Baca Selengkapnya →</a>
    </div>
    
    <div style="font-size:13px;color:#64748b;line-height:1.6;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:24px">
      Halo ${escapeHtml(subscriberName)}, ini update terbaru di Avenir Research. Pastikan Anda login dengan email yang terdaftar untuk akses penuh.
    </div>
  </div>
  
  ${renderFooter()}
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────
// HTML template — ROUNDUP email (multiple news)
// ─────────────────────────────────────────────────────
function renderRoundupEmail(notifications: any[], subscriberName: string): string {
  const today = formatDateID(new Date().toISOString());
  const count = notifications.length;
  
  const cardsHtml = notifications.map((n, idx) => {
    const catStyle = getCategoryStyle(n.category);
    const dateStr = formatDateID(n.published_at);
    const fullUrl = n.url.startsWith("http") ? n.url : `${SITE_URL}/${n.url}`;
    
    return `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 22px;margin-bottom:14px">
      <div style="margin-bottom:12px">
        <span style="display:inline-block;padding:3px 10px;border-radius:10px;background:${catStyle.bg};color:${catStyle.color};font-size:10px;font-weight:700;letter-spacing:.1em">${catStyle.label}</span>
        <span style="font-size:11px;color:#94a3b8;margin-left:8px">${dateStr}</span>
        <span style="font-size:11px;color:#cbd5e1;margin-left:8px">#${idx + 1}</span>
      </div>
      <h2 style="font-family:Georgia,serif;font-size:19px;line-height:1.3;color:#0f172a;margin:0 0 14px;font-weight:600">${escapeHtml(n.title)}</h2>
      <a href="${fullUrl}" style="display:inline-block;background:#1B6B3A;color:#fff;text-decoration:none;padding:9px 18px;border-radius:7px;font-weight:600;font-size:13px;letter-spacing:.02em">Baca Selengkapnya →</a>
    </div>`;
  }).join("");
  
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Avenir Research — ${count} Update Hari Ini</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:Inter,Arial,sans-serif;color:#1f2937">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <!-- Header -->
  <div style="text-align:center;padding:24px 0 28px">
    <div style="font-family:Georgia,serif;font-size:26px;color:#1B6B3A;font-weight:700;letter-spacing:-.5px">Avenir Research</div>
    <div style="font-size:11px;color:#94a3b8;letter-spacing:.2em;margin-top:4px;text-transform:uppercase">Equity Research · Indonesia</div>
  </div>
  
  <!-- Roundup intro -->
  <div style="background:linear-gradient(135deg,#1B6B3A,#15803d);border-radius:14px;padding:28px 24px;margin-bottom:20px;color:#fff">
    <div style="font-size:11px;letter-spacing:.2em;opacity:.85;text-transform:uppercase;margin-bottom:6px">📰 Daily Roundup</div>
    <h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.2;margin:0 0 12px;font-weight:600">${count} Update Hari Ini</h1>
    <div style="font-size:14px;opacity:.92;line-height:1.55">Halo ${escapeHtml(subscriberName)}, berikut rangkuman ${count} publikasi terbaru di Avenir Research per ${today}.</div>
  </div>
  
  <!-- News cards -->
  ${cardsHtml}
  
  <!-- CTA -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 22px;margin:20px 0;text-align:center">
    <div style="font-size:13px;color:#64748b;line-height:1.6">
      Akses semua publikasi terbaru di <a href="${SITE_URL}" style="color:#1B6B3A;font-weight:600;text-decoration:none">researchavenir.com</a>
    </div>
  </div>
  
  ${renderFooter()}
</div>
</body>
</html>`;
}

// Shared footer
function renderFooter(): string {
  return `
  <div style="text-align:center;padding:24px 16px 16px;font-size:11px;color:#94a3b8;line-height:1.7">
    <div style="margin-bottom:6px"><strong style="color:#64748b">PT Avenir Fortuna Corporindo</strong></div>
    <div>IDX Tower, Jakarta · <a href="${SITE_URL}" style="color:#1B6B3A;text-decoration:none">researchavenir.com</a></div>
    <div style="margin-top:10px;font-style:italic;color:#cbd5e1">Riset bersifat informatif &amp; edukatif — bukan rekomendasi investasi.</div>
  </div>`;
}

// HTML escape helper
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  
  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Missing Authorization header" }, 401);
    }
    
    // Init Supabase clients
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Verify user is admin
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return jsonResp({ error: "Invalid session" }, 401);
    }
    
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    
    if (!profile?.is_admin) {
      return jsonResp({ error: "Forbidden: admin only" }, 403);
    }
    
    // Parse request body
    const body = await req.json();
    let notificationIds: number[] = [];
    
    // Support 2 modes: single (notification_id) and multi (notification_ids)
    if (body.notification_ids && Array.isArray(body.notification_ids)) {
      notificationIds = body.notification_ids.slice(0, MAX_ROUNDUP);
    } else if (body.notification_id) {
      notificationIds = [body.notification_id];
    } else {
      return jsonResp({ error: "Missing notification_id or notification_ids" }, 400);
    }
    
    if (notificationIds.length === 0) {
      return jsonResp({ error: "Empty notification list" }, 400);
    }
    
    const isRoundup = notificationIds.length > 1;
    
    // Fetch notifications (preserve order from input)
    const { data: notifsRaw, error: notifErr } = await adminClient
      .from("notifications")
      .select("*")
      .in("id", notificationIds);
    
    if (notifErr || !notifsRaw || notifsRaw.length === 0) {
      return jsonResp({ error: "Notifications not found" }, 404);
    }
    
    // Re-order to match input
    const notifs = notificationIds
      .map(id => notifsRaw.find(n => n.id === id))
      .filter(Boolean) as any[];
    
    // Fetch active subscribers (with valid trial or paid)
    const TRIAL_CUTOFF = new Date("2026-05-19T01:36:00.000Z");
    const now = new Date();
    
    const { data: profiles, error: profErr } = await adminClient
      .from("profiles")
      .select("id, email, full_name, trial_started_at, subscription_status, subscription_expires_at, blast_opt_in");
    
    if (profErr) {
      return jsonResp({ error: "Failed to fetch subscribers: " + profErr.message }, 500);
    }
    
    // Filter active subscribers
    const activeSubscribers = (profiles || []).filter(p => {
      if (!p.email) return false;
      if (p.blast_opt_in === false) return false; // opt-out
      
      // Check active subscription
      if (p.subscription_status === "active" && p.subscription_expires_at) {
        const exp = new Date(p.subscription_expires_at);
        if (exp > now) return true;
      }
      
      // Check active trial (with grandfathering)
      if (p.trial_started_at) {
        const trialStart = new Date(p.trial_started_at);
        const durationDays = trialStart < TRIAL_CUTOFF ? 60 : 7;
        const trialEnd = new Date(trialStart.getTime() + durationDays * 86400000);
        if (trialEnd > now) return true;
      }
      
      return false;
    });
    
    // Subject line
    const subject = isRoundup 
      ? `📰 Avenir Research — ${notifs.length} Update Hari Ini (${formatDateID(new Date().toISOString())})`
      : notifs[0].title;
    
    // Send to each subscriber
    let sent = 0, failed = 0, skipped = 0;
    const errors: any[] = [];
    
    for (const sub of activeSubscribers) {
      // Validate email
      if (!EMAIL_REGEX.test(sub.email)) {
        skipped++;
        continue;
      }
      
      const subscriberName = sub.full_name || sub.email.split("@")[0];
      const htmlBody = isRoundup 
        ? renderRoundupEmail(notifs, subscriberName)
        : renderSingleEmail(notifs[0], subscriberName);
      
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: sub.email,
            subject,
            html: htmlBody,
          }),
        });
        
        if (resp.ok) {
          sent++;
        } else {
          failed++;
          const errData = await resp.json().catch(() => ({}));
          errors.push({ email: sub.email, message: errData.message || `HTTP ${resp.status}` });
        }
      } catch (e) {
        failed++;
        errors.push({ email: sub.email, message: (e as Error).message });
      }
      
      // Small delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Update notifications: mark as sent + increment count
    if (sent > 0) {
      const nowIso = new Date().toISOString();
      for (const n of notifs) {
        await adminClient
          .from("notifications")
          .update({
            email_sent_at: nowIso,
            email_sent_count: (n.email_sent_count || 0) + sent,
          })
          .eq("id", n.id);
      }
    }
    
    return jsonResp({
      success: true,
      mode: isRoundup ? "roundup" : "single",
      notification_count: notifs.length,
      total: activeSubscribers.length,
      sent,
      failed,
      skipped,
      errors: errors.slice(0, 10), // First 10 errors only
    });
    
  } catch (e) {
    console.error("Blast error:", e);
    return jsonResp({ error: (e as Error).message }, 500);
  }
});

function jsonResp(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
