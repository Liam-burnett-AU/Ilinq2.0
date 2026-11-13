import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, mergePrefs, moveWidget } from '../prefs/PrefsContext';

describe('prefs', () => {
  it('moves widgets', () => {
    const w = DEFAULT_PREFS.widgets;
    const moved = moveWidget(w, 0, 2);
    expect(moved.map((x) => x.id).slice(0, 3)).toEqual(['dueSoon', 'today', 'nowNext']);
    expect(moveWidget(w, 0, 99)).toBe(w);
  });
  it('merges stored prefs with new defaults and drops unknown widgets', () => {
    const merged = mergePrefs({ theme: 'ink', widgets: [{ id: 'news', visible: false, size: 'full' }, { id: 'bogus' as never, visible: true, size: 'half' }] });
    expect(merged.theme).toBe('ink');
    expect(merged.widgets[0]).toEqual({ id: 'news', visible: false, size: 'full' });
    expect(merged.widgets).toHaveLength(DEFAULT_PREFS.widgets.length);
    expect(merged.widgets.some((w) => (w.id as string) === 'bogus')).toBe(false);
  });
  it('falls back for unknown theme', () => {
    expect(mergePrefs({ theme: 'neon' as never }).theme).toBe('blueprint');
  });
});
