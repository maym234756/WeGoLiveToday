// apps/web/components/LiveChatBox.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

type ChatRow = {
  id: string;
  username: string;
  message: unknown;
  created_at: string;
  status?: 'pending' | 'sent' | 'failed'; // why: optimistic feedback
};

type Reaction = { id: string; message_id: string; emoji: string; username: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveChatBox() {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const baseMs = 4000;
  const maxMs = 30000;
  const factor = 1.6;
  const currentDelayRef = useRef<number>(baseMs);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    const stored = localStorage.getItem('waitlist_name');
    if (stored) setUsername(stored);
  }, []);

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: Math.max(0, messages.length - 1),
      align: 'end',
      behavior: 'auto',
    });
  };

  const toMessageString = (m: ChatRow): string => {
    const v = m?.message as unknown;
    if (typeof v === 'string') return v;
    if (typeof (v as any)?.children === 'string') return (v as any).children;
    if (v == null) return '';
    try { return typeof v === 'object' ? JSON.stringify(v) : String(v); }
    catch { return String(v); }
  };

  const mergeAndSort = (prev: ChatRow[], incoming: ChatRow[]) => {
    const map = new Map(prev.map((m) => [m.id, m]));
    for (const m of incoming) {
      const existing = map.get(m.id);
      // why: keep optimistic fields but prefer server data
      map.set(m.id, { ...existing, ...m, status: 'sent' });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  // Initial data + realtime
  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('comingsoon_chat')
        .select('*')
        .order('created_at', { ascending: true });
      const safe = ((data ?? []) as ChatRow[]).map((r) => ({ ...r, status: 'sent' }));
      setMessages(safe);
      setLastSeenAt(safe.length ? safe[safe.length - 1].created_at : null);
      requestAnimationFrame(scrollToBottom);
    };

    const fetchReactions = async () => {
      const { data } = await supabase.from('reactions').select('*');
      const grouped =
        (data as Reaction[] | null)?.reduce((acc, r) => {
          (acc[r.message_id] ??= []).push(r);
          return acc;
        }, {} as Record<string, Reaction[]>) ?? {};
      setReactions(grouped);
    };

    fetchInitial();
    fetchReactions();

    const messageSub = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comingsoon_chat' },
        (payload) => {
          const row = payload.new as ChatRow;
          setMessages((prev) => mergeAndSort(prev, [{ ...row, status: 'sent' }]));
          setLastSeenAt((prev) =>
            !prev || new Date(row.created_at) > new Date(prev) ? row.created_at : prev
          );
          currentDelayRef.current = baseMs;
          if (atBottomRef.current) scrollToBottom();
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

  // Smart polling with backoff (unchanged)
  useEffect(() => {
    const clearTimer = () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
    const scheduleNext = (ms: number) => {
      clearTimer();
      pollTimeoutRef.current = setTimeout(tick, ms);
    };
    const tick = async () => {
      const since = lastSeenAt;
      if (!since) return scheduleNext(baseMs);

      if (document.hidden) {
        try {
          const res = await fetch('/api/new-message-count', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ since }),
          });
          const { count = 0 } = (await res.json()) as { count: number };
          if (count === 0) {
            currentDelayRef.current = Math.min(
              Math.floor(currentDelayRef.current * factor),
              maxMs
            );
            return scheduleNext(currentDelayRef.current);
          }
        } catch { /* ignore */ }
      }

      const { data, error } = await supabase
        .from('comingsoon_chat')
        .select('*')
        .gt('created_at', since)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const rows = (data as ChatRow[]).map((r) => ({ ...r, status: 'sent' }));
        setMessages((prev) => mergeAndSort(prev, rows));
        const newest = rows[rows.length - 1].created_at;
        setLastSeenAt((prev) =>
          !prev || new Date(newest) > new Date(prev) ? newest : prev
        );
        currentDelayRef.current = baseMs;
        if (atBottomRef.current) scrollToBottom();
      } else {
        currentDelayRef.current = Math.min(
          Math.floor(currentDelayRef.current * factor),
          maxMs
        );
      }
      scheduleNext(currentDelayRef.current);
    };

    scheduleNext(document.hidden ? 8000 : baseMs);
    const onVisibility = () => {
      currentDelayRef.current = baseMs;
      scheduleNext(baseMs);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lastSeenAt]);

  useEffect(() => {
    if (!isTyping) return;
    const t = setTimeout(() => setIsTyping(false), 2000);
    return () => clearTimeout(t);
  }, [input]);

  // ---- OPTIMISTIC SEND ----
  const sendMessage = async () => {
    const raw = input;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const id = crypto.randomUUID(); // why: dedupe optimistic & realtime paths
    const optimistic: ChatRow = {
      id,
      username,
      message: trimmed,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    setMessages((prev) => {
      const next = [...prev, optimistic];
      return next.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    setLastSeenAt((prev) => optimistic.created_at);
    setInput('');
    setShowEmojiPicker(false);
    if (atBottomRef.current) requestAnimationFrame(scrollToBottom);

    // fire-and-forget insert; same id ensures merge without duplication
    supabase
      .from('comingsoon_chat')
      .insert({ id, username, message: trimmed, created_at: optimistic.created_at })
      .then(({ error }) => {
        if (error) {
          // show failed state; user can retry
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: 'failed' } : m))
          );
        } else {
          // success: realtime will mark as sent; fallback just in case
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: 'sent' } : m))
          );
        }
      });
  };

  const retrySend = async (msg: ChatRow) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'pending' } : m)));
    const { error } = await supabase
      .from('comingsoon_chat')
      .insert({ id: msg.id, username: msg.username, message: toMessageString(msg), created_at: msg.created_at });
    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'failed' } : m)));
    } else {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sent' } : m)));
    }
  };

  const addEmoji = (emoji: any) => {
    setInput((prev) => prev + (emoji?.native ?? ''));
    setIsTyping(true);
  };

  const getColor = (name: string) => {
    const colors = [
      'text-red-400','text-green-400','text-blue-400','text-yellow-400',
      'text-pink-400','text-purple-400','text-cyan-400','text-orange-400',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const existing = reactions[messageId]?.find(
      (r) => r.emoji === emoji && r.username === username
    );
    if (existing) await supabase.from('reactions').delete().match({ id: existing.id });
    else await supabase.from('reactions').insert({ message_id: messageId, emoji, username });
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
            {emoji} {count}
          </button>
        ))}
      </div>
    );
  };

  const renderMessage = (m: ChatRow): ReactNode => {
    const messageText = toMessageString(m);
    const isPending = m.status === 'pending';
    const isFailed = m.status === 'failed';

    return (
      <div
        className={[
          'max-w-[92%] md:max-w-[85%] bg-zinc-800 px-4 py-3 rounded-lg border shadow-sm',
          isFailed ? 'border-red-500' : 'border-zinc-700',
          isPending ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 mb-1 min-w-0">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold uppercase flex-none">
            {m.username?.[0] ?? '?'}
          </div>
          <p className={`text-xs font-semibold ${getColor(m.username ?? '')} truncate max-w-[50%]`}>
            {m.username}
          </p>
          <p className="text-[10px] text-zinc-400 ml-auto flex items-center gap-2 flex-none">
            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isPending && <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" title="Sending" />}
            {isFailed && (
              <button
                onClick={() => retrySend(m)}
                className="text-red-400 hover:text-red-300 text-[10px] underline"
                title="Retry send"
              >
                Retry
              </button>
            )}
          </p>
        </div>

        <div className="text-white text-sm whitespace-pre-wrap break-words hyphens-auto leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText}</ReactMarkdown>
        </div>

        {renderReactions(m.id)}
      </div>
    );
  };

  const renderChatPanel = () => (
    <>
      <div className="flex-1 bg-zinc-900">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          itemContent={(_, item) => renderMessage(item)}
          followOutput={(isAtBottom) => {
            atBottomRef.current = isAtBottom;
            return isAtBottom ? 'smooth' : false;
          }}
          overscan={400}
          className="h-full p-4 flex flex-col items-stretch gap-4"
        />
      </div>

      <div
        className="relative p-3 border-t border-zinc-700 bg-zinc-950 flex flex-col gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
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

        <div className="flex gap-2 items-center min-w-0">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-white text-lg hover:opacity-80 flex-none"
            title="Emoji"
          >
            😊
          </button>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setIsTyping(true); }}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="w-full min-w-0 px-3 py-2 rounded-md bg-zinc-800 text-white placeholder:text-zinc-400"
            placeholder="Type a message or emoji..."
          />
          <button
            onClick={sendMessage}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md flex-none"
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
          <span className="text-emerald-400 text-xs">● 1+ Online</span>
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
            <span className="text-white font-semibold text-lg">💬 Live Chat - Drop Comment</span>
            <button onClick={() => setIsMobileOpen(false)} className="text-zinc-400 hover:text-white text-sm">
              Close
            </button>
          </div>
          {renderChatPanel()}
        </div>
      )}
    </>
  );
}
