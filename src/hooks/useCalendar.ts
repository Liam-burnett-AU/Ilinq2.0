import { useMemo } from 'react';
import { normaliseEvents } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { useAsync } from './useAsync';

/** Fetch and normalise calendar events for the current subject over [start, end). */
export function useCalendarRange(start: Date, end: Date) {
  const { api, subjectId } = useAuth();
  const key = subjectId ? `cal:${api.kind}:${subjectId}:${start.toDateString()}:${end.toDateString()}` : null;
  const q = useAsync(key, () => api.getCalendar(subjectId!, start, end), [subjectId], 120_000);
  const events = useMemo(() => (q.data ? normaliseEvents(q.data) : []), [q.data]);
  return { ...q, events };
}
