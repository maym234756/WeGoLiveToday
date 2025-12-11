// app/components/LiveChatBox.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null); // why: incremental polling window
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('waitlist_name');
    if (stored) setUsername(stored);
  }, []);

  // --- Initial load + realtime subscriptions ---
  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('comingsoon_chat')
        .select('*')
        .order('created_at', { ascending: true });

      const safe = data || [];
      setMessages(safe);
      setLastSeenAt(safe.length ? safe[safe.length - 1].created_at : null);
      scrollToBottom();
    };

    const fetchReactions = async () => {
      const { data } = await supabase.from('reactions').select('*');
      const grouped = (data || []).reduce((acc, r) => {
        if (!acc[r.message_id]) acc[r.message_id] = [];
        acc[r.message_id].push(r);
        return acc;
      }, {} as Record<string, any[]>);
      setReactions(grouped);
    };

    fetchInitial();
    fetchReactions();

    // Realtime primary path
    const messageSub = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comingsoon_chat' },
        (payload) => {
          setMessages((prev) => {
            // why: dedupe if polling also got it
            const map = new Map(prev.map((m) => [m.id, m]));
            map.set(payload.new.id, payload.new);
            const next = Array.from(map.values()).sort(
              (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return next;
          });
          setLastSeenAt((prev) => {
            const ts = payload.new.created_at as string;
            return !prev || new Date(ts) > new Date(prev) ? ts : prev;
          });
          scrollToBottom();
        }
      )
      .subscribe();

    const reactionSub = supabase
      .channel('reaction-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        () => fetchReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
      supabase.removeChannel(reactionSub);
    };
  }, []);

  // --- Polling fallback: fetch only new messages silently ---
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        // why: if we have nothing yet, skip; initial load covers it
        const since = lastSeenAt;
        if (!since) return;

        const { data, error } = await supabase
          .from('comingsoon_chat')
          .select('*')
          .gt('created_at', since)
          .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) return;

        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of data) map.set(m.id, m);
          const next = Array.from(map.values()).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return next;
        });
        setLastSeenAt((prev) => {
          const newest = data[data.length - 1].created_at as string;
          return !prev || new Date(newest) > new Date(prev) ? newest : prev;
        });
        scrollToBottom();
      }, 4000);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    // Start immediately if page visible
    if (!document.hidden) startPolling();

    // Pause when tab hidden (save resources); resume on focus
    const onVisibility = () => (document.hidden ? stopPolling() : startPolling());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lastSeenAt]);

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
      username,
      message: input.trim(),
    });
    setInput('');
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: any) => {
    setInput((prev) => prev + (emoji?.native ?? ''));
    setIsTyping(true);
  };

  const getColor = (name: string) => {
    const colors = [
      'text-red-400',
      'text-green-400',
      'text-blue-400',
      'text-yellow-400',
      'text-pink-400',
      'text-purple-400',
      'text-cyan-400',
      'text-orange-400',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const existing = reactions[messageId]?.find(
      (r) => r.emoji === emoji && r.username === username
    );
    if (existing) {
      await supabase.from('reactions').delete().match({ id: existing.id });
    } else {
      await supabase.from('reactions').insert({ message_id: messageId, emoji, username });
    }
  };

  const toMessageString = (m: any): string => {
    if (typeof m?.message === 'string') return m.message;
    if (typeof m?.message?.children === 'string') return m.message.children;
    if (m?.message == null) return '';
    try {
      return typeof m.message === 'object' ? JSON.stringify(m.message) : String(m.message);
    } catch {
      return String(m.message);
    }
  };

  const renderReactions = (messageId: string): JSX.Element => {
    const messageReactions = reactions[messageId] || [];
    const grouped = messageReactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="flex gap-1 mt-2">
        {Object.entries(grouped).map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(messageId, emoji)}
            className="bg-zinc-700 text-white px-2 py-1 text-xs rounded-full hover:bg-zinc-600"
          >
            {String(emoji)} {Number(count)}

          </button>
        ))}
      </div>
    );
  };

  const renderMessage = (m: any) => {
    const messageText = toMessageString(m);
    return (
      <div
        key={m.id}
        className="bg-zinc-800 px-4 py-3 rounded-lg border border-zinc-700 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold uppercase">
            {m.username?.charAt(0)}
          </div>
          <p className={`text-xs font-semibold ${getColor(m.username ?? '')}`}>{m.username}</p>
          <p className="text-[10px] text-zinc-400 ml-auto">
            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="text-white text-sm whitespace-pre-line">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {messageText ?? ''}
          </ReactMarkdown>
        </div>

        {renderReactions(m.id)}
      </div>
    );
  };

  const renderChatPanel = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900">
        {messages.map(renderMessage)}
        {typingUsers.length > 0 && (
          <p className="text-xs text-zinc-400 italic px-1">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative p-3 border-t border-zinc-700 bg-zinc-950 flex flex-col gap-2">
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 z-50 bg-zinc-900 rounded-lg shadow-lg border border-zinc-700">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-zinc-400 hover:text-white text-sm"
                title="Close emoji picker"
              >
                ❌
              </button>
            </div>
            <Picker onEmojiSelect={addEmoji} theme="dark" />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-white text-lg hover:opacity-80"
            title="Emoji"
          >
            😊
          </button>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsTyping(true);
            }}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 rounded-md bg-zinc-800 text-white"
            placeholder="Type a message or emoji..."
          />
          <button
            onClick={sendMessage}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-md"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* DESKTOP CHAT PANEL */}
      <div className="hidden md:flex fixed top-0 right-0 h-screen w-[375px] bg-zinc-900 border-l border-zinc-700 flex-col z-50">
        <div className="p-4 border-b border-zinc-700 text-white font-semibold text-lg bg-zinc-950 shadow flex items-center justify-between">
          💬 Live Chat
          <span className="text-emerald-400 text-xs">● {typingUsers.length + 1} Online</span>
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
          <div className="p-4 border-b border-zinc-700 flex justify-between items-center bg-zinc-900 shadow">
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
