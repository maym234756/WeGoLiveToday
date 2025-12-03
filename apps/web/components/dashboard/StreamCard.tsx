import Link from 'next/link';
import type { LiveCard } from '@/app/dashboard/page';

export default function StreamCard({ s }: { s: LiveCard }) {
  const previewUrl = s.thumb ? s.thumb : undefined;

  return (
    <Link
      href={`/watch/${s.id}`}
      className="group transform scale-[0.95] rounded-lg border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:scale-100 hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 max-w-[220px] w-full mx-auto"
      aria-label={`${s.title} by ${s.host}, ${s.viewers.toLocaleString()} watching`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-zinc-800 max-h-[120px]">
        {previewUrl ? (
          <video
            className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
            poster={s.thumb}
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-zinc-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="opacity-70" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-medium text-white">
          LIVE
        </span>
        <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
          {s.viewers.toLocaleString()} watching
        </span>
      </div>

      <div className="p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="line-clamp-1 font-medium text-white text-sm">{s.title}</p>
          <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
            {s.tag}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">by {s.host}</p>
      </div>
    </Link>
  );
}
