import { format } from 'date-fns';
import { Bookmark, BookmarkCheck, MessageSquare, Paperclip } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isUnread, newsImage, stripHtml } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { invalidate, useAsync } from '@/hooks/useAsync';

export default function NewsPage() {
  const { api } = useAuth();
  const [topic, setTopic] = useState<string>('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const feed = useAsync(`news:${api.kind}:${topic}`, () => api.getNewsFeed(topic || undefined), [topic], 120_000);
  const topics = useAsync(`newsTopics:${api.kind}`, () => api.getNewsTopics(), [], 600_000);
  const saved = useAsync(`newsSaved:${api.kind}`, () => api.getSavedNews(), [], 60_000);
  const savedSet = useMemo(() => new Set(saved.data ?? []), [saved.data]);

  const items = (feed.data ?? []).filter((n) => (!onlyUnread || isUnread(n)) && (!onlySaved || savedSet.has(n.id)));
  const unreadCount = (feed.data ?? []).filter(isUnread).length;

  const toggleSave = async (id: number) => {
    if (savedSet.has(id)) await api.unsaveNews(id);
    else await api.saveNews(id);
    invalidate('newsSaved:');
    saved.refresh();
  };

  return (
    <div>
      <PageHeader title="News" subtitle={feed.data ? `${feed.data.length} articles · ${unreadCount} unread` : 'Articles audienced to you'} />
      <ErrorBanner error={feed.error} onRetry={feed.refresh} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={`chip ${topic === '' ? '!border-sky/50 !bg-navy-700/70 text-ink' : ''}`} onClick={() => setTopic('')}>
          All topics
        </button>
        {(topics.data ?? []).map((t) => (
          <button key={t.slug} className={`chip ${topic === t.slug ? '!border-sky/50 !bg-navy-700/70 text-ink' : ''}`} onClick={() => setTopic(t.slug)}>
            {t.name}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button className={`chip ${onlyUnread ? '!border-gold/60 text-gold' : ''}`} onClick={() => setOnlyUnread((v) => !v)} aria-pressed={onlyUnread}>
          Unread
        </button>
        <button className={`chip ${onlySaved ? '!border-gold/60 text-gold' : ''}`} onClick={() => setOnlySaved((v) => !v)} aria-pressed={onlySaved}>
          Saved
        </button>
      </div>

      {feed.loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No articles match" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((n) => {
            const img = api.proxied(newsImage(n));
            return (
              <li key={n.id} className="card group relative flex flex-col overflow-hidden animate-fade-up">
                {img && <img src={img} alt="" className="h-36 w-full object-cover" loading="lazy" />}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {isUnread(n) && <span className="chip !border-gold/40 !bg-gold/10 text-gold">New</span>}
                    {n.topics?.map((t) => (
                      <span key={t.slug} className="chip">
                        {t.name}
                      </span>
                    ))}
                  </div>
                  <Link to={`/news/${n.id}`} className="text-base font-semibold text-ink after:absolute after:inset-0 group-hover:text-sky">
                    {n.title}
                  </Link>
                  <p className="mt-1 line-clamp-3 text-sm text-ink/80">{stripHtml(n.blurb)}</p>
                  <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-ink-muted/80">
                    <span className="font-mono">{format(new Date(n.publishAt), 'EEE d MMM, h:mma').toLowerCase()}</span>
                    {!!n.metadata?.commentCount && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> {n.metadata.commentCount}
                      </span>
                    )}
                    {!!n.attachments && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" /> {n.attachments}
                      </span>
                    )}
                    <button className="relative z-10 ml-auto rounded-lg p-1.5 text-ink-muted hover:bg-white/10 hover:text-gold" onClick={() => toggleSave(n.id)} aria-label={savedSet.has(n.id) ? 'Remove from saved' : 'Save for later'}>
                      {savedSet.has(n.id) ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
