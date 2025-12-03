'use client';

import type { LiveCard } from '@/app/adult/page';

export default function LiveCardComponent({ stream }: { stream: LiveCard }) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-800 hover:bg-zinc-700 transition shadow-md">
      {stream.thumb && (
        <img
          src={stream.thumb}
          alt={stream.title}
          className="h-40 w-full object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">{stream.title}</h3>
          <span className="text-xs text-red-500 font-bold border border-red-500 px-2 py-0.5 rounded">
            LIVE
          </span>
        </div>
        <p className="text-sm text-zinc-400 mt-1">by {stream.host}</p>
        <p className="text-sm text-zinc-500">{stream.viewers.toLocaleString()} watching</p>
      </div>
    </div>
  );
}
