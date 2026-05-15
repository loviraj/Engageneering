/* ─────────────────────────────────────────────────────────────────────
   Engageneering™ — Consent Guard
   ─────────────────────────────────────────────────────────────────────
   Drop this script into platform.html (and any other authenticated page)
   to ensure no user reaches the application without a recorded
   legal_consents row. It runs once on DOMContentLoaded, checks the
   user's session, and bounces them back to auth.html if either:
     (a) they have no Supabase session at all, OR
     (b) they have a session but no legal_consents row yet.

   Requires:
     - window.ENG_CONFIG.SUPA_URL  and  window.ENG_CONFIG.SUPA_ANON
       must already be defined (use the same config block as auth.html).
     - The @supabase/supabase-js CDN script must be loaded before this.

   Usage in platform.html (place just after the supabase-js CDN tag):
     <script src="consent-guard.js"></script>

   Design notes:
     - We use getSession() first (local, instant) to wait out the
       milliseconds it takes for supabase-js to restore the persisted
       session after a page navigation. We only escalate to getUser()
       (a server call) once a local session is available.
     - The consent check retries once with a short delay if the count
       comes back 0 — this guards against the race where the user has
       JUST inserted their consent row in auth.html and PostgREST is
       still warming the cache for the read.
     - We DO NOT bounce on transient errors. Only when we can affirm
       "no session" or "no consent row after retry" do we redirect.
     - To avoid loops, we set a short-lived sessionStorage marker so
       a fresh bounce within 3 seconds is suppressed.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  if (typeof window === 'undefined') return;

  // Don't run on auth.html itself
  var path = (window.location.pathname || '').toLowerCase();
  if (path.endsWith('/auth.html') || path.endsWith('auth.html')) return;

  var LOOP_GUARD_KEY = '_eng_guard_last_bounce';
  var LOOP_GUARD_MS  = 3000;

  function bounceToAuth(reason) {
    try { console.warn('[consent-guard] bouncing to auth:', reason); } catch(_) {}
    // Loop suppression — if we just bounced, do not bounce again.
    try {
      var last = parseInt(sessionStorage.getItem(LOOP_GUARD_KEY) || '0', 10);
      if (last && (Date.now() - last) < LOOP_GUARD_MS) {
        console.warn('[consent-guard] suppressing rapid re-bounce');
        return;
      }
      sessionStorage.setItem(LOOP_GUARD_KEY, String(Date.now()));
      sessionStorage.setItem('_eng_return_to', window.location.pathname);
    } catch(_) {}
    window.location.replace('auth.html');
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

  // Wait up to ~1.5s for the persisted Supabase session to load. Returns
  // the session object if found, else null.
  async function waitForSession(supa) {
    for (var i = 0; i < 15; i++) {
      try {
        var r = await supa.auth.getSession();
        if (r && r.data && r.data.session) return r.data.session;
      } catch(_) {}
      await sleep(100);
    }
    return null;
  }

  // Check legal_consents with one retry on a zero count, since PostgREST
  // may briefly not return a just-inserted row after a redirect.
  async function checkConsent(supa, uid) {
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var cr = await supa
          .from('legal_consents')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid);
        if (cr.error) {
          // On error, treat as inconclusive — retry once, then fail closed.
          if (attempt === 0) { await sleep(400); continue; }
          return { ok: false, reason: 'consent query error: ' + cr.error.message };
        }
        if ((cr.count || 0) > 0) return { ok: true };
        // Count is 0 — retry once after a beat to dodge replication lag.
        if (attempt === 0) { await sleep(500); continue; }
        return { ok: false, reason: 'no consent row' };
      } catch(e) {
        if (attempt === 0) { await sleep(400); continue; }
        return { ok: false, reason: 'consent check exception: ' + (e && e.message ? e.message : e) };
      }
    }
    return { ok: false, reason: 'consent check exhausted retries' };
  }

  ready(async function () {
    try {
      if (!window.supabase || !window.ENG_CONFIG || !window.ENG_CONFIG.SUPA_URL || !window.ENG_CONFIG.SUPA_ANON) {
        return bounceToAuth('config or supabase-js not loaded');
      }
      var supa = window.supabase.createClient(
        window.ENG_CONFIG.SUPA_URL,
        window.ENG_CONFIG.SUPA_ANON,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );

      // 1. Wait for the local session to be available (handles the race
      //    where supabase-js is still restoring from localStorage on a
      //    fresh page load after redirect).
      var session = await waitForSession(supa);
      if (!session) return bounceToAuth('no session');
      var user = session.user;
      if (!user) return bounceToAuth('no user in session');

      // 2. For email users, require email_confirmed_at. Google users are
      //    implicitly confirmed (provider === 'google').
      var provider = user.app_metadata && user.app_metadata.provider;
      if (provider !== 'google' && !user.email_confirmed_at) {
        return bounceToAuth('email not confirmed');
      }

      // 3. Consent check with retry — fail closed only after the retry.
      var verdict = await checkConsent(supa, user.id);
      if (!verdict.ok) return bounceToAuth(verdict.reason);

      // 4. All clear — clear loop guard, expose client and user, log.
      try { sessionStorage.removeItem(LOOP_GUARD_KEY); } catch(_) {}
      window.__engSupa = supa;
      window.__engUser = user;
      try { console.log('[consent-guard] passed for uid=' + user.id); } catch(_) {}
    } catch (e) {
      bounceToAuth('exception: ' + (e && e.message ? e.message : e));
    }
  });
})();
