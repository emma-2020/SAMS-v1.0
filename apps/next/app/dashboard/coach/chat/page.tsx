'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { chatApi, teamsApi } from '@sams/api';
import type { Team, ChatMessage, TeamMember, ChatAttachment } from '@sams/api';
import { useAuthStore } from '@sams/store';

// ─── Constants ─────────────────────────────────────────────────────
const POLL_MS   = 5000;
const MAX_CHARS = 2000;

const ROLE_STYLES: Record<string, { bg: string; color: string; initBg: string; border: string }> = {
  Admin:  { bg: '#EDE9FE', color: '#7C3AED', initBg: '#F3EFFF', border: '#DDD6FE' },
  Coach:  { bg: '#DBEAFE', color: '#2563EB', initBg: '#EFF6FF', border: '#BFDBFE' },
  Player: { bg: '#D1FAE5', color: '#059669', initBg: '#ECFDF5', border: '#A7F3D0' },
  Parent: { bg: '#FEF3C7', color: '#D97706', initBg: '#FFFBEB', border: '#FDE68A' },
};
function roleStyle(role?: string) { return ROLE_STYLES[role ?? ''] || ROLE_STYLES.Player; }

const AVATAR_PALETTES = [
  { bg: '#EEF2FF', text: '#4338CA', ring: '#C7D2FE' },
  { bg: '#F0FDF4', text: '#15803D', ring: '#86EFAC' },
  { bg: '#FFF7ED', text: '#C2410C', ring: '#FDBA74' },
  { bg: '#F0F9FF', text: '#0369A1', ring: '#7DD3FC' },
  { bg: '#FDF4FF', text: '#7E22CE', ring: '#D8B4FE' },
  { bg: '#FFF1F2', text: '#BE123C', ring: '#FECDD3' },
  { bg: '#F0FDFA', text: '#0F766E', ring: '#5EEAD4' },
];
function avatarPalette(name: string) {
  return AVATAR_PALETTES[(name || '').charCodeAt(0) % AVATAR_PALETTES.length];
}

// ─── Icons ─────────────────────────────────────────────────────────
const IcoPaperclip = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IcoSend = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={active ? 'white' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoHash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IcoX14 = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Utilities ──────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5)     return 'just now';
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function initials(u?: TeamMember): string {
  return `${u?.first_name?.[0] ?? ''}${u?.last_name?.[0] ?? ''}`.toUpperCase();
}
function fullName(u?: TeamMember): string {
  return u ? `${u.first_name} ${u.last_name}` : 'Unknown';
}

// ─── Messages reducer ───────────────────────────────────────────────
type OptMsg = ChatMessage & { _opt?: boolean };

type MsgAction =
  | { type: 'SET'; messages: OptMsg[] }
  | { type: 'MERGE'; messages: OptMsg[] }
  | { type: 'ADD_OPT'; message: OptMsg }
  | { type: 'CONFIRM'; tempId: string; confirmed: OptMsg }
  | { type: 'REJECT'; tempId: string };

function reducer(state: OptMsg[], action: MsgAction): OptMsg[] {
  switch (action.type) {
    case 'SET':    return action.messages;
    case 'MERGE': {
      const ids = new Set(state.map(m => m.id));
      const n   = action.messages.filter(m => !ids.has(m.id));
      return n.length ? [...state, ...n] : state;
    }
    case 'ADD_OPT':  return [...state, action.message];
    case 'CONFIRM':  return state.map(m => m.id === action.tempId ? action.confirmed : m);
    case 'REJECT':   return state.filter(m => m.id !== action.tempId);
    default: return state;
  }
}

// ─── Group by date + sender ─────────────────────────────────────────
interface MsgGroup {
  date: string;
  items: Array<{ msg: OptMsg; isSelf: boolean; showHeader: boolean; isLast: boolean }>;
}

function groupMessages(messages: OptMsg[], selfId: string): MsgGroup[] {
  if (!messages.length) return [];
  const byDate: MsgGroup[] = [];
  let curDate: string | null = null;
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== curDate) { byDate.push({ date: msg.created_at, items: [] }); curDate = d; }
    byDate[byDate.length - 1].items.push({ msg, isSelf: false, showHeader: false, isLast: false });
  }
  for (const grp of byDate) {
    grp.items = grp.items.map((item, i, arr) => {
      const prev = arr[i - 1]?.msg;
      const gap  = prev ? (new Date(item.msg.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000 : Infinity;
      const next = arr[i + 1]?.msg;
      return {
        msg: item.msg,
        isSelf:     item.msg.sender_id === selfId,
        showHeader: !prev || prev.sender_id !== item.msg.sender_id || gap > 5,
        isLast:     !next || next.sender_id !== item.msg.sender_id,
      };
    });
  }
  return byDate;
}

// ─── Date separator ─────────────────────────────────────────────────
function DateSep({ date }: { date: string }) {
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday'
    : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0 20px' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #E2E8F0)' }} />
      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, background: '#F8FAFC', padding: '4px 14px', borderRadius: 99, border: '1px solid #E8EDF2' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #E2E8F0)' }} />
    </div>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────
