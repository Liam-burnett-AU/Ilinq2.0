import { addDays, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';
import { bucketDueWork, type DueBucket } from '@/api/adapters';
import { EventRow } from '@/components/EventCard';
import { Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useCalendarRange } from '@/hooks/useCalendar';
import { useNow } from '@/hooks/useNow';

const LABELS: Record<DueBucket, string> = { overdue: 'Overdue', today: 'Due today', thisWeek: 'Next 7 days', later: 'Later', done: 'Completed' };
const ORDER: DueBucket[] = ['overdue', 'today', 'thisWeek', 'later', 'done'];

export default function DueWorkPage() {
  const now = useNow();
  const today = startOfDay(now);
  const range = useMemo(() => ({ start: addDays(today, -21), end: addDays(today, 60) }), [today]);
  const cal = useCalendarRange(range.start, range.end);
  const [showDone, setShowDone] = useState(false);
  const buckets = useMemo(() => bucketDueWork(cal.events.filter((e) => e.kind === 'dueWork'), now), [cal.events, now]);
  const total = ORDER.filter((b) => b !== 'done').reduce((n, b) => n + buckets[b].length, 0);

  return (
    <div>
      <PageHeader
        title="Due work"
        subtitle={cal.loading ? 'Loading…' : `${total} outstanding · ${buckets.done.length} completed · from 3 weeks ago to 2 months ahead`}
        actions={
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" className="accent-gold" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed
          </label>
        }
      />
      <ErrorBanner error={cal.error} onRetry={cal.refresh} />
      {cal.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : total === 0 && (!showDone || buckets.done.length === 0) ? (
        <EmptyState title="All clear" hint="No due work found in your calendar for this period." />
      ) : (
        <div className="space-y-5">
          {ORDER.filter((b) => (b === 'done' ? showDone : true))
            .filter((b) => buckets[b].length)
            .map((b) => (
              <Card key={b} title={`${LABELS[b]} · ${buckets[b].length}`} className={b === 'overdue' ? 'ring-1 ring-red-400/30' : ''}>
                <div className="space-y-2">
                  {buckets[b].map((e) => (
                    <EventRow key={e.id} event={e} showDate emphasis={b === 'overdue' || b === 'today'} />
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}
      <p className="mt-6 text-xs text-ink-muted/80">
        Due work is read from the iLINQ calendar feed. Open an item to submit or view feedback in classic iLINQ.
      </p>
    </div>
  );
}
