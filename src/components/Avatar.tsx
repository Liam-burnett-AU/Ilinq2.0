import { useState } from 'react';

/** Photo with initials fallback. `src` should already be a proxied URL. */
export function Avatar({ src, name, size = 36, className = '', rounded = 'rounded-card' }: { src?: string; name: string; size?: number; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/^(Mr|Mrs|Ms|Dr|Miss|Mx)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size / 2.8)) };
  if (src && !failed) {
    return <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} className={`${rounded} shrink-0 bg-navy-700 object-cover ring-1 ring-line/15 ${className}`} style={style} />;
  }
  return (
    <span aria-hidden className={`${rounded} inline-flex shrink-0 items-center justify-center bg-navy-700 font-semibold text-sky ring-1 ring-line/15 ${className}`} style={style}>
      {initials || '?'}
    </span>
  );
}
