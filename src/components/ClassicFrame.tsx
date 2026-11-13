import { ExternalLink, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { config } from '@/lib/config';

/**
 * Embeds a classic iLINQ page through the proxy. Same origin as the app, so
 * the Schoolbox session cookie applies and the page behaves exactly as it
 * does on ilinq.sheldoncollege.com: the full 1:1 experience for anything the
 * public API does not expose (class page content, messages, ePortfolio…).
 */
export function ClassicFrame({ path, title, minHeight = 720 }: { path: string; title: string; minHeight?: number }) {
  const { api } = useAuth();
  const [n, setN] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  const clean = path.startsWith('/') ? path : `/${path}`;
  const external = api.absolute(clean);

  if (api.kind === 'demo') {
    return (
      <div className="card card-pad flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm font-medium text-ink">Classic iLINQ pages need a live sign-in</p>
        <p className="max-w-md text-xs text-ink-muted">
          In demo mode there is nothing to embed. Sign in with your College account and this panel shows the real <span className="font-mono">{clean}</span> page from ilinq.sheldoncollege.com inside the app.
        </p>
        <a className="btn-ghost mt-2" href={external} target="_blank" rel="noreferrer">
          Open on classic iLINQ <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line/10 px-3 py-2 text-xs text-ink-muted">
        <span className="font-mono truncate">{config.schoolboxOrigin.replace(/^https?:\/\//, '')}{clean}</span>
        <span className="ml-auto flex items-center gap-1">
          <button className="btn-ghost !px-2 !py-1" onClick={() => { setLoaded(false); setN((x) => x + 1); }} aria-label="Reload">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a className="btn-ghost !px-2 !py-1" href={external} target="_blank" rel="noreferrer" aria-label="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </span>
      </div>
      <div className="relative" style={{ minHeight }}>
        {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />}
        <iframe
          key={n}
          ref={ref}
          title={title}
          src={`${config.apiBase}${clean}`}
          className="h-[calc(100vh-14rem)] w-full bg-white"
          style={{ minHeight }}
          onLoad={() => setLoaded(true)}
          referrerPolicy="same-origin"
        />
      </div>
    </div>
  );
}
