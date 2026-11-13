/**
 * iLINQ 2.0 - capture a sample of your real iLINQ data for debugging.
 *
 * 1. Sign in to https://ilinq.sheldoncollege.com
 * 2. F12 -> Console -> paste this file -> Enter
 * 3. A file "ilinq-sample.json" downloads. Share it (or drop it in samples/)
 *    so the app's event classification and page layouts can be matched to
 *    Sheldon's instance.
 *
 * What it collects (all via the same API calls iLINQ 2.0 makes):
 *   - your /api/user profile (groups, year level, campus; email/externalId removed)
 *   - 4 weeks of /calendar/ajax/full events (titles kept, long HTML details trimmed)
 *   - the news feed and topics (titles/blurbs only)
 *   - the evidence feed (marks/comments trimmed)
 *   - a tally of event className / meta.type / meta.variant combinations
 * Nothing is sent anywhere; it only downloads a file to your computer.
 */
(async () => {
  const J = { Accept: 'application/json' };
  const get = async (path) => {
    const r = await fetch(path, { credentials: 'include', headers: J });
    const text = await r.text();
    try { return { status: r.status, body: JSON.parse(text) }; } catch { return { status: r.status, body: text.slice(0, 300) }; }
  };

  // Find your user id from a profile link on the page, or fall back to the token endpoint.
  let userId = Number((document.documentElement.outerHTML.match(/\/search\/user\/(\d+)/) || [])[1]);
  if (!userId) {
    const t = await get('/user/token');
    userId = t.body?.user?.id;
  }
  if (!userId) { console.error('Could not work out your user id. Open your profile page and run this again.'); return; }
  console.log('User id', userId);

  const trim = (s, n = 160) => (typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s);
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setDate(end.getDate() + 21);
  const unix = (d) => Math.floor(d.getTime() / 1000);

  const [user, cal, news, topics, evidence] = await Promise.all([
    get(`/api/user/${userId}`),
    get(`/calendar/ajax/full?start=${unix(start)}&end=${unix(end)}&userId=${userId}`),
    get('/news/lists/feed'),
    get('/news/topics'),
    get(`/learning/evidenceFeed/user/${userId}`),
  ]);

  if (user.body && typeof user.body === 'object') {
    delete user.body.email; delete user.body.altEmail; delete user.body.externalId;
    for (const k of ['guardians', 'students', 'impersonableUsers']) if (Array.isArray(user.body[k])) user.body[k] = user.body[k].map((u) => ({ ...u, externalId: undefined }));
  }

  const events = Array.isArray(cal.body) ? cal.body : [];
  const tally = {};
  for (const e of events) {
    const m = e.data?.meta || {};
    if (m.detail) m.detail = trim(m.detail);
    const key = [e.className, m.type, m.variant, m.eventType, e.data?.classAttendance ? 'classAttendance' : '', typeof m.completed === 'boolean' ? 'completed' : '', e.allDay ? 'allDay' : ''].join(' | ');
    tally[key] = (tally[key] || 0) + 1;
  }

  const sample = {
    capturedAt: now.toISOString(),
    location: location.origin,
    schoolboxVersion: (document.documentElement.outerHTML.match(/schoolbox[^"'<>]{0,20}(\d+\.\d+\.\d+)/i) || [])[1] || null,
    user: user.body,
    calendar: { status: cal.status, count: events.length, tally, events },
    news: { status: news.status, items: Array.isArray(news.body) ? news.body.map((n) => ({ ...n, blurb: trim(n.blurb) })) : news.body },
    topics: topics.body,
    evidence: { status: evidence.status, items: Array.isArray(evidence.body?.data) ? evidence.body.data.map((i) => ({ ...i, object: { ...i.object, body: trim(i.object?.body), comment: trim(i.object?.comment) } })) : evidence.body },
  };

  console.log('%cEvent type tally (className | type | variant | eventType | flags):', 'font-weight:bold');
  console.table(tally);
  console.log('Statuses:', { user: user.status, calendar: cal.status, news: news.status, evidence: evidence.status });

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'ilinq-sample.json' });
  document.body.appendChild(a); a.click(); a.remove();
  console.log('%c✅ Downloaded ilinq-sample.json', 'color:#fbd708;font-weight:bold');
})();
