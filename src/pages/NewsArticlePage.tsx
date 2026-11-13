import { format } from 'date-fns';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Paperclip } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { hrefOf, newsImage } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { ErrorBanner, Skeleton } from '@/components/ui';
import { invalidate, useAsync } from '@/hooks/useAsync';
import { sanitiseHtml } from '@/lib/sanitise';

export default function NewsArticlePage() {
  const { id } = useParams();
  const { api } = useAuth();
  const articleId = Number(id);
  const q = useAsync(Number.isFinite(articleId) ? `article:${api.kind}:${articleId}` : null, () => api.getNewsArticle(articleId), [articleId], 300_000);
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(!!q.data?.isSavedForLater), [q.data]);
  useEffect(() => {
    // Opening an article marks it read on the server; drop the cached feed.
    invalidate('news:');
  }, [articleId]);

  const a = q.data?.article;
  const body = useMemo(() => sanitiseHtml(a?.body ?? a?.blurb ?? '', (p) => api.absolute(p) ?? p), [a, api]);
  const img = api.proxied(a ? newsImage(a) : undefined);

  const toggleSave = async () => {
    if (!a) return;
    if (saved) await api.unsaveNews(a.id);
    else await api.saveNews(a.id);
    setSaved(!saved);
    invalidate('newsSaved:');
  };

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/news" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> News
      </Link>
      <ErrorBanner error={q.error} onRetry={q.refresh} />
      {q.loading || !a ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {a.topics?.map((t) => (
              <span key={t.slug} className="chip">
                {t.name}
              </span>
            ))}
            {a.sticky && <span className="chip !border-gold/40 text-gold">Pinned</span>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{a.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
            {a.author?.fullname && <span>{a.author.fullname}</span>}
            <span className="font-mono">{format(new Date(a.publishAt), 'EEEE d MMMM yyyy, h:mma').toLowerCase()}</span>
            <button className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 hover:text-ink" onClick={toggleSave}>
              {saved ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4" />} {saved ? 'Saved' : 'Save'}
            </button>
          </p>
          {img && <img src={img} alt="" className="mt-5 w-full rounded-card" />}
          <div className="prose-sb mt-5 card card-pad" dangerouslySetInnerHTML={{ __html: body }} />
          {!!a.attachedFiles?.length && (
            <section className="mt-4 card card-pad">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-sky/90">Attachments</h2>
              <ul className="space-y-1">
                {a.attachedFiles.map((f, i) => (
                  <li key={i}>
                    <a className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-white/5" href={api.proxied(hrefOf(f._links?.download) || hrefOf(f._links?.fetch) || hrefOf(f._links?.image) || hrefOf(f._links?.stream)) ?? '#'} target="_blank" rel="noreferrer">
                      <Paperclip className="h-4 w-4 text-sky" />
                      <span className="flex-1 truncate">{f.name}</span>
                      {f.size && <span className="font-mono text-xs text-ink-muted/80">{(f.size / 1024).toFixed(0)} KB</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="mt-4 text-xs text-ink-muted/80">
            <a className="inline-flex items-center gap-1 hover:text-ink" href={api.absolute(hrefOf(a._links?.self) || `/news/${a.id}`)} target="_blank" rel="noreferrer">
              Open in classic iLINQ to comment <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </>
      )}
    </article>
  );
}
