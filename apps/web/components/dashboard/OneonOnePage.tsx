// components/dashboard/OneOnOnePage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity, FiAlertTriangle, FiBell, FiCheck, FiCopy, FiFlag, FiGlobe, FiHash,
  FiHeadphones, FiHelpCircle, FiMic, FiMicOff, FiMonitor, FiPlay, FiRefreshCw,
  FiSearch, FiShield, FiSkipForward, FiSlash, FiStopCircle, FiUser, FiUsers,
  FiVideo, FiVideoOff, FiX, FiClock, FiMessageSquare, FiSettings, FiThumbsDown, FiThumbsUp, FiInfo
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) TYPES                                                                    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type Stage = 'idle' | 'searching' | 'matched' | 'connecting' | 'connected' | 'ended';
type LanguageCode = 'en'|'es'|'fr'|'de'|'pt'|'it'|'ja'|'ko';
type ReportReason = 'nudity'|'harassment'|'spam'|'hate'|'underage'|'other';

type Prefs = {
  language: LanguageCode;
  interests: string;      // comma separated
  safeMode: boolean;      // blur/obscure until both ready
  allowScreenShare: boolean;
};

type PeerMeta = {
  id: string;
  language: LanguageCode;
  interests: string[];
  ts: number;
};

type ChatMsg = { id: string; from: 'me'|'peer'; text: string; ts: number };

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) PERSISTENCE HOOK                                                         │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue] as const;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) SIGNALING (DEMO)                                                         │
   │ Swap this with your WebSocket backend.                                     │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type Signal =
  | { type: 'presence'; peer: PeerMeta }
  | { type: 'match-request'; from: string; to: string }
  | { type: 'match-accept'; from: string; to: string }
  | { type: 'rtc-offer'; from: string; to: string; sdp: any }
  | { type: 'rtc-answer'; from: string; to: string; sdp: any }
  | { type: 'rtc-ice'; from: string; to: string; candidate: any }
  | { type: 'leave'; from: string }
  | { type: 'ready'; from: string }
  | { type: 'chat'; from: string; to: string; text: string };

interface SignalingClient {
  id: string;
  send: (payload: Signal) => void;
  onMessage: (fn: (msg: Signal) => void) => () => void;
  dispose: () => void;
}

// Local demo using BroadcastChannel (works across tabs)
class BroadcastChannelSignaling implements SignalingClient {
  id: string;
  private bc: BroadcastChannel;
  private handlers = new Set<(msg: Signal)=>void>();
  constructor(id: string) {
    this.id = id;
    this.bc = new BroadcastChannel('wegolive-1on1');
    this.bc.onmessage = (e) => this.handlers.forEach(h => h(e.data));
  }
  send(payload: Signal) { this.bc.postMessage(payload); }
  onMessage(fn: (msg: Signal)=>void) { this.handlers.add(fn); return () => this.handlers.delete(fn); }
  dispose() { this.bc.close(); this.handlers.clear(); }
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) P2P (WebRTC)                                                             │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function attach(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el) return;
  // @ts-ignore
  el.srcObject = stream || null;
  if (stream) el.play().catch(() => {});
}

type P2P = {
  local: MediaStream | null;
  remote: MediaStream | null;
  start: () => Promise<void>;
  stop: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreen: () => Promise<void>;
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  pc: RTCPeerConnection | null;
};

