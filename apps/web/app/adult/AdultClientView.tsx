'use client';

import { useState } from 'react';
import LiveCardComponent from '@/components/LiveCard';

export type LiveCard = {
  id: string;
  title: string;
  host: string;
  viewers: number;
  tag: 'Adult';
  thumb?: string;
};

const ADULT_STREAMS: LiveCard[] = [
  {
    id: 'adult_001',
    title: 'Late Night Confessions 💋',
    host: 'RoxyStar',
    viewers: 1200,
    tag: 'Adult',
    thumb: 'https://source.unsplash.com/random/800x600?night,redhead',
  },
  {
    id: 'adult_002',
    title: 'After Dark: Ask Me Anything',
    host: 'SpicyNeko',
    viewers: 834,
    tag: 'Adult',
    thumb: 'https://source.unsplash.com/random/800x600?dark,streamer',
  },
  {
    id: 'adult_003',
    title: 'Sensual Yoga & Chill',
    host: 'ZenMistress',
    viewers: 662,
    tag: 'Adult',
    thumb: 'https://source.unsplash.com/random/800x600?relax,black',
  },
];

export default function AdultClientView() {
  const [query, setQuery] = useState('');

  const filteredStreams = ADULT_STREAMS.filter((stream) =>
    `${stream.title} ${stream.host}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Adult Content</h1>
        <p className="mt-1 text-sm text-zinc-400">
          You are now viewing adult content only.
        </p>

        {/* 🔍 Search bar */}
        <div className="mt-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or host..."
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* 🎥 Filtered live cards */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {filteredStreams.length > 0 ? (
            filteredStreams.map((stream) => (
              <LiveCardComponent key={stream.id} stream={stream} />
            ))
          ) : (
            <p className="text-sm text-zinc-500 mt-4">No streams match your search.</p>
          )}
        </div>
      </div>
    </main>
  );
}
