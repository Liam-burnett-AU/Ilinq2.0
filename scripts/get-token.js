/**
 * iLINQ 2.0 - get a login token from classic iLINQ.
 *
 * 1. Sign in to https://ilinq.sheldoncollege.com in your browser.
 * 2. Open DevTools (F12) -> Console tab.
 * 3. Paste this whole file and press Enter.
 *
 * It calls Schoolbox's POST /user/token endpoint with the scopes iLINQ 2.0
 * needs (session scope is required to sign in), prints the JWT and copies it
 * to the clipboard. Paste it into the "API token" tab on the iLINQ 2.0 login
 * page. Tokens can be revoked any time from your profile in classic iLINQ.
 */
(async () => {
  const NAME = 'iLINQ 2.0';
  const MONTHS = 6; // 1-12
  const SCOPES = [
    'https://schoolbox.education/scope/session',
    'https://schoolbox.education/scope/calendar:readonly',
    'https://schoolbox.education/scope/news:readonly',
    'https://schoolbox.education/scope/user:readonly',
    'https://schoolbox.education/scope/search',
    'https://schoolbox.education/scope/learningMoment:readonly',
  ];

  if (!/sheldoncollege\.com$/i.test(location.hostname)) {
    console.warn('Run this on https://ilinq.sheldoncollege.com while signed in.');
    return;
  }

  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  let res = await fetch('/user/token', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ name: NAME, scopes: SCOPES, expiryInterval: MONTHS }),
  });

  // Older instances only support the deprecated GET (token gets the session scope).
  if (!res.ok) {
    console.warn(`POST /user/token returned ${res.status}, trying GET fallback…`);
    res = await fetch('/user/token', { credentials: 'include', headers: { Accept: 'application/json' } });
  }

  if (!res.ok) {
    console.error(`Could not create a token (HTTP ${res.status}).`, await res.text().catch(() => ''));
    return;
  }

  const data = await res.json();
  const token = data.token;
  if (!token) {
    console.error('No token in response:', data);
    return;
  }

  console.log('%c✅ iLINQ 2.0 token created', 'color:#fbd708;font-weight:bold');
  console.log('User:   ', data.user?.fullName ?? data.user?.id ?? '(you)');
  console.log('Expires:', data.expiry ?? `${MONTHS} months`);
  console.log('Scopes: ', (data.scopes ?? SCOPES).map((s) => s.split('/scope/')[1]).join(', '));
  console.log('%cToken (paste into iLINQ 2.0 → API token):', 'font-weight:bold');
  console.log(token);

  try {
    if (typeof copy === 'function') copy(token); // DevTools helper
    else await navigator.clipboard.writeText(token);
    console.log('%c📋 Copied to clipboard', 'color:#a3c1e7');
  } catch {
    console.log('(Could not copy automatically, select the token above and copy it.)');
  }
})();