function MsgAvatar({ user: u, size = 36 }: { user?: TeamMember; size?: number }) {
  const name    = fullName(u);
  const palette = avatarPalette(name);
  const inits   = initials(u);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: palette.bg, border: `2px solid ${palette.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.32), fontWeight: 800, color: palette.text, letterSpacing: '-0.01em', boxShadow: `0 2px 6px ${palette.ring}80` }}>
      {inits}
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────
function MessageBubble({ msg, isSelf, showHeader, isLast }: { msg: OptMsg; isSelf: boolean; showHeader: boolean; isLast: boolean }) {
  const [ts, setTs] = useState(() => relativeTime(msg.created_at));
  const u    = msg.sender;
  const role = u?.role;
  const rs   = roleStyle(role);

  useEffect(() => {
    const t = setInterval(() => setTs(relativeTime(msg.created_at)), 30_000);
    return () => clearInterval(t);
  }, [msg.created_at]);

  const radiusSelf  = '20px 4px 20px 20px';
  const radiusOther = showHeader ? '4px 20px 20px 20px' : (isLast ? '4px 20px 20px 20px' : '4px 20px 20px 4px');

  return (
    <div style={{ display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 10, opacity: msg._opt ? 0.65 : 1, transition: 'opacity 0.2s', marginBottom: showHeader ? 10 : 3, paddingLeft: isSelf ? 60 : 0, paddingRight: isSelf ? 0 : 60 }}>
      {showHeader ? <MsgAvatar user={u} size={36} /> : <div style={{ width: 36, flexShrink: 0 }} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
        {showHeader && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexDirection: isSelf ? 'row-reverse' : 'row', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: '0.83rem', color: '#1E293B', letterSpacing: '-0.01em' }}>
              {isSelf ? 'You' : fullName(u)}
            </span>
            {role && (
              <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, background: 'transparent', color: rs.color, border: `1px solid ${rs.border}`, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                {role}
              </span>
            )}
            <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>{ts}</span>
          </div>
        )}

        <div style={{ padding: '10px 15px', borderRadius: isSelf ? radiusSelf : radiusOther, background: isSelf ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : '#F1F5F9', border: isSelf ? 'none' : '1px solid #E8EDF2', color: isSelf ? '#FFFFFF' : '#1E293B', fontSize: '0.9rem', lineHeight: 1.55, boxShadow: isSelf ? '0 4px 12px rgba(99,102,241,0.28)' : '0 1px 2px rgba(15,23,42,0.04)', wordBreak: 'break-word' as const }}>
          {msg.body && <span>{msg.body}</span>}
          {msg.attachment_url && (
            <div style={{ marginTop: msg.body ? 8 : 0 }}>
              {msg.mime_type?.startsWith('image/') ? (
                <img
                  src={msg.attachment_url}
                  alt={msg.file_name ?? 'image'}
                  style={{ maxWidth: 260, maxHeight: 180, borderRadius: 8, display: 'block', cursor: 'pointer', border: isSelf ? '2px solid rgba(255,255,255,0.3)' : '1px solid #E2E8F0' }}
                  onClick={() => window.open(msg.attachment_url!, '_blank')}
                />
              ) : (
                <a
                  href={msg.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 11px', background: isSelf ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.06)', borderRadius: 8, color: 'inherit', textDecoration: 'none', maxWidth: 240 }}
                >
                  <IcoFile />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {msg.file_name ?? 'Download file'}
                  </span>
                  {msg.file_size && (
                    <span style={{ fontSize: '0.65rem', opacity: 0.7, flexShrink: 0 }}>
                      {(msg.file_size / 1024).toFixed(0)}KB
                    </span>
                  )}
                </a>
              )}
            </div>
          )}
        </div>

        {!showHeader && isLast && (
          <span style={{ fontSize: '0.6rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em', marginTop: 1 }}>{ts}</span>
        )}
      </div>
    </div>
  );
}

// ─── Input bar ───────────────────────────────────────────────────────
function InputBar({
  onSend,
  disabled,
  activeTeamId,
}: {
  onSend: (text: string, attachment?: ChatAttachment) => void;
  disabled: boolean;
  activeTeamId: string | null;
}) {
  const [text,       setText]       = useState('');
  const [focused,    setFocused]    = useState(false);
  const [clipHover,  setClipHover]  = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState('');
  const ref     = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || attachment !== null) && !disabled && !uploading && text.length <= MAX_CHARS;

  const doSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim(), attachment ?? undefined);
    setText('');
    setAttachment(null);
    ref.current?.focus();
  }, [canSend, onSend, text, attachment]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  }

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 120)}px`;
  }, [text]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeTeamId) return;
    e.target.value = '';
    setUploadErr('');
    setUploading(true);
    try {
      const info = await chatApi.uploadChatAttachment(activeTeamId, file);
      setAttachment(info);
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const isImage = attachment?.mime_type?.startsWith('image/');

  return (
    <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #F1F5F9', background: '#FFFFFF', flexShrink: 0 }}>

      {/* Attachment preview chip */}
      {(attachment || uploading) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: '#F1F5F9', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          {uploading ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Uploading…</span>
            </>
          ) : attachment && (
            <>
              {isImage ? (
                <img src={attachment.url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <span style={{ color: '#6366F1', flexShrink: 0 }}><IcoFile /></span>
              )}
              <span style={{ fontSize: '0.78rem', color: '#1E293B', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment.file_name}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94A3B8', flexShrink: 0 }}>
                {(attachment.file_size / 1024).toFixed(0)} KB
              </span>
              <button onClick={() => setAttachment(null)} type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 2 }}>
                <IcoX14 />
              </button>
            </>
          )}
        </div>
      )}

      {/* Upload error */}
      {uploadErr && (
        <div style={{ fontSize: '0.75rem', color: '#DC2626', marginBottom: 6, paddingLeft: 4 }}>
          {uploadErr}
          <button onClick={() => setUploadErr('')} type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 6, fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '6px 6px 6px 14px', background: focused ? '#FFFFFF' : '#F8FAFC', borderRadius: 9999, border: `1.5px solid ${focused ? '#6366F1' : '#E2E8F0'}`, boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.10), 0 2px 10px rgba(15,23,42,0.07)' : '0 1px 4px rgba(15,23,42,0.06)', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)' }}>
        <button
          type="button"
          disabled={!activeTeamId || uploading}
          onClick={() => fileRef.current?.click()}
          onMouseEnter={() => setClipHover(true)}
          onMouseLeave={() => setClipHover(false)}
          title="Attach image or PDF (max 10 MB)"
          style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: attachment ? '#EEF2FF' : (clipHover ? '#EEF2FF' : 'none'), border: attachment ? '1.5px solid #C7D2FE' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: attachment ? '#6366F1' : (clipHover ? '#6366F1' : '#94A3B8'), cursor: activeTeamId && !uploading ? 'pointer' : 'not-allowed', alignSelf: 'flex-end', marginBottom: 2, transition: 'all 0.15s', opacity: uploading ? 0.5 : 1 }}>
          <IcoPaperclip />
        </button>

        <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          disabled={disabled} rows={1} placeholder="Message the team..."
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#1E293B', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.5, resize: 'none', minHeight: 24, maxHeight: 120, paddingTop: 5, paddingBottom: 5 }} />

        {text.length > MAX_CHARS * 0.8 && (
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', alignSelf: 'flex-end', paddingBottom: 9, flexShrink: 0, color: text.length > MAX_CHARS ? 'var(--danger)' : '#94A3B8' }}>
            {MAX_CHARS - text.length}
          </span>
        )}

        <button onClick={doSend} disabled={!canSend} type="button"
          style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: canSend ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : '#F1F5F9', border: 'none', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: canSend ? 'scale(1)' : 'scale(0.88)', boxShadow: canSend ? '0 4px 14px rgba(99,102,241,0.38)' : 'none' }}
          onMouseEnter={e => { if (canSend) { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.52)'; } }}
          onMouseLeave={e => { if (canSend) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.38)'; } }}>
          <IcoSend active={canSend} />
        </button>
      </div>
      <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 7, textAlign: 'center', letterSpacing: '0.04em' }}>
        Enter ↵ to send · Shift+Enter for new line · 📎 images & PDF up to 10 MB
      </div>
    </div>
  );
}

