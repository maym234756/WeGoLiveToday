'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveChatBox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const stored = localStorage.getItem('waitlist_name');
    if (stored) setUsername(stored);
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('comingsoon_chat')
        .select('*')
        .order('created_at', { ascending: true });

      setMessages(data || []);
      scrollToBottom();
    };

    loadMessages();

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comingsoon_chat',
      }, payload => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    await supabase.from('comingsoon_chat').insert({
      username: username || 'Guest',
      message: input.trim()
    });

    setInput('');
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-[350px] bg-zinc-900 border-l border-zinc-700 flex flex-col z-50">

      {/* Header */}
      <div className="p-4 border-b border-zinc-700 text-white font-semibold text-lg bg-zinc-950">
        💬 Live Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-zinc-800 px-3 py-2 rounded-md border border-zinc-700">
            <p className="text-emerald-400 text-xs mb-1">{m.username}</p>
            <p className="text-white text-sm">{m.message}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-700 bg-zinc-950 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 px-3 py-2 rounded-md bg-zinc-800 text-white"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-md"
        >
          Send
        </button>
      </div>
    </div>
  );
}
