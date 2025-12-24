// apps/dashboard/components/StreamCard.tsx

import Link from 'next/link';
import type { LiveCard } from '@/app/dashboard/page';

type StreamCardVariant = 'grid' | 'compact' | 'hero';

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ');
}

function fmtViewers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'WL';
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase();
}

export default function StreamCard({
  s,
  variant = 'grid',
  className,
}: {
  s: LiveCard;
  variant?: StreamCardVariant;
  className?: string;
}) {
  const href = `/watch/${s.id}`;

  const isCompact = variant === 'compact';
  const isHero = variant === 'hero';

  const thumb = s.thumb || '';
  const viewersText = `${fmtViewers(s.viewers)} watching`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cx(
        // Shell
        'group block w-full min-w-0',
        'rounded-2xl border border-zinc-800 bg-zinc-950/40',
        'transition hover:bg-zinc-900/50 hover:border-zinc-700',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
        className,
      )}
      aria-label={`${s.title} by ${s.host}, ${s.viewers.toLocaleString()} watching`}
    >
      {/* Thumbnail */}
      <div
        className={cx(
          'relative w-full overflow-hidden rounded-2xl',
          'bg-zinc-900',
          isHero ? 'aspect-[16/9]' : 'aspect-video',
        )}
      >
        {thumb ? (
          // Use image by default (more reliable than autoplay video)
          // If you later add s.previewVideoUrl, swap this to a <video src=...>.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className={cx(
              'h-full w-full object-cover',
              'transition duration-300',
              'group-hover:scale-[1.03]',
              'opacity-95 group-hover:opacity-100',
            )}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-zinc-500">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" className="opacity-70" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Subtle overlay for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

        {/* LIVE pill */}
        <span
          className={cx(
            'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full',
            'bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white',
            'shadow-sm',
          )}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
          LIVE
        </span>

        {/* Tag */}
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-zinc-100 ring-1 ring-white/10">
          {s.tag}
        </span>

        {/* Viewers */}
        <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-zinc-100 ring-1 ring-white/10">
          {viewersText}
        </span>
      </div>

      {/* Meta */}
      <div className={cx('p-3', isHero ? 'sm:p-4' : 'p-3')}>
        <div className={cx('flex items-start gap-3 min-w-0', isCompact && 'gap-2')}>
          {/* Avatar (host initials) */}
          <div
            className={cx(
              'shrink-0 rounded-full grid place-items-center',
              'border border-zinc-800 bg-zinc-900/60 text-zinc-200',
              isHero ? 'h-10 w-10 text-sm' : isCompact ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-xs',
            )}
            aria-hidden
          >
            {initials(s.host)}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div
              className={cx(
                'text-white font-semibold leading-snug',
                isHero ? 'text-base sm:text-lg' : 'text-sm',
                isCompact ? 'line-clamp-1' : 'line-clamp-2',
              )}
              title={s.title}
            >
              {s.title}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 min-w-0">
              <span className="truncate" title={s.host}>
                {s.host}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="whitespace-nowrap">{fmtViewers(s.viewers)} watching</span>
            </div>
          </div>
        </div>

        {/* Optional compact footer (keeps cards visually consistent) */}
        {!isCompact && (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              Streaming now
            </span>
            <span className="text-zinc-600 group-hover:text-zinc-400 transition">Open →</span>
          </div>
        )}
      </div>
    </Link>
  );
}
