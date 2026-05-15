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

   This guard fails CLOSED — any error, any uncertainty, the user is
   redirected to auth.html to re-establish a clean session.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  if (typeof window === 'undefined') return;

  // Don't run on auth.html itself
  var path = (window.location.pathname || '').toLowerCase();
  if (path.endsWith('/auth.html') || path.endsWith('auth.html')) return;

  function bounceToAuth(reason) {
    try { console.warn('[consent-guard] bouncing to auth:', reason); } catch(_) {}
    // Preserve where the user was trying to go so auth.html can return them
    try { sessionStorage.setItem('_eng_return_to', window.location.pathname); } catch(_) {}
    window.location.replace('auth.html');
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(async function () {
    try {
      if (!window.supabase || !window.ENG_CONFIG || !window.ENG_CONFIG.SUPA_URL || !window.ENG_CONFIG.SUPA_ANON) {
        return bounceToAuth('config or supabase-js not loaded');
      }
      var supa = window.supabase.createClient(
        window.ENG_CONFIG.SUPA_URL,
        window.ENG_CONFIG.SUPA_ANON,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
      );

      // Server-verified session check
      var ur = await supa.auth.getUser();
      var user = ur && ur.data && ur.data.user;
      if (!user || ur.error) return bounceToAuth('no session');

      // For email users, require email_confirmed_at. Google users are
      // implicitly confirmed (provider === 'google').
      var provider = user.app_metadata && user.app_metadata.provider;
      if (provider !== 'google' && !user.email_confirmed_at) {
        return bounceToAuth('email not confirmed');
      }

      // Consent check — fail closed on any error.
      var cr = await supa
        .from('legal_consents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (cr.error)            return bounceToAuth('consent query error: ' + cr.error.message);
      if ((cr.count || 0) === 0) return bounceToAuth('no consent row');

      // All clear — expose the client and user for the page to use
      window.__engSupa = supa;
      window.__engUser = user;
      try { console.log('[consent-guard] passed for uid=' + user.id); } catch(_) {}
    } catch (e) {
      bounceToAuth('exception: ' + (e && e.message ? e.message : e));
    }
  });
})();
