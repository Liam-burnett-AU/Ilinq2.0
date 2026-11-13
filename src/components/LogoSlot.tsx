import { config } from '@/lib/config';

/**
 * Designated spot for the Sheldon College logo. Drop the official asset in
 * /public/sheldon-logo.svg (or .png) and it will be used automatically; until
 * then a neutral monogram placeholder keeps the layout stable.
 */
export function LogoSlot({ size = 'md', withText = true }: { size?: 'sm' | 'md' | 'lg'; withText?: boolean }) {
  const px = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';
  return (
    <div className="flex items-center gap-3">
      <div className={`${px} relative shrink-0 overflow-hidden rounded-xl bg-navy-800 ring-1 ring-sky/30`} aria-label={`${config.schoolName} logo`}>
        <img
          src="/sheldon-logo.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-contain p-1"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="flex h-full w-full items-center justify-center font-mono text-xs font-bold tracking-wider text-sky">SC</div>
      </div>
      {withText && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">{config.appName}</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky/80">{config.schoolName}</div>
        </div>
      )}
    </div>
  );
}
