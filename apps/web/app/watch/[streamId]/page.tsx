// apps/web/app/watch/[streamId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import ChatInput from '@/components/ChatInput';

export default function StreamViewerPage() {
  const params = useParams();
  const streamId = Array.isArray(params?.streamId) ? params?.streamId[0] : params?.streamId ?? '';
  if (!streamId) return <div>Stream not found</div>;

  const isPro = true; // 🔓 Replace with actual user data in real use

  return (
    <main className="px-4 py-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🎥 Watching Stream: {streamId}</h1>

        {/* 🔴 TEMPORARY MOCK VIDEO PLAYER */}
        <div className="aspect-video bg-black border border-zinc-700 mb-6 rounded flex items-center justify-center">
          <p className="text-zinc-500">Live Stream Video Placeholder</p>
        </div>

        {/* 💬 Chat Input */}
        <ChatInput isPro={isPro} />
      </div>
    </main>
  );
}
