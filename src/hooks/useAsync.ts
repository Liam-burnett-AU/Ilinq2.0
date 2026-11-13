import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

const cache = new Map<string, { at: number; value: unknown }>();

/**
 * Tiny stale-while-revalidate hook. Keyed results are cached in memory for
 * `ttl` ms so navigating between pages feels instant without a query library.
 */
export function useAsync<T>(key: string | null, fn: () => Promise<T>, deps: unknown[] = [], ttl = 60_000) {
  const cached = key ? (cache.get(key) as { at: number; value: T } | undefined) : undefined;
  const [state, setState] = useState<State<T>>({ data: cached?.value ?? null, error: null, loading: !cached });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const hit = cache.get(key) as { at: number; value: T } | undefined;
    if (hit && Date.now() - hit.at < ttl && tick === 0) {
      setState({ data: hit.value, error: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: s.data === null }));
    fnRef
      .current()
      .then((value) => {
        if (!alive) return;
        cache.set(key, { at: Date.now(), value });
        setState({ data: value, error: null, loading: false });
      })
      .catch((error: Error) => alive && setState((s) => ({ data: s.data, error, loading: false })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, ...deps]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refresh };
}

export const invalidate = (prefix: string) => {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
};