function useP2P(opts: {
  allowScreen: boolean;
  onOffer: (desc: any) => void;
  onAnswer: (desc: any) => void;
  onIce: (candidate: any) => void;
}) : P2P {
  const { allowScreen, onOffer, onAnswer, onIce } = opts;
  const [local, setLocal] = useState<MediaStream|null>(null);
  const [remote, setRemote] = useState<MediaStream|null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const ensurePC = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.ontrack = (e) => setRemote(prev => {
      const s = prev || new MediaStream();
      e.streams[0].getTracks().forEach(t => !s.getTracks().includes(t) && s.addTrack(t));
      return s;
    });
    pc.onicecandidate = (e) => e.candidate && onIce(e.candidate);
    pcRef.current = pc;
    return pc;
  };

  const start = async () => {
    const pc = ensurePC();
    if (!local) {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      s.getAudioTracks().forEach(t => t.enabled = micOn);
      s.getVideoTracks().forEach(t => t.enabled = camOn);
      setLocal(s);
      s.getTracks().forEach(t => pc.addTrack(t, s));
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    onOffer(offer);
  };

  const stop = () => {
    pcRef.current?.getSenders().forEach(s => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    local?.getTracks().forEach(t => t.stop());
    setLocal(null);
    setRemote(null);
    setScreenOn(false);
  };

  const toggleMic = () => {
    const next = !micOn; setMicOn(next);
    local?.getAudioTracks().forEach(t => t.enabled = next);
  };
  const toggleCam = () => {
    const next = !camOn; setCamOn(next);
    local?.getVideoTracks().filter(t => t.kind === 'video' && t.label.toLowerCase().includes('camera')).forEach(t => t.enabled = next);
  };
  const toggleScreen = async () => {
    if (!allowScreen) return;
    const pc = ensurePC();
    if (!screenOn) {
      const scr = await (navigator.mediaDevices as any).getDisplayMedia?.({ video: true }).catch(() => null);
      if (!scr) return;
      setScreenOn(true);
      const track = scr.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(track);
      track.onended = () => { setScreenOn(false); };
    } else {
      const camTrack = local?.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
      setScreenOn(false);
    }
  };

  // remote setters
  const api = { local, remote, start, stop, toggleMic, toggleCam, toggleScreen, micOn, camOn, screenOn, pc: pcRef.current };

  // inbound SDP/ICE handlers returned for parent to bind
  (api as any)._applyAnswer = async (desc: any) => {
    const pc = ensurePC();
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
  };
  (api as any)._applyOffer = async (desc: any) => {
    const pc = ensurePC();
    if (!local) {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocal(s);
      s.getTracks().forEach(t => pc.addTrack(t, s));
    }
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    onAnswer(answer);
  };
  (api as any)._applyIce = async (cand: any) => {
    const pc = ensurePC();
    try { await pc.addIceCandidate(cand); } catch {}
  };

  return api;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) SMALL UI PRIMITIVES                                                      │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function Card({ title, icon, right, children, className = '', bodyClass = '' }:{
  title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-200">{icon}{title}</div>
        {right}
      </header>
      <div className={`p-4 ${bodyClass}`}>{children}</div>
    </section>
  );
}
function Pill({ children, onClick, tone = 'zinc', icon, disabled }:{
  children: React.ReactNode; onClick?: () => void; tone?: 'zinc'|'emerald'|'rose'|'amber'; icon?: React.ReactNode; disabled?: boolean;
}) {
  const map: Record<string,string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white',
  };
  return <button disabled={!!disabled} onClick={onClick} className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition ${map[tone]} disabled:opacity-50`}>{icon}{children}</button>;
}
function LabeledInput({ label, value, onChange, placeholder }:{
  label: string; value: string; onChange?: (v:string)=>void; placeholder?: string;
}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm text-zinc-400">{label}</label>
      <input id={id} value={value} onChange={(e)=>onChange?.(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"/>
    </div>
  );
}
function Select<T extends string>({ label, value, onChange, options }:{
  label: string; value: T; onChange: (v:T)=>void; options: Array<{label:string; value:T}>;
}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm text-zinc-400">{label}</label>
      <select id={id} value={value} onChange={(e)=>onChange(e.target.value as T)}
        className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 6) TOXICITY (NAIVE CLIENT FILTER)                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const BAD_WORDS = ['slur1','slur2','kys','suicide','nazi','hitler']; // placeholder list
function cleanText(s: string) {
  const lower = s.toLowerCase();
  if (BAD_WORDS.some(w => lower.includes(w))) return null;
  return s;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 7) PAGE                                                                      │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function OneOnOnePage() {
  const myId = useMemo(() => Math.random().toString(36).slice(2, 9), []);
  const [prefs, setPrefs] = useLocalStorage<Prefs>('oneonone.prefs', {
    language: 'en', interests: 'gaming, music', safeMode: true, allowScreenShare: false,
  });
  const [blocklist, setBlocklist] = useLocalStorage<string[]>('oneonone.block', []);
  const [stage, setStage] = useState<Stage>('idle');
  const [status, setStatus] = useState('Ready');
  const [peer, setPeer] = useState<PeerMeta | null>(null);
  const [bothReady, setBothReady] = useState(false);
  const [iAmReady, setIAmReady] = useState(false);
  const [skipCooldown, setSkipCooldown] = useState(0);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const remoteVideoRef = useRef<HTMLVideoElement|null>(null);
  const localVideoRef = useRef<HTMLVideoElement|null>(null);

  // signaling (replace with your WebSocket server later)
  const signaling = useMemo<SignalingClient>(() => new BroadcastChannelSignaling(myId), [myId]);

  // P2P hook
  const p2p = useP2P({
    allowScreen: prefs.allowScreenShare,
    onOffer: (sdp) => peer && signaling.send({ type:'rtc-offer', from: myId, to: peer.id, sdp }),
    onAnswer: (sdp) => peer && signaling.send({ type:'rtc-answer', from: myId, to: peer.id, sdp }),
    onIce: (candidate) => peer && signaling.send({ type:'rtc-ice', from: myId, to: peer.id, candidate }),
  });

  // attach streams
  useEffect(() => { attach(localVideoRef.current, p2p.local); }, [p2p.local]);
  useEffect(() => { attach(remoteVideoRef.current, p2p.remote); }, [p2p.remote]);

  // presence & queue (demo)
  useEffect(() => {
    const meta: PeerMeta = {
      id: myId,
      language: prefs.language,
      interests: prefs.interests.split(',').map(s => s.trim()).filter(Boolean),
      ts: Date.now(),
    };
    const off = signaling.onMessage(async (msg) => {
      if ('to' in msg && msg.to && msg.to !== myId) return;

      if (msg.type === 'presence') {
        if (stage === 'searching' && msg.peer.id !== myId) {
          const okLang = !prefs.language || msg.peer.language === prefs.language;
          const myInterests = meta.interests;
          const peerInterests = msg.peer.interests;
          const overlap = myInterests.some(i => peerInterests.includes(i));
          const notBlocked = !blocklist.includes(msg.peer.id);
          if (okLang && (overlap || myInterests.length === 0) && notBlocked) {
            setPeer(msg.peer);
            setStage('matched');
            setStatus('Matched — establishing connection...');
            signaling.send({ type:'match-request', from: myId, to: msg.peer.id });
          }
        }
      }

      if (msg.type === 'match-request') {
        if (stage === 'searching' && !blocklist.includes(msg.from)) {
          setPeer({ id: msg.from, language: prefs.language, interests: [], ts: Date.now() });
          setStage('matched');
          setStatus('Match request — accepting…');
          signaling.send({ type:'match-accept', from: myId, to: msg.from });
        }
      }

      if (msg.type === 'match-accept') {
        if (stage === 'matched' && peer && msg.from === peer.id) {
          setStage('connecting');
          setStatus('Connecting…');
          await p2p.start();
        }
      }

      if (msg.type === 'rtc-offer') {
        setStage('connecting'); setStatus('Answering…');
        await (p2p as any)._applyOffer(msg.sdp);
      }
      if (msg.type === 'rtc-answer') {
        await (p2p as any)._applyAnswer(msg.sdp);
        setStage('connected'); setStatus('Connected');
      }
      if (msg.type === 'rtc-ice') {
        await (p2p as any)._applyIce(msg.candidate);
      }
      if (msg.type === 'ready') {
        if (peer && msg.from === peer.id) {
          if (iAmReady) setBothReady(true);
        }
      }
      if (msg.type === 'leave') {
        endSession('Peer left');
      }
      if (msg.type === 'chat') {
        if (peer && msg.from === peer.id) {
          setChat(c => [...c, { id: Math.random().toString(36), from:'peer', text: msg.text, ts: Date.now() }]);
        }
      }
    });

    // announce presence periodically while searching
    let presTimer: any;
    if (stage === 'searching') {
      presTimer = setInterval(() => signaling.send({ type:'presence', peer: meta }), 1200);
      signaling.send({ type:'presence', peer: meta });
    }
    return () => { off(); clearInterval(presTimer); };
  }, [stage, prefs.language, prefs.interests, blocklist, iAmReady, peer, signaling, myId, p2p]);

  // cooldown timer
  useEffect(() => {
    if (skipCooldown <= 0) return;
    const t = setInterval(() => setSkipCooldown(s => (s>0 ? s-1 : 0)), 1000);
    return () => clearInterval(t);
  }, [skipCooldown]);

  // actions
  const startSearch = () => { setPeer(null); setStage('searching'); setStatus('Searching for a great match…'); };
  const skip = () => { if (skipCooldown>0) return; endSession('Skipped'); setSkipCooldown(5); startSearch(); };
  const endSession = (why = 'Ended') => {
    if (peer) signaling.send({ type:'leave', from: myId });
    p2p.stop();
    setPeer(null);
    setBothReady(false);
    setIAmReady(false);
    setChat([]);
    setStage('ended');
    setStatus(why);
  };

  const markReady = () => {
    setIAmReady(true);
    signaling.send({ type:'ready', from: myId });
  };

  const report = (reason: ReportReason) => {
    // TODO: send to backend
    setReportOpen(false);
    // Optionally auto-block for severe reasons
    if (reason === 'nudity' || reason === 'underage' || reason === 'hate') {
      blockPeer();
    }
  };

  const blockPeer = () => {
    if (peer) setBlocklist([...new Set([...blocklist, peer.id])]);
    endSession('Blocked');
  };

  const sendChat = (text: string) => {
    const cleaned = cleanText(text);
    if (!cleaned || !peer) return;
    signaling.send({ type:'chat', from: myId, to: peer.id, text: cleaned });
    setChat(c => [...c, { id: Math.random().toString(36), from:'me', text: cleaned, ts: Date.now() }]);
  };

  // hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'm' || e.key === 'M') p2p.toggleMic();
      if (e.key === 'v' || e.key === 'V') p2p.toggleCam();
      if (e.key === 's' || e.key === 'S') p2p.toggleScreen();
      if (e.key === ' ') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p2p, skipCooldown]);

  // UI helpers
  const interestsArr = useMemo(() => prefs.interests.split(',').map(s=>s.trim()).filter(Boolean), [prefs.interests]);

  return (
    <main className="min-h-screen bg-black text-white w-full max-w-none overflow-hidden py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-emerald-400 inline-flex items-center gap-2"><FiUsers/> 1-on-1 Live</h1>
          <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">{status}</span>
          {stage === 'connected' && (
            <span className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-700">Connected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stage === 'idle' || stage === 'ended' ? (
            <Pill tone="emerald" icon={<FiPlay />} onClick={startSearch}>Start</Pill>
          ) : (
            <>
              <Pill tone="amber" icon={<FiSkipForward />} onClick={skip} disabled={skipCooldown>0}>
                {skipCooldown>0 ? `Skip (${skipCooldown})` : 'Skip'}
              </Pill>
              <Pill tone="rose" icon={<FiStopCircle />} onClick={()=>endSession('Ended by you')}>End</Pill>
            </>
          )}
          <Pill tone="zinc" icon={<FiHelpCircle />} onClick={()=>alert('Hotkeys: M mic, V cam, S screen, Space skip')}>Help</Pill>
        </div>
      </div>

      {/* Preferences */}
      <Card
        title="Match Preferences"
        icon={<FiSettings className="text-emerald-400" />}
        right={<Pill tone="zinc" icon={<FiRefreshCw />} onClick={()=>setPrefs({...prefs})}>Apply</Pill>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Select
            label="Language"
            value={prefs.language}
            onChange={(v)=>setPrefs({...prefs, language: v})}
            options={[
              {label:'English', value:'en'},{label:'Español', value:'es'},{label:'Français', value:'fr'},
              {label:'Deutsch', value:'de'},{label:'Português', value:'pt'},{label:'Italiano', value:'it'},
              {label:'日本語', value:'ja'},{label:'한국어', value:'ko'},
            ]}
          />
          <LabeledInput label="Interests" value={prefs.interests} onChange={(v)=>setPrefs({...prefs, interests: v})} placeholder="e.g. gaming, music"/>
          <div className="flex items-end">
            <label className="w-full inline-flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2">
              <span className="text-sm text-zinc-300">Safe start (blur until ready)</span>
              <input type="checkbox" className="accent-emerald-500" checked={prefs.safeMode} onChange={(e)=>setPrefs({...prefs, safeMode: e.target.checked})}/>
            </label>
          </div>
          <div className="flex items-end">
            <label className="w-full inline-flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2">
              <span className="text-sm text-zinc-300">Allow screen share</span>
              <input type="checkbox" className="accent-emerald-500" checked={prefs.allowScreenShare} onChange={(e)=>setPrefs({...prefs, allowScreenShare: e.target.checked})}/>
            </label>
          </div>
        </div>
        {interestsArr.length>0 && (
          <div className="mt-3 text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
            <FiHash/>{interestsArr.map((t,i)=><span key={i} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{t}</span>)}
          </div>
        )}
      </Card>

      {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 min-w-0">
          {/* Remote video */}
          <Card
            title="Partner"
            icon={<FiUser className="text-emerald-400" />}
            className="lg:col-span-8 min-w-0"
            bodyClass="relative min-w-0"
          >
            <div className="relative w-full aspect-video bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden min-w-0">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${
                  prefs.safeMode && !bothReady ? 'blur-xl scale-[1.02]' : ''
                }`}
              />

              {(stage === 'searching' || stage === 'matched' || stage === 'connecting') && (
                <div className="absolute inset-0 grid place-items-center text-zinc-400 text-sm px-4 text-center">
                  {stage === 'searching' && 'Looking for a great match…'}
                  {stage === 'matched' && 'Match found — setting things up…'}
                  {stage === 'connecting' && 'Connecting…'}
                </div>
              )}

              {stage === 'connected' && prefs.safeMode && !bothReady && (
                <div className="absolute inset-0 grid place-items-center p-3">
                  <div className="w-full max-w-sm bg-black/60 backdrop-blur-md border border-zinc-800 rounded-xl px-5 py-4 text-center">
                    <p className="text-zinc-200 font-medium">Safe Start</p>
                    <p className="text-zinc-400 text-sm mt-1">
                      Both users must press Ready to reveal video.
                    </p>

                    {/* Buttons wrap on phone */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <Pill
                        tone="emerald"
                        icon={<FiCheck />}
                        onClick={markReady}
                        disabled={iAmReady}
                      >
                        {iAmReady ? 'Waiting…' : 'I am ready'}
                      </Pill>
                      <Pill
                        tone="zinc"
                        icon={<FiSkipForward />}
                        onClick={skip}
                        disabled={skipCooldown > 0}
                      >
                        {skipCooldown > 0 ? `Skip (${skipCooldown})` : 'Skip'}
                      </Pill>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* bottom controls */}
            <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
              <Pill
                tone={p2p.micOn ? 'zinc' : 'rose'}
                icon={p2p.micOn ? <FiMic /> : <FiMicOff />}
                onClick={p2p.toggleMic}
              >
                {p2p.micOn ? 'Mic On' : 'Mic Off'}
              </Pill>

              <Pill
                tone={p2p.camOn ? 'zinc' : 'rose'}
                icon={p2p.camOn ? <FiVideo /> : <FiVideoOff />}
                onClick={p2p.toggleCam}
              >
                {p2p.camOn ? 'Cam On' : 'Cam Off'}
              </Pill>

              <Pill
                tone="zinc"
                icon={<FiMonitor />}
                onClick={p2p.toggleScreen}
                disabled={!prefs.allowScreenShare}
              >
                {p2p.screenOn ? 'Stop Share' : 'Share Screen'}
              </Pill>

              {/* On phone: actions drop to a new row. On md+: push to right */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
                <Pill tone="zinc" icon={<FiThumbsUp />} onClick={() => console.log('liked')}>
                  Good match
                </Pill>
                <Pill tone="zinc" icon={<FiThumbsDown />} onClick={() => console.log('meh')}>
                  Not my vibe
                </Pill>
                <Pill tone="rose" icon={<FiFlag />} onClick={() => setReportOpen(true)}>
                  Report
                </Pill>
                <Pill tone="rose" icon={<FiSlash />} onClick={blockPeer}>
                  Block
                </Pill>
              </div>
            </div>
          </Card>

          {/* Local + chat */}
          <div className="lg:col-span-4 space-y-4 min-w-0">
            <Card title="You" icon={<FiHeadphones className="text-emerald-400" />}>
              <div className="relative w-full aspect-video bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden min-w-0">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {stage !== 'connected' && p2p.local == null && (
                  <div className="absolute inset-0 grid place-items-center text-zinc-500 text-sm px-4 text-center">
                    Your camera will appear here
                  </div>
                )}
              </div>

              {/* Wrap hotkeys text on phone */}
              <div className="mt-2 text-xs text-zinc-500 flex flex-wrap items-center gap-2 min-w-0">
                <FiInfo /> <span>Hotkeys:</span>
                <kbd className="px-1 bg-zinc-800 rounded">M</kbd> <span>mic,</span>
                <kbd className="px-1 bg-zinc-800 rounded">V</kbd> <span>cam,</span>
                <kbd className="px-1 bg-zinc-800 rounded">S</kbd> <span>screen,</span>
                <kbd className="px-1 bg-zinc-800 rounded">Space</kbd> <span>skip</span>
              </div>
            </Card>

            <Card
              title="Chat"
              icon={<FiMessageSquare className="text-emerald-400" />}
              bodyClass="flex flex-col min-w-0"
            >
              {/* Use a smaller height on phones, taller on larger */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] sm:min-h-[300px] lg:h-[38vh] min-w-0">
                {chat.map((m) => (
                  <div
                    key={m.id}
                    className={`text-sm min-w-0 break-words ${
                      m.from === 'me' ? 'text-zinc-200' : 'text-zinc-300'
                    }`}
                  >
                    <span className={m.from === 'me' ? 'text-emerald-400' : 'text-fuchsia-400'}>
                      {m.from === 'me' ? 'You' : 'Partner'}
                    </span>
                    : {m.text}
                  </div>
                ))}
              </div>

              <ChatInput onSend={sendChat} disabled={!peer} />
            </Card>
          </div>
        </div>


      {/* report modal */}
      {reportOpen && (
        <Modal title="Report user" onClose={()=>setReportOpen(false)} footer={
          <div className="flex items-center justify-end gap-2">
            <Pill tone="zinc" icon={<FiX/>} onClick={()=>setReportOpen(false)}>Cancel</Pill>
            <Pill tone="rose" icon={<FiFlag/>} onClick={()=>report('other')}>Submit</Pill>
          </div>
        }>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(['nudity','harassment','spam','hate','underage'] as ReportReason[]).map(r=>(
                <button key={r} onClick={()=>report(r)} className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-100 capitalize">{r}</button>
              ))}
            </div>
            <textarea value={reportText} onChange={(e)=>setReportText(e.target.value)} rows={3}
              placeholder="Add details (optional)" className="w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"/>
            <p className="text-xs text-zinc-500 flex items-center gap-1"><FiShield/> Reports help keep the community safe.</p>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 8) SUPPORT COMPONENTS                                                       │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function ChatInput({ onSend, disabled }:{ onSend:(t:string)=>void; disabled?: boolean; }) {
  const [txt, setTxt] = useState('');
  return (
    <div className="mt-2 flex gap-2">
      <input disabled={!!disabled} value={txt} onChange={(e)=>setTxt(e.target.value)} placeholder="Say hello (be kind)…"
        onKeyDown={(e)=>{ if(e.key==='Enter' && txt.trim()){ onSend(txt.trim()); setTxt(''); } }}
        className="flex-1 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600 disabled:opacity-50"/>
      <button disabled={!!disabled || !txt.trim()} onClick={()=>{ onSend(txt.trim()); setTxt(''); }}
        className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 text-white disabled:opacity-50">Send</button>
    </div>
  );
}

function Modal({ title, onClose, children, footer }:{
  title:string; onClose:()=>void; children:React.ReactNode; footer?:React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-200"><FiShield className="text-emerald-400"/>{title}</div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200"><FiX/></button>
        </header>
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-zinc-800">{footer}</div>}
      </div>
    </div>
  );
}
