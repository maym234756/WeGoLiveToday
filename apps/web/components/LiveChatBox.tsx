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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('waitlist_name');
    if (stored) setUsername(stored);
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('comingsoon_chat')
        .select('*')
        .order('created_at', { ascending: true });

      setMessages(data || []);
      scrollToBottom();
    };

    fetchMessages();

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comingsoon_chat',
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isTyping) return;
    const timeout = setTimeout(() => setIsTyping(false), 2000);
    return () => clearTimeout(timeout);
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    await supabase.from('comingsoon_chat').insert({
      username: username || 'Guest',
      message: input.trim(),
    });

    setInput('');
  };

  const getColor = (name: string) => {
    const colors = [
      'text-red-400', 'text-green-400', 'text-blue-400', 'text-yellow-400',
      'text-pink-400', 'text-purple-400', 'text-cyan-400', 'text-orange-400'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const renderMessage = (m: any) => (
    <div key={m.id} className="bg-zinc-800 px-3 py-2 rounded-md border border-zinc-700">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold uppercase">
          {m.username.charAt(0)}
        </div>
        <p className={`text-xs font-semibold ${getColor(m.username)}`}>{m.username}</p>
        <p className="text-[10px] text-zinc-400 ml-auto">
          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <p className="text-white text-sm">{m.message}</p>
    </div>
  );

  const renderChatPanel = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(renderMessage)}
        {isTyping && (
          <p className="text-xs text-zinc-400 italic px-1">Someone is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-zinc-700 bg-zinc-950 flex gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setIsTyping(true);
          }}
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
    </>
  );

  return (
    <>
      {/* DESKTOP CHAT PANEL */}
      <div className="hidden md:flex fixed top-0 right-0 h-screen w-[350px] bg-zinc-900 border-l border-zinc-700 flex-col z-50">
        <div className="p-4 border-b border-zinc-700 text-white font-semibold text-lg bg-zinc-950">
          💬 Live Chat
        </div>
        {renderChatPanel()}
      </div>

      {/* MOBILE TOGGLE BUTTON */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed bottom-5 right-5 z-50 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg"
      >
        💬
      </button>

      {/* MOBILE CHAT PANEL */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-zinc-950 z-50 flex flex-col">
          <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
            <span className="text-white font-semibold text-lg">💬 Live Chat</span>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
          {renderChatPanel()}
        </div>
      )}
    </>
  );
}
