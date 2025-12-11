'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import Linkify from 'linkify-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveChatBox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

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
    };

    const fetchReactions = async () => {
      const { data } = await supabase
        .from('reactions')
        .select('*')
        .order('created_at', { ascending: true });

      setReactions(data || []);
    };

    fetchMessages();
    fetchReactions();

    const messageChannel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comingsoon_chat',
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel('chat-reactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload) => {
          // Handle both INSERT and DELETE for real-time sync
          setReactions((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new];
            } else if (payload.eventType === 'DELETE') {
              return prev.filter((r) => r.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel('chat-presence', {
      config: {
        presence: {
          key: username || 'Guest',
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.keys(state);
        setOnlineUsers(users);
      })
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionsChannel);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [username]);

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
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: any) => {
    setInput((prev) => prev + emoji.native);
    setIsTyping(true);
  };

  const toggleReaction = async (messageId: number, emoji: string) => {
    const existing = reactions.find(
      (r) => r.message_id === messageId && r.username === username && r.emoji === emoji
    );

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('reactions').insert({
        message_id: messageId,
        username: username || 'Guest',
        emoji,
      });
    }
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

  const renderMessage = (m: any) => {
    const isSelf = m.username === username;

    // Group reactions for this message
    const messageReactions = reactions
      .filter((r) => r.message_id === m.id)
      .reduce((acc: Record<string, { count: number; reactedByUser: boolean }>, r) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = { count: 0, reactedByUser: false };
        }
        acc[r.emoji].count++;
        if (r.username === username) {
          acc[r.emoji].reactedByUser = true;
        }
        return acc;
      }, {});

    return (
      <div
        key={m.id}
        className={`px-4 py-3 rounded-lg border shadow-md max-w-[85%] transition-all duration-200 ${
          isSelf
            ? 'ml-auto bg-emerald-700/20 border-emerald-700'
            : 'bg-zinc-800 border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold uppercase">
            {m.username.charAt(0)}
          </div>
          <p className={`text-xs font-semibold ${getColor(m.username)}`}>
            {isSelf ? 'You' : m.username}
          </p>
          <p className="text-[10px] text-zinc-400 ml-auto">
            {new Date(m.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="text-white text-sm whitespace-pre-line">
          <Linkify options={{ target: '_blank' }}>
            <ReactMarkdown>{m.message}</ReactMarkdown>
          </Linkify>
        </div>

        {/* Persistent Reactions */}
        <div className="mt-2 flex gap-2 flex-wrap text-sm">
          {Object.entries(messageReactions).map(([emoji, { count, reactedByUser }]) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(m.id, emoji)}
              className={`px-2 py-1 rounded-full bg-zinc-700 border text-white flex items-center gap-1 ${
                reactedByUser ? 'border-emerald-400' : 'border-transparent'
              }`}
            >
              <span>{emoji}</span>
              <span className="text-xs">{count}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderChatPanel = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900">
        {messages.map(renderMessage)}
        {isTyping && (
          <p className="text-xs text-zinc-400 italic px-1">Someone is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative p-3 border-t border-zinc-700 bg-zinc-950 flex flex-col gap-2">
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 z-50 bg-zinc-900 rounded-lg shadow-lg border border-zinc-700 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-zinc-400 hover:text-white text-sm"
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
            className="text-white text-2xl hover:scale-110 transition"
          >
            😊
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsTyping(true);
            }}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 rounded-md bg-zinc-800 text-white placeholder:text-zinc-400"
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
    </>
  );

  return (
    <>
      {/* DESKTOP CHAT PANEL */}
      <div className="hidden md:flex fixed top-0 right-0 h-screen w-[380px] bg-zinc-900 border-l border-zinc-700 flex-col z-50">
        <div className="p-4 border-b border-zinc-700 text-white font-semibold text-lg bg-zinc-950 shadow flex justify-between">
          <span>💬 Live Chat</span>
          <span className="text-emerald-400 text-xs">● {onlineUsers.length} Online</span>
        </div>
        {renderChatPanel()}
      </div>

      {/* MOBILE TOGGLE BUTTON */}
      <button
        onClick={() => {
          setIsMobileOpen(true);
          setTimeout(() => inputRef.current?.focus(), 300);
        }}
        className="md:hidden fixed bottom-5 right-5 z-50 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg"
      >
        💬
      </button>

      {/* MOBILE CHAT PANEL */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-zinc-950 z-50 flex flex-col animate-in fade-in duration-200">
          <div className="p-4 border-b border-zinc-700 flex justify-between items-center bg-zinc-900 shadow">
            <span className="text-white font-semibold text-lg">💬 Live Chat</span>
            <span className="text-emerald-400 text-xs">● {onlineUsers.length} Online</span>
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
