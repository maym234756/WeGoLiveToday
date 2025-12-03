// components/chat/ChatInput.tsx
'use client';

import { useState, useEffect } from 'react';

interface ChatInputProps {
  isPro: boolean;
}

export default function ChatInput({ isPro }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [wordLimitReached, setWordLimitReached] = useState(false);
  const [remainingWords, setRemainingWords] = useState(200);

  const wordCount = message.trim().split(/\s+/).length;
  const freeWordLimit = 200;

  useEffect(() => {
    if (!isPro) {
      setRemainingWords(Math.max(freeWordLimit - wordCount, 0));
    }
  }, [message, wordCount, isPro]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;

    if (!isPro && wordCount > freeWordLimit) {
      setWordLimitReached(true);
      return;
    }

    setMessage(input);
    setWordLimitReached(false);
  };

  const handleSend = () => {
    if (!isPro && cooldown) return;

    console.log('💬 Sending message:', message);

    // Reset message after sending
    setMessage('');

    if (!isPro) {
      setCooldown(true);
      setTimeout(() => setCooldown(false), 5 * 60 * 1000); // 5 min cooldown
    }
  };

  return (
    <div className="mt-4">
      <textarea
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        placeholder="Type your message..."
        value={message}
        onChange={handleChange}
        rows={3}
        disabled={!isPro && cooldown}
      />

      <div className="mt-2 flex items-center justify-between text-sm text-zinc-400">
        {!isPro && (
          <div>
            {wordLimitReached && (
              <span className="text-yellow-500">⚠️ Word limit reached</span>
            )}
            {cooldown && (
              <span className="text-red-500">⏳ Cooldown active (5 min)</span>
            )}
            {!wordLimitReached && !cooldown && (
              <span>📝 {remainingWords} words remaining</span>
            )}
          </div>
        )}

        <button
          className="btn btn-primary ml-auto"
          onClick={handleSend}
          disabled={cooldown || wordLimitReached || !message.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
