import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError } from '@/api';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-sky ${className}`} aria-hidden />;
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-ink/80" role="status">
      <Spinner className="h-8 w-8" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Card({ title, action, children, className = '', padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`card min-w-0 animate-fade-up ${padded ? 'card-pad' : ''} ${className}`}>
      {(title || action) && (
        <header className={`mb-3 flex items-center justify-between gap-3 ${padded ? '' : 'px-4 pt-4 sm:px-5 sm:pt-5'}`}>
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon = <Inbox className="h-6 w-6" />, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line/15 px-4 py-8 text-center text-ink-muted">
      <div className="text-sky/70">{icon}</div>
      <p className="text-sm font-medium text-ink/80">{title}</p>
      {hint && <p className="max-w-xs text-xs">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  if (!error) return null;
  const detail = error instanceof ApiError ? `${error.message}${error.status ? ` (HTTP ${error.status})` : ''}` : error.message;
  const hint =
    error instanceof ApiError && error.isUnauthorised
      ? 'Your Schoolbox session may have expired. Sign out and back in.'
      : error instanceof ApiError && error.status === 502
        ? 'The proxy could not reach ilinq.sheldoncollege.com. Check SCHOOLBOX_ORIGIN and your network.'
        : undefined;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-card border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
      <div className="flex-1">
        <p className="font-medium">{detail}</p>
        {hint && <p className="mt-0.5 text-xs text-red-200/80">{hint}</p>}
      </div>
      {onRetry && (
        <button className="btn-ghost !px-2 !py-1" onClick={onRetry} aria-label="Retry">
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} aria-hidden />;
}

export function KindDot({ colour }: { colour: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/30" style={{ background: colour }} aria-hidden />;
}