// ─── Mobile breakpoint hook ──────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    setMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [bp]);
  return mobile;
}

// ─── MAIN CHAT PAGE ───────────────────────────────────────────────────
export default function ChatPage() {
  const mobile = useIsMobile();
  const user = useAuthStore(s => s.user);

  const [teams,        setTeams]        = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activeTeam,   setActiveTeam]   = useState<Team | null>(null);
  const [messages,     dispatch]        = useReducer(reducer, []);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState('');
  const [initError,    setInitError]    = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestRef  = useRef<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  // Load teams
  useEffect(() => {
    teamsApi.getTeams()
      .then(list => {
        setTeams(list);
        if (list[0]) { setActiveTeamId(list[0].id); setActiveTeam(list[0]); }
      })
      .catch(err => setInitError(err.message || 'Failed to load teams.'))
      .finally(() => setLoadingTeams(false));
  }, []);

  // Load messages on team change
  useEffect(() => {
    if (!activeTeamId) return;
    setLoadingMsgs(true); setSendError(''); dispatch({ type: 'SET', messages: [] });
    latestRef.current = null;
    chatApi.getMessages(activeTeamId)
      .then(msgs => {
        dispatch({ type: 'SET', messages: msgs });
        latestRef.current = msgs[msgs.length - 1]?.id ?? null;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch(err => setInitError(err.message))
      .finally(() => setLoadingMsgs(false));
  }, [activeTeamId]);

  // Polling
  useEffect(() => {
    if (!activeTeamId || loadingMsgs) return;
    pollingRef.current = setInterval(async () => {
      try {
        const inc = await chatApi.getMessages(activeTeamId);
        if (latestRef.current) {
          const idx   = inc.findIndex(m => m.id === latestRef.current);
          const newer = idx >= 0 ? inc.slice(idx + 1) : [];
          if (newer.length) {
            dispatch({ type: 'MERGE', messages: newer });
            latestRef.current = newer[newer.length - 1].id;
            const el = listRef.current;
            if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100)
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        } else {
          dispatch({ type: 'MERGE', messages: inc });
          if (inc.length) latestRef.current = inc[inc.length - 1].id;
        }
      } catch { /* silent */ }
    }, POLL_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeTeamId, loadingMsgs]);

  // Send
  const handleSend = useCallback(async (text: string) => {
    if (!activeTeamId || !user) return;
    setSendError(''); setSending(true);
    const tempId = `opt-${Date.now()}`;
    const optimistic: OptMsg = {
      id: tempId, team_id: activeTeamId, sender_id: user.id,
      body: text, created_at: new Date().toISOString(), _opt: true,
      sender: { id: user.id, first_name: user.first_name, last_name: user.last_name, role: user.role, email: user.email },
    };
    dispatch({ type: 'ADD_OPT', message: optimistic });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const confirmed = await chatApi.sendMessage(activeTeamId, text);
      dispatch({ type: 'CONFIRM', tempId, confirmed });
      latestRef.current = confirmed.id;
    } catch (err: unknown) {
      dispatch({ type: 'REJECT', tempId });
      setSendError(err instanceof Error ? err.message : 'Failed to send. Try again.');
    } finally { setSending(false); }
  }, [activeTeamId, user]);

  function switchTeam(team: Team) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setActiveTeamId(team.id); setActiveTeam(team);
    latestRef.current = null;
  }

  const groups    = groupMessages(messages, user?.id ?? '');
  const coachName = (activeTeam as Team & { users?: { first_name: string; last_name: string } })?.users
    ? `${(activeTeam as Team & { users: { first_name: string; last_name: string } }).users.first_name} ${(activeTeam as Team & { users: { first_name: string; last_name: string } }).users.last_name}`
    : activeTeam?.coach
      ? `${activeTeam.coach.first_name} ${activeTeam.coach.last_name}`
      : 'Unassigned';

  if (loadingTeams) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 10, color: '#94A3B8' }}>
        <span className="spinner" />
        <span style={{ fontSize: '0.9rem' }}>Loading channels...</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 4 }}>Team Chat</h1>
        <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginBottom: 24 }}>Team communications</p>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #F1F5F9', borderRadius: 20, padding: '64px 24px', boxShadow: '0 4px 24px rgba(15,23,42,0.06)', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#EEF2FF', border: '2px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#6366F1' }}>
            <IcoUsers />
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', marginBottom: 8 }}>No team channels yet</div>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', maxWidth: 360, margin: '0 auto' }}>
            {user?.role === 'Admin'
              ? 'Create a team from the Teams page to start chatting with your academy.'
              : 'Contact your academy admin or coach to be added to a team channel.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: mobile ? 'column' : 'row', height: 'calc(100vh - 118px)', minHeight: 0, gap: 0, background: '#F8FAFC', borderRadius: 20, overflow: 'hidden', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 24px rgba(15,23,42,0.07)' }}>

      {mobile ? (
        /* Mobile: horizontal scrollable team tabs */
        <div style={{ display: 'flex', overflowX: 'auto', padding: '8px 12px', background: '#FFFFFF', borderBottom: '1px solid #F1F5F9', flexShrink: 0, gap: 4, scrollbarWidth: 'none' }}>
          {teams.map(t => {
            const isActive = t.id === activeTeamId;
            const pal      = avatarPalette(t.name || '');
            const inits    = (t.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            return (
              <button key={t.id} onClick={() => switchTeam(t)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 10px', border: 'none', background: isActive ? '#EEF2FF' : 'none', borderBottom: `2px solid ${isActive ? '#6366F1' : 'transparent'}`, borderRadius: '8px 8px 0 0', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isActive ? '#EEF2FF' : pal.bg, border: `2px solid ${isActive ? '#C7D2FE' : pal.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: isActive ? '#4338CA' : pal.text }}>
                  {inits}
                </div>
                <div style={{ fontSize: '0.58rem', fontWeight: isActive ? 700 : 400, color: isActive ? '#4338CA' : '#94A3B8', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Desktop: Left Channels panel */
        <div style={{ width: 268, flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid #F5F7FA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                <IcoHash />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Channels</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', paddingLeft: 36, fontWeight: 500 }}>
              {teams.length} team{teams.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {teams.map(t => {
              const isActive = t.id === activeTeamId;
              const pal      = avatarPalette(t.name || '');
              const inits    = (t.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
              return (
                <button key={t.id} onClick={() => switchTeam(t)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 12px', background: isActive ? '#EEF2FF' : 'none', border: 'none', borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent', borderRadius: '0 10px 10px 0', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', marginBottom: 3 }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: isActive ? '#EEF2FF' : pal.bg, border: `2px solid ${isActive ? '#C7D2FE' : pal.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: isActive ? '#4338CA' : pal.text, boxShadow: isActive ? '0 2px 6px rgba(99,102,241,0.20)' : 'none' }}>
                    {inits}
                  </div>
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.85rem', color: isActive ? '#4338CA' : '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isActive ? '#6366F1' : '#94A3B8', marginTop: 1, fontWeight: isActive ? 500 : 400 }}>
                      {t.sport || t.division || 'Team channel'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat window — same on mobile and desktop */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden' }}>
        {/* Channel header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '1px solid #F5F7FA', background: '#FFFFFF', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            {activeTeam && (() => {
              const pal   = avatarPalette(activeTeam.name || '');
              const inits = (activeTeam.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
              return (
                <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: pal.bg, border: `2.5px solid ${pal.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: pal.text, boxShadow: `0 2px 8px ${pal.ring}80` }}>
                  {inits}
                </div>
              );
            })()}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', letterSpacing: '-0.01em' }}>{activeTeam?.name ?? 'Team Channel'}</div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
                Coach: {coachName}
                {activeTeam?.sport    && ` · ${activeTeam.sport}`}
                {activeTeam?.division && ` · ${activeTeam.division}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.20)' }} />
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
              Live · {POLL_MS / 1000}s sync
            </span>
          </div>
        </div>

        {/* Init error */}
        {initError && (
          <div className="alert alert-error" style={{ margin: '12px 18px', flexShrink: 0 }}>{initError}</div>
        )}

        {/* Messages */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 8px', display: 'flex', flexDirection: 'column', gap: 0, background: '#F8FAFC' }}>
          {loadingMsgs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexDirection: i % 2 === 0 ? 'row-reverse' : 'row' }}>
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="skeleton" style={{ height: 48, width: `${35 + i * 10}%`, borderRadius: i % 2 === 0 ? '20px 4px 20px 20px' : '4px 20px 20px 20px' }} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.55, padding: '40px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#EEF2FF', border: '2px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', fontSize: '1.6rem' }}>
                💬
              </div>
              <div style={{ fontWeight: 600, color: '#64748B', fontSize: '0.9rem' }}>No messages yet — say hello!</div>
            </div>
          ) : (
            groups.map(({ date, items }) => (
              <div key={date}>
                <DateSep date={date} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {items.map(({ msg, isSelf, showHeader, isLast }) => (
                    <MessageBubble key={msg.id} msg={msg} isSelf={isSelf} showHeader={showHeader} isLast={isLast} />
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} style={{ height: 4 }} />
        </div>

        {/* Send error */}
        {sendError && (
          <div className="alert alert-error" style={{ margin: '0 18px 8px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.85rem' }}>{sendError}</span>
            <button onClick={() => setSendError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px', marginLeft: 'auto' }}>✕</button>
          </div>
        )}

        <InputBar onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
