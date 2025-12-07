import React from 'react';

export type LiveCard = {
  id: string;
  title: string;
  host: string;
  viewers: number;
  tag: 'Adult';
  thumb?: string;
  thumb2?: string;
};

type Props = {
  stream: LiveCard;
};

export default function LiveCardComponent({ stream }: Props) {
  return (
    <div className="bg-zinc-900 p-4 rounded shadow">
      {stream.thumb && (
        <img
          src={stream.thumb}
          alt={stream.title}
          className="rounded mb-2 w-full h-40 object-cover"
        />
      )}
      <h3 className="text-lg font-bold text-white mb-1">{stream.title}</h3>
      <p className="text-zinc-400 text-sm">Host: {stream.host}</p>
      <p className="text-zinc-400 text-sm">Viewers: {stream.viewers}</p>
    </div>
  );
}
