'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import Particles from '@tsparticles/react'

type Message = {
  username: string
  text: string
  timestamp: string
  role: 'viewer' | 'mod' | 'streamer'
}

export default function LiveStreamViewerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const streamId = searchParams.get('id') || 'mock-stream-id'
  const userId = uuidv4()

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'viewer' | 'mod' | 'streamer'>('viewer')
  const [chatOpen, setChatOpen] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

  // Guest username
  useEffect(() => {
    const stored = localStorage.getItem('guest_name')
    if (stored) {
      setUsername(stored)
    } else {
      const generated = `Guest${Math.floor(1000 + Math.random() * 9000)}`
      localStorage.setItem('guest_name', generated)
      setUsername(generated)
    }
  }, [])

  // 🎯 Supabase live viewers + chat listener
  useEffect(() => {
    if (!streamId) return

    const insertViewer = async () => {
      await supabase.from('live_viewers').insert({
        stream_id: streamId,
        user_id: userId,
      })
    }

    const removeViewer = async () => {
      await supabase
        .from('live_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', userId)
    }

    const fetchViewerCount = async () => {
      const { count } = await supabase
        .from('live_viewers')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId)

      setViewerCount(count || 0)
    }

    // 💬 Realtime chat
    const chatChannel = supabase
      .channel(`chat-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          setMessages((prev) => [
            ...prev,
            {
              username: newMsg.username,
              text: newMsg.message,
              timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              role: 'viewer',
            },
          ])
        }
      )
      .subscribe()

    // 👀 Realtime viewer count
    const viewerChannel = supabase
      .channel(`viewers-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_viewers',
          filter: `stream_id=eq.${streamId}`,
        },
        fetchViewerCount
      )
      .subscribe()

    // Insert viewer and fetch count
    insertViewer()
    fetchViewerCount()

    window.addEventListener('beforeunload', removeViewer)

    return () => {
      removeViewer()
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(viewerChannel)
      window.removeEventListener('beforeunload', removeViewer)
    }
  }, [streamId, userId])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const timestamp = new Date().toISOString()

    const { error } = await supabase.from('live_chat_messages').insert([
      {
        stream_id: streamId,
        user_id: userId,
        username,
        message: newMessage,
        timestamp,
      },
    ])

    if (error) {
      console.error('Error sending message:', error)
    }

    setNewMessage('')
  }

  return (
    <main className="flex h-screen bg-black text-white overflow-hidden">
      {/* Left - Video */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background FX */}
        <Particles
          id="tsparticles"
          className="absolute inset-0 z-0"
          options={{
            fullScreen: false,
            background: { color: '#000' },
            particles: {
              number: { value: 55 },
              color: { value: '#10b981' },
              shape: { type: 'circle' },
              opacity: { value: 0.15 },
              size: { value: 2 },
              move: { enable: true, speed: 0.5 },
            },
          }}
        />

        {/* Header */}
        <div className="z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
          <div>
            <h2 className="text-lg font-semibold">🔥 StreamerName</h2>
            <p className="text-sm text-zinc-400">
              Live Now · Category: IRL · 👀 {viewerCount} watching
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-emerald-400 text-sm hover:text-emerald-300"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex items-center justify-center z-10 border-t border-zinc-800 bg-black">
          <div className="w-[96%] h-[90%] max-w-[1440px] border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 text-xl bg-black">
            🎥 [Mock Stream Playing Here]
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-zinc-800 bg-zinc-900 text-sm text-zinc-400 z-10">
          🎉 Reactions coming soon!
        </div>
      </div>

      {/* Chat Panel */}
      <div className="hidden md:flex flex-col w-[360px] border-l border-zinc-800 bg-zinc-900">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="font-semibold text-white">💬 Chat</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm italic text-zinc-500">No messages yet.</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm">
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`font-semibold ${
                        msg.role === 'streamer'
                          ? 'text-emerald-400'
                          : msg.role === 'mod'
                          ? 'text-purple-400'
                          : 'text-white'
                      }`}
                    >
                      {msg.username}
                    </span>
                    <span className="text-xs text-zinc-400">{msg.timestamp}</span>
                  </div>
                  <div className="text-zinc-200 text-sm bg-zinc-800 rounded-lg px-3 py-2 inline-block mt-1 max-w-[80%] break-words">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-zinc-800 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message"
              className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSendMessage}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Send
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => alert('✨ Thanks for the tip!')}
              className="px-3 py-1 text-sm rounded-md bg-amber-500 text-black hover:bg-amber-400"
            >
              Tip 5 Tokens
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
