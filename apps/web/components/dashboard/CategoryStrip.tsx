'use client';

import { useEffect, useRef } from 'react';

export default function CategoryStrip({
  categories,
  active,
  onSelect,
}: {
  categories: string[];
  active: string;
  onSelect: (c: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // auto-scroll active into view on change
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-cat="${CSS.escape(active)}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div
      ref={ref}
      className="no-scrollbar relative flex gap-2 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-900 p-1"
      role="tablist"
      aria-label="Stream categories"
    >
      {categories.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            data-cat={c}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(c)}
            className={`relative h-9 rounded-md px-3 text-sm transition-colors
              ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-800'}`}
          >
            {c}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded bg-emerald-500" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
