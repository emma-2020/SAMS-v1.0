'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { chatApi } from '@sams/api';
import type { ChatChannel, ChatChannelMember, ChatMessage, ChatAttachment, TeamMember } from '@sams/api';
import { useAuthStore } from '@sams/store';

// ─── Constants ──────────────────────────────────────────────────────
const POLL_MS   = 5000;
const MAX_CHARS = 2000;

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  team:         'Team Channel',
  role_group:   'Role Group',
  custom_group: 'Group',
  direct:       'Direct Message',
};

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Admin:  { bg: '#EDE9FE', color: '#7C3AED', border: '#DDD6FE' },
  Coach:  { bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE' },
  Player: { bg: '#D1FAE5', color: '#059669', border: '#A7F3D0' },
  Parent: { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
};

const GROUP_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444',
];

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
function initials(name: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Icons ──────────────────────────────────────────────────────────
const IcoPaperclip = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IcoSend = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IcoX = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoPencil = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcoInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const IcoUserPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

// ─── Utilities ───────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5)     return 'now';
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function dateSepLabel(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function channelAvatar(ch: ChatChannel): { bg: string; text: string; ring: string; label: string } {
  if (ch.type === 'direct' && ch.other_user) {
    const name = `${ch.other_user.first_name} ${ch.other_user.last_name}`;
    const p = avatarPalette(name);
    return { ...p, label: initials(name) };
  }
  const color = ch.icon_color || GROUP_COLORS[ch.name.charCodeAt(0) % GROUP_COLORS.length];
  return { bg: `${color}22`, text: color, ring: `${color}55`, label: initials(ch.name) };
}

// ─── Messages reducer ────────────────────────────────────────────────
type OptMsg = ChatMessage & { _opt?: boolean };

type MsgAction =
  | { type: 'SET';     messages: OptMsg[] }
  | { type: 'MERGE';   messages: OptMsg[] }
  | { type: 'ADD_OPT'; message: OptMsg }
  | { type: 'CONFIRM'; tempId: string; confirmed: OptMsg }
  | { type: 'REJECT';  tempId: string }
  | { type: 'REMOVE';  id: string };

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
    case 'REMOVE':   return state.filter(m => m.id !== action.id);
    default: return state;
  }
}

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
        msg:        item.msg,
        isSelf:     item.msg.sender_id === selfId,
        showHeader: !prev || prev.sender_id !== item.msg.sender_id || gap > 5,
        isLast:     !next || next.sender_id !== item.msg.sender_id,
      };
    });
  }
  return byDate;
}

// ─── Sub-components ──────────────────────────────────────────────────

function DateSep({ date }: { date: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #E2E8F0)' }} />
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: '#F8FAFC', padding: '3px 12px', borderRadius: 99, border: '1px solid #E8EDF2' }}>
        {dateSepLabel(date)}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #E2E8F0)' }} />
    </div>
  );
}

function MsgAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const p = avatarPalette(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: p.bg, border: `2px solid ${p.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.3), fontWeight: 800, color: p.text, boxShadow: `0 2px 6px ${p.ring}80` }}>
      {initials(name)}
    </div>
  );
}

function MessageBubble({ msg, isSelf, showHeader, isLast, canDelete, onDelete }: {
  msg: OptMsg; isSelf: boolean; showHeader: boolean; isLast: boolean;
  canDelete?: boolean; onDelete?: () => void;
}) {
  const [ts,         setTs]         = useState(() => relativeTime(msg.created_at));
  const [hovered,    setHovered]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const u    = msg.sender;
  const name = u ? `${u.first_name} ${u.last_name}` : 'Unknown';
  const role = u?.role ?? '';
  const rs   = ROLE_STYLES[role];

  useEffect(() => {
    const t = setInterval(() => setTs(relativeTime(msg.created_at)), 30_000);
    return () => clearInterval(t);
  }, [msg.created_at]);

  return (
    <div
      style={{ display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, opacity: msg._opt ? 0.65 : 1, transition: 'opacity 0.2s', marginBottom: showHeader ? 8 : 2, paddingLeft: isSelf ? 56 : 0, paddingRight: isSelf ? 0 : 56 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false); }}
    >
      {showHeader
        ? <MsgAvatar name={name} size={34} />
        : <div style={{ width: 34, flexShrink: 0 }} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
        {showHeader && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isSelf ? 'row-reverse' : 'row', marginBottom: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}>
              {isSelf ? 'You' : name}
            </span>
            {rs && (
              <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: '0.58rem', fontWeight: 700, color: rs.color, border: `1px solid ${rs.border}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {role}
              </span>
            )}
            <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>{ts}</span>
          </div>
        )}

        <div style={{ position: 'relative', display: 'inline-flex', maxWidth: '100%' }}>
          <div style={{
            padding: '9px 14px',
            borderRadius: isSelf ? '18px 4px 18px 18px' : (showHeader ? '4px 18px 18px 18px' : (isLast ? '4px 18px 18px 18px' : '4px 18px 18px 4px')),
            background: isSelf ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : '#F1F5F9',
            border: isSelf ? 'none' : '1px solid #E8EDF2',
            color: isSelf ? '#FFFFFF' : '#1E293B',
            fontSize: '0.88rem', lineHeight: 1.55,
            boxShadow: isSelf ? '0 3px 10px rgba(99,102,241,0.28)' : '0 1px 2px rgba(15,23,42,0.04)',
            wordBreak: 'break-word',
          }}>
            {msg.body && <span>{msg.body}</span>}
            {msg.attachment_url && (
              <div style={{ marginTop: msg.body ? 8 : 0 }}>
                {msg.mime_type?.startsWith('image/') ? (
                  <img
                    src={msg.attachment_url}
                    alt={msg.file_name ?? 'image'}
                    style={{ maxWidth: 240, maxHeight: 170, borderRadius: 8, display: 'block', cursor: 'pointer', border: isSelf ? '2px solid rgba(255,255,255,0.3)' : '1px solid #E2E8F0' }}
                    onClick={() => window.open(msg.attachment_url!, '_blank')}
                  />
                ) : (
                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: isSelf ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.06)', borderRadius: 8, color: 'inherit', textDecoration: 'none', maxWidth: 220 }}>
                    <IcoFile />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{msg.file_name ?? 'Download file'}</span>
                    {msg.file_size && <span style={{ fontSize: '0.62rem', opacity: 0.7, flexShrink: 0 }}>{(msg.file_size / 1024).toFixed(0)}KB</span>}
                  </a>
                )}
              </div>
            )}
          </div>

          {canDelete && hovered && !msg._opt && (
            <div style={{ position: 'absolute', top: -12, zIndex: 20, ...(isSelf ? { left: -4, transform: 'translateX(-100%)' } : { right: -4, transform: 'translateX(100%)' }) }}>
              {!confirming ? (
                <button onClick={e => { e.stopPropagation(); setConfirming(true); }}
                  style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #FECDD3', background: '#FFF1F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F43F5E', boxShadow: '0 2px 6px rgba(244,63,94,0.15)' }}>
                  <IcoTrash />
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 4, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '4px 7px', boxShadow: '0 4px 14px rgba(15,23,42,0.12)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 500 }}>Delete?</span>
                  <button onClick={e => { e.stopPropagation(); onDelete?.(); setConfirming(false); setHovered(false); }}
                    style={{ padding: '2px 7px', borderRadius: 5, border: 'none', background: '#EF4444', color: 'white', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer' }}>Yes</button>
                  <button onClick={e => { e.stopPropagation(); setConfirming(false); }}
                    style={{ padding: '2px 7px', borderRadius: 5, border: '1px solid #E2E8F0', background: 'transparent', color: '#64748B', fontSize: '0.66rem', cursor: 'pointer' }}>No</button>
                </div>
              )}
            </div>
          )}
        </div>

        {!showHeader && isLast && (
          <span style={{ fontSize: '0.58rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 0 }}>{ts}</span>
        )}
      </div>
    </div>
  );
}

function InputBar({ onSend, disabled, activeChannelId }: {
  onSend: (text: string, attachment?: ChatAttachment) => void;
  disabled: boolean;
  activeChannelId: string | null;
}) {
  const [text,       setText]       = useState('');
  const [focused,    setFocused]    = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState('');
  const [clipHover,  setClipHover]  = useState(false);
  const ref     = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || attachment !== null) && !disabled && !uploading && text.length <= MAX_CHARS;

  const doSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim(), attachment ?? undefined);
    setText(''); setAttachment(null);
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
    if (!file || !activeChannelId) return;
    e.target.value = '';
    setUploadErr(''); setUploading(true);
    try {
      const info = await chatApi.uploadChatAttachment(activeChannelId, file);
      setAttachment(info);
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed.');
    } finally { setUploading(false); }
  }

  return (
    <div style={{ padding: '10px 18px 14px', borderTop: '1px solid #F1F5F9', background: '#FFFFFF', flexShrink: 0 }}>
      {(attachment || uploading) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '5px 10px', background: '#F1F5F9', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          {uploading ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /><span style={{ fontSize: '0.76rem', color: '#64748B' }}>Uploading…</span></>
          ) : attachment && (
            <>
              {attachment.mime_type?.startsWith('image/')
                ? <img src={attachment.url} alt="" style={{ width: 26, height: 26, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <span style={{ color: '#6366F1', flexShrink: 0 }}><IcoFile /></span>}
              <span style={{ fontSize: '0.76rem', color: '#1E293B', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.file_name}</span>
              <span style={{ fontSize: '0.62rem', color: '#94A3B8', flexShrink: 0 }}>{(attachment.file_size / 1024).toFixed(0)} KB</span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2 }}><IcoX size={11} /></button>
            </>
          )}
        </div>
      )}
      {uploadErr && (
        <div style={{ fontSize: '0.73rem', color: '#DC2626', marginBottom: 6, paddingLeft: 4 }}>
          {uploadErr}
          <button onClick={() => setUploadErr('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 6, fontWeight: 700 }}>✕</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '5px 5px 5px 12px', background: focused ? '#FFFFFF' : '#F8FAFC', borderRadius: 9999, border: `1.5px solid ${focused ? '#6366F1' : '#E2E8F0'}`, boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.10)' : '0 1px 4px rgba(15,23,42,0.06)', transition: 'all 0.2s' }}>
        <button type="button" disabled={!activeChannelId || uploading}
          onClick={() => fileRef.current?.click()}
          onMouseEnter={() => setClipHover(true)} onMouseLeave={() => setClipHover(false)}
          style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: attachment ? '#EEF2FF' : (clipHover ? '#EEF2FF' : 'none'), border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: attachment || clipHover ? '#6366F1' : '#94A3B8', cursor: activeChannelId && !uploading ? 'pointer' : 'not-allowed', alignSelf: 'flex-end', marginBottom: 2, transition: 'all 0.15s' }}>
          <IcoPaperclip />
        </button>
        <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          disabled={disabled} rows={1} placeholder="Type a message…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#1E293B', fontFamily: 'inherit', fontSize: '0.88rem', lineHeight: 1.5, resize: 'none', minHeight: 24, maxHeight: 120, paddingTop: 4, paddingBottom: 4 }} />
        {text.length > MAX_CHARS * 0.8 && (
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', alignSelf: 'flex-end', paddingBottom: 8, flexShrink: 0, color: text.length > MAX_CHARS ? 'var(--danger)' : '#94A3B8' }}>
            {MAX_CHARS - text.length}
          </span>
        )}
        <button onClick={doSend} disabled={!canSend} type="button"
          style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: canSend ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : '#F1F5F9', border: 'none', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: canSend ? 'scale(1)' : 'scale(0.88)', boxShadow: canSend ? '0 4px 12px rgba(99,102,241,0.38)' : 'none' }}>
          <IcoSend active={canSend} />
        </button>
      </div>
      <div style={{ fontSize: '0.6rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 6, textAlign: 'center', letterSpacing: '0.04em' }}>
        Enter ↵ to send · Shift+Enter for new line · 📎 images & PDF up to 10 MB
      </div>
    </div>
  );
}

// ─── Channel avatar component ────────────────────────────────────────
function ChannelAvatar({ ch, size = 44 }: { ch: ChatChannel; size?: number }) {
  const av = channelAvatar(ch);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: av.bg, border: `2px solid ${av.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.3), fontWeight: 800, color: av.text }}>
      {av.label}
    </div>
  );
}

// ─── Create Group Modal ──────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated, academyId }: {
  onClose: () => void;
  onCreated: (ch: ChatChannel) => void;
  academyId: string;
}) {
  const [name,       setName]       = useState('');
  const [type,       setType]       = useState<'role_group' | 'custom_group'>('role_group');
  const [targetRole, setTargetRole] = useState<'Coach' | 'Player' | 'Parent'>('Coach');
  const [userSearch, setUserSearch] = useState('');
  const [searchRes,  setSearchRes]  = useState<TeamMember[]>([]);
  const [selected,   setSelected]   = useState<TeamMember[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [error,      setError]      = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type !== 'custom_group') return;
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!userSearch.trim()) { setSearchRes([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const users = await chatApi.searchUsers(userSearch);
        setSearchRes(users.filter(u => !selected.find(s => s.id === u.id)));
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [userSearch, type, selected]);

  async function handleCreate() {
    if (!name.trim()) { setError('Group name is required.'); return; }
    if (type === 'custom_group' && selected.length === 0) { setError('Add at least one member.'); return; }
    setCreating(true); setError('');
    try {
      const ch = await chatApi.createGroup({
        name,
        type,
        target_role: type === 'role_group' ? targetRole : undefined,
        member_ids:  type === 'custom_group' ? selected.map(u => u.id) : undefined,
      });
      onCreated(ch);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group.');
    } finally { setCreating(false); }
  }

  const ROLE_OPTIONS: Array<{ value: 'Coach' | 'Player' | 'Parent'; label: string; color: string }> = [
    { value: 'Coach',  label: 'All Coaches',  color: '#2563EB' },
    { value: 'Player', label: 'All Players',  color: '#059669' },
    { value: 'Parent', label: 'All Parents',  color: '#D97706' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', animation: 'fadeIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>Create New Group</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>Set up a group chat for your academy</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><IcoX size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Group name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Group Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coaches Monthly Meeting"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.9rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
              onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* Group type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>Group Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${type === 'role_group' ? '#6366F1' : '#E2E8F0'}`, cursor: 'pointer', background: type === 'role_group' ? '#F5F3FF' : '#FAFAFA', transition: 'all 0.15s' }}>
                <input type="radio" name="type" value="role_group" checked={type === 'role_group'} onChange={() => setType('role_group')} style={{ accentColor: '#6366F1' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>Role-based Group</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Auto-add all Coaches, Players, or Parents</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${type === 'custom_group' ? '#6366F1' : '#E2E8F0'}`, cursor: 'pointer', background: type === 'custom_group' ? '#F5F3FF' : '#FAFAFA', transition: 'all 0.15s' }}>
                <input type="radio" name="type" value="custom_group" checked={type === 'custom_group'} onChange={() => setType('custom_group')} style={{ accentColor: '#6366F1' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>Custom Group</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Manually select specific members</div>
                </div>
              </label>
            </div>
          </div>

          {/* Role selector for role_group */}
          {type === 'role_group' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Select Role</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ROLE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setTargetRole(opt.value)}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `2px solid ${targetRole === opt.value ? opt.color : '#E2E8F0'}`, background: targetRole === opt.value ? `${opt.color}15` : '#FAFAFA', color: targetRole === opt.value ? opt.color : '#64748B', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Member search for custom_group */}
          {type === 'custom_group' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Add Members</label>
              {selected.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {selected.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', background: '#EEF2FF', borderRadius: 99, border: '1px solid #C7D2FE' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366F1', color: 'white', fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(`${u.first_name} ${u.last_name}`)}</div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4338CA' }}>{u.first_name} {u.last_name}</span>
                      <button onClick={() => setSelected(s => s.filter(m => m.id !== u.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', display: 'flex', padding: 0 }}><IcoX size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><IcoSearch /></div>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email…"
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                  onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                />
              </div>
              {searching && <div style={{ fontSize: '0.75rem', color: '#94A3B8', padding: '6px 4px' }}>Searching…</div>}
              {searchRes.length > 0 && (
                <div style={{ marginTop: 6, border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  {searchRes.map((u, i) => {
                    const rs = ROLE_STYLES[u.role];
                    return (
                      <button key={u.id} onClick={() => { setSelected(s => [...s, u]); setSearchRes(r => r.filter(x => x.id !== u.id)); setUserSearch(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <MsgAvatar name={`${u.first_name} ${u.last_name}`} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#0F172A' }}>{u.first_name} {u.last_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        </div>
                        {rs && <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: rs.color, border: `1px solid ${rs.border}`, flexShrink: 0 }}>{u.role}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <div style={{ fontSize: '0.8rem', color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
        </div>

        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} disabled={creating || !name.trim()}
            style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: name.trim() && !creating ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#E2E8F0', color: name.trim() && !creating ? 'white' : '#94A3B8', fontWeight: 700, fontSize: '0.88rem', cursor: name.trim() && !creating ? 'pointer' : 'not-allowed', boxShadow: name.trim() ? '0 4px 12px rgba(99,102,241,0.3)' : 'none', transition: 'all 0.15s' }}>
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group Info Panel ────────────────────────────────────────────────
function GroupInfoPanel({ channel, onClose, isAdmin, onMembersChange }: {
  channel: ChatChannel;
  onClose: () => void;
  isAdmin: boolean;
  onMembersChange: () => void;
}) {
  const [members,     setMembers]     = useState<ChatChannelMember[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [addSearch,   setAddSearch]   = useState('');
  const [addResults,  setAddResults]  = useState<TeamMember[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [removingId,  setRemovingId]  = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chatApi.getChannelMembers(channel.id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [channel.id]);

  useEffect(() => {
    if (!isAdmin || channel.type === 'direct') return;
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!addSearch.trim()) { setAddResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const users = await chatApi.searchUsers(addSearch);
        setAddResults(users.filter(u => !members.find(m => m.user_id === u.id)));
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [addSearch, members, isAdmin, channel.type]);

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    try {
      await chatApi.removeChannelMember(channel.id, userId);
      setMembers(m => m.filter(x => x.user_id !== userId));
      onMembersChange();
    } catch { /* ignore */ }
    finally { setRemovingId(null); }
  }

  async function handleAdd(user: TeamMember) {
    try {
      await chatApi.addChannelMember(channel.id, user.id);
      setMembers(m => [...m, {
        user_id: user.id, first_name: user.first_name, last_name: user.last_name,
        email: user.email, role: user.role, is_admin: false, joined_at: new Date().toISOString(),
      }]);
      setAddResults(r => r.filter(u => u.id !== user.id));
      setAddSearch('');
      onMembersChange();
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${channel.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await chatApi.deleteGroup(channel.id);
      onMembersChange();
      onClose();
    } catch { setDeleting(false); }
  }

  const av = channelAvatar(channel);
  const isDirect = channel.type === 'direct';
  const isTeam   = channel.type === 'team';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 360, height: '100vh', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(15,23,42,0.15)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><IcoChevronLeft /></button>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>Group Info</div>
        </div>

        {/* Channel summary */}
        <div style={{ padding: '24px 20px 18px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: av.bg, border: `3px solid ${av.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: av.text, margin: '0 auto 12px' }}>
            {av.label}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: 4 }}>{channel.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, marginBottom: 4 }}>{CHANNEL_TYPE_LABELS[channel.type]}</div>
          {channel.description && <div style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 260, margin: '0 auto' }}>{channel.description}</div>}
          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 6 }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Member list */}
        <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Members</div>

          {/* Add member search (admin only, non-DM, non-team) */}
          {isAdmin && !isDirect && !isTeam && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ position: 'relative', marginBottom: 4 }}>
                <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><IcoSearch /></div>
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Add a member…"
                  style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                  onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                />
              </div>
              {searching && <div style={{ fontSize: '0.72rem', color: '#94A3B8', paddingLeft: 4 }}>Searching…</div>}
              {addResults.length > 0 && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 9, overflow: 'hidden', marginTop: 4 }}>
                  {addResults.slice(0, 5).map((u, i) => (
                    <button key={u.id} onClick={() => handleAdd(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <MsgAvatar name={`${u.first_name} ${u.last_name}`} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{u.role}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#6366F1', fontWeight: 700 }}>+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading
            ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 6 }} />)
            : members.map(m => {
                const rs = ROLE_STYLES[m.role];
                return (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                    <MsgAvatar name={`${m.first_name} ${m.last_name}`} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.first_name} {m.last_name}</div>
                      {rs && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: rs.color }}>{m.role}</span>}
                    </div>
                    {m.is_admin && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '1px 6px', borderRadius: 99 }}>Admin</span>}
                    {isAdmin && !isDirect && !isTeam && !m.is_admin && (
                      <button onClick={() => handleRemove(m.user_id)} disabled={removingId === m.user_id}
                        style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #FECDD3', background: '#FFF1F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F43F5E', opacity: removingId === m.user_id ? 0.5 : 1 }}>
                        <IcoX size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
        </div>

        {/* Admin danger zone */}
        {isAdmin && !isDirect && !isTeam && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #F1F5F9' }}>
            <button onClick={handleDelete} disabled={deleting}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #FECDD3', background: '#FFF1F2', color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IcoTrash />
              {deleting ? 'Deleting…' : 'Delete Group'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DM Search Modal ─────────────────────────────────────────────────
function NewDMModal({ onClose, onChannel }: {
  onClose: () => void;
  onChannel: (ch: ChatChannel) => void;
}) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<TeamMember[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [opening,  setOpening]  = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    setLoading(true);
    searchRef.current = setTimeout(async () => {
      try {
        const users = await chatApi.searchUsers(query);
        setResults(users);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query]);

  async function openDM(user: TeamMember) {
    setOpening(user.id);
    try {
      const ch = await chatApi.getOrCreateDirect(user.id);
      onChannel(ch);
    } catch { /* ignore */ }
    finally { setOpening(null); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', animation: 'fadeIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>New Message</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>Send a direct message to anyone in your academy</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><IcoX size={15} /></button>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><IcoSearch /></div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or email…" autoFocus
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
              onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
          {loading
            ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 6 }} />)
            : results.length === 0
              ? <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', padding: '24px 0' }}>No users found</div>
              : results.map((u, i) => {
                  const rs = ROLE_STYLES[u.role];
                  const isOpening = opening === u.id;
                  return (
                    <button key={u.id} onClick={() => openDM(u)} disabled={!!opening}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid #F8FAFC' : 'none', cursor: opening ? 'wait' : 'pointer', textAlign: 'left', borderRadius: 10, opacity: opening && !isOpening ? 0.5 : 1, transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (!opening) e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <MsgAvatar name={`${u.first_name} ${u.last_name}`} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                      {rs && <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: rs.color, border: `1px solid ${rs.border}`, flexShrink: 0 }}>{u.role}</span>}
                      {isOpening && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                    </button>
                  );
                })}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile hook ──────────────────────────────────────────────────────
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
  const user   = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'Admin';

  // Channels state
  const [channels,      setChannels]      = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [loadingCh,     setLoadingCh]     = useState(true);
  const [chError,       setChError]       = useState('');

  // Search / filter
  const [searchQ, setSearchQ] = useState('');

  // Messages state
  const [messages,    dispatch]      = useReducer(reducer, []);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending,     setSending]    = useState(false);
  const [sendError,   setSendError]  = useState('');

  // UI state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewDM,       setShowNewDM]       = useState(false);
  const [showGroupInfo,   setShowGroupInfo]   = useState(false);
  const [mobileView,      setMobileView]      = useState<'list' | 'chat'>('list');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestRef  = useRef<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  // Load channels on mount
  useEffect(() => {
    chatApi.listChannels()
      .then(chs => {
        setChannels(chs);
        if (chs[0]) setActiveChannel(chs[0]);
      })
      .catch(err => setChError(err.message || 'Failed to load channels.'))
      .finally(() => setLoadingCh(false));
  }, []);

  // Load messages when active channel changes
  useEffect(() => {
    if (!activeChannel) return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    setLoadingMsgs(true); setSendError('');
    dispatch({ type: 'SET', messages: [] });
    latestRef.current = null;

    chatApi.getMessages(activeChannel.id)
      .then(msgs => {
        dispatch({ type: 'SET', messages: msgs });
        latestRef.current = msgs[msgs.length - 1]?.id ?? null;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch(() => {/* silent */})
      .finally(() => setLoadingMsgs(false));
  }, [activeChannel?.id]);

  // Polling for new messages
  useEffect(() => {
    if (!activeChannel || loadingMsgs) return;
    pollingRef.current = setInterval(async () => {
      try {
        const inc = await chatApi.getMessages(activeChannel.id);
        if (latestRef.current) {
          const idx   = inc.findIndex(m => m.id === latestRef.current);
          const newer = idx >= 0 ? inc.slice(idx + 1) : [];
          if (newer.length) {
            dispatch({ type: 'MERGE', messages: newer });
            latestRef.current = newer[newer.length - 1].id;
            const el = listRef.current;
            if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100)
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

            // Update last_message in channels list
            const last = newer[newer.length - 1];
            setChannels(prev => prev.map(c =>
              c.id === activeChannel.id
                ? { ...c, last_message: { id: last.id, body: last.body, sender_name: last.sender ? `${last.sender.first_name} ${last.sender.last_name}` : 'Someone', created_at: last.created_at } }
                : c
            ));
          }
        } else {
          dispatch({ type: 'MERGE', messages: inc });
          if (inc.length) latestRef.current = inc[inc.length - 1].id;
        }
      } catch { /* silent */ }
    }, POLL_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeChannel?.id, loadingMsgs]);

  const handleSend = useCallback(async (text: string, attachment?: ChatAttachment) => {
    if (!activeChannel || !user) return;
    setSendError(''); setSending(true);
    const tempId = `opt-${Date.now()}`;
    const optimistic: OptMsg = {
      id: tempId, channel_id: activeChannel.id, sender_id: user.id,
      body: text || null, created_at: new Date().toISOString(), _opt: true,
      attachment_url: attachment?.url ?? null,
      file_name:      attachment?.file_name ?? null,
      mime_type:      attachment?.mime_type ?? null,
      file_size:      attachment?.file_size ?? null,
      sender: { id: user.id, first_name: user.first_name, last_name: user.last_name, role: user.role, email: user.email },
    };
    dispatch({ type: 'ADD_OPT', message: optimistic });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const confirmed = await chatApi.sendMessage(activeChannel.id, text, attachment);
      dispatch({ type: 'CONFIRM', tempId, confirmed });
      latestRef.current = confirmed.id;
    } catch (err: unknown) {
      dispatch({ type: 'REJECT', tempId });
      setSendError(err instanceof Error ? err.message : 'Failed to send.');
    } finally { setSending(false); }
  }, [activeChannel, user]);

  const handleDeleteMsg = useCallback(async (id: string) => {
    dispatch({ type: 'REMOVE', id });
    try { await chatApi.deleteMessage(id); } catch { /* poll restores if failed */ }
  }, []);

  function switchChannel(ch: ChatChannel) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setActiveChannel(ch);
    setShowGroupInfo(false);
    if (mobile) setMobileView('chat');
  }

  function handleGroupCreated(ch: ChatChannel) {
    setChannels(prev => [ch, ...prev]);
    setShowCreateGroup(false);
    switchChannel(ch);
  }

  function handleDMChannel(ch: ChatChannel) {
    setChannels(prev => {
      const exists = prev.find(c => c.id === ch.id);
      return exists ? prev : [ch, ...prev];
    });
    setShowNewDM(false);
    switchChannel(ch);
  }

  function handleMembersChange() {
    chatApi.listChannels().then(chs => {
      setChannels(chs);
      if (activeChannel && !chs.find(c => c.id === activeChannel.id)) {
        setActiveChannel(chs[0] ?? null);
        if (mobile) setMobileView('list');
      }
    }).catch(() => {});
  }

  // Filtered channels for search
  const filteredChannels = channels.filter(ch => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    const name = ch.type === 'direct' && ch.other_user
      ? `${ch.other_user.first_name} ${ch.other_user.last_name}`
      : ch.name;
    return name.toLowerCase().includes(q);
  });

  // Separate into groups and DMs
  const groupChannels = filteredChannels.filter(c => c.type !== 'direct');
  const dmChannels    = filteredChannels.filter(c => c.type === 'direct');

  const msgGroups = groupMessages(messages, user?.id ?? '');

  // ── Channel List Panel ────────────────────────────────────────────
  const ChannelListPanel = (
    <div style={{ width: mobile ? '100%' : 300, flexShrink: 0, background: '#FFFFFF', borderRight: mobile ? 'none' : '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F5F7FA' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Messages</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowNewDM(true)} title="New Direct Message"
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              <IcoPencil />
            </button>
            {isAdmin && (
              <button onClick={() => setShowCreateGroup(true)} title="Create Group"
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.32)' }}>
                <IcoPlus />
              </button>
            )}
          </div>
        </div>
        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><IcoSearch /></div>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search conversations…"
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.82rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#F8FAFC', fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.background = '#FFF'; }}
            onBlur={e  => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingCh ? (
          <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
          </div>
        ) : channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No conversations yet</div>
            {isAdmin && <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Create a group or send a DM to get started</div>}
          </div>
        ) : (
          <>
            {groupChannels.length > 0 && (
              <div>
                <div style={{ padding: '10px 16px 4px', fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Groups</div>
                {groupChannels.map(ch => <ChannelRow key={ch.id} ch={ch} isActive={activeChannel?.id === ch.id} onClick={() => switchChannel(ch)} />)}
              </div>
            )}
            {dmChannels.length > 0 && (
              <div>
                <div style={{ padding: '10px 16px 4px', fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Direct Messages</div>
                {dmChannels.map(ch => <ChannelRow key={ch.id} ch={ch} isActive={activeChannel?.id === ch.id} onClick={() => switchChannel(ch)} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Chat Window ───────────────────────────────────────────────────
  const displayName = activeChannel?.type === 'direct' && activeChannel.other_user
    ? `${activeChannel.other_user.first_name} ${activeChannel.other_user.last_name}`
    : activeChannel?.name ?? 'Select a conversation';

  const ChatWindow = (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #F5F7FA', background: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {mobile && (
            <button onClick={() => setMobileView('list')} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
              <IcoChevronLeft />
            </button>
          )}
          {activeChannel && <ChannelAvatar ch={activeChannel} size={40} />}
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>{displayName}</div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>
              {activeChannel ? (
                activeChannel.type === 'direct'
                  ? `Direct message · ${activeChannel.other_user?.role ?? ''}`
                  : `${CHANNEL_TYPE_LABELS[activeChannel.type]}${activeChannel.member_count ? ` · ${activeChannel.member_count} members` : ''}`
              ) : 'Choose a conversation'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.20)' }} />
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>Live · {POLL_MS / 1000}s</span>
          </div>
          {activeChannel && (
            <button onClick={() => setShowGroupInfo(true)} title="Group info"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              <IcoInfo />
            </button>
          )}
        </div>
      </div>

      {chError && <div className="alert alert-error" style={{ margin: '10px 16px', flexShrink: 0 }}>{chError}</div>}

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 18px 6px', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
        {!activeChannel ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0.5 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EEF2FF', border: '2px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>💬</div>
            <div style={{ fontWeight: 600, color: '#64748B', fontSize: '0.9rem', textAlign: 'center' }}>Select a conversation<br />to start messaging</div>
          </div>
        ) : loadingMsgs ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: i % 2 === 0 ? 'row-reverse' : 'row' }}>
                <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 44, width: `${30 + i * 10}%`, borderRadius: i % 2 === 0 ? '18px 4px 18px 18px' : '4px 18px 18px 18px' }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.5 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEF2FF', border: '2px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>💬</div>
            <div style={{ fontWeight: 600, color: '#64748B', fontSize: '0.85rem' }}>No messages yet — say hello!</div>
          </div>
        ) : (
          msgGroups.map(({ date, items }) => (
            <div key={date}>
              <DateSep date={date} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {items.map(({ msg, isSelf, showHeader, isLast }) => (
                  <MessageBubble
                    key={msg.id} msg={msg} isSelf={isSelf} showHeader={showHeader} isLast={isLast}
                    canDelete={!msg._opt && (isSelf || isAdmin)}
                    onDelete={() => handleDeleteMsg(msg.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {sendError && (
        <div className="alert alert-error" style={{ margin: '0 16px 6px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.83rem' }}>{sendError}</span>
          <button onClick={() => setSendError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px', marginLeft: 'auto' }}>✕</button>
        </div>
      )}

      <InputBar onSend={handleSend} disabled={sending || !activeChannel} activeChannelId={activeChannel?.id ?? null} />
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="sams-chat-window" style={{ display: 'flex', minHeight: 0, height: 'calc(100vh - 112px)', maxHeight: 800, gap: 0, background: '#F8FAFC', borderRadius: 20, overflow: 'hidden', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 24px rgba(15,23,42,0.07)' }}>
        {mobile ? (
          mobileView === 'list' ? ChannelListPanel : ChatWindow
        ) : (
          <>{ChannelListPanel}{ChatWindow}</>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
          academyId={user?.academy_id ?? ''}
        />
      )}
      {showNewDM && (
        <NewDMModal
          onClose={() => setShowNewDM(false)}
          onChannel={handleDMChannel}
        />
      )}
      {showGroupInfo && activeChannel && (
        <GroupInfoPanel
          channel={activeChannel}
          onClose={() => setShowGroupInfo(false)}
          isAdmin={isAdmin}
          onMembersChange={handleMembersChange}
        />
      )}
    </div>
  );
}

// ─── Channel Row (conversation list item) ────────────────────────────
function ChannelRow({ ch, isActive, onClick }: { ch: ChatChannel; isActive: boolean; onClick: () => void }) {
  const av = channelAvatar(ch);
  const displayName = ch.type === 'direct' && ch.other_user
    ? `${ch.other_user.first_name} ${ch.other_user.last_name}`
    : ch.name;
  const lastMsg = ch.last_message;
  const preview = lastMsg?.body
    ? (lastMsg.body.length > 42 ? `${lastMsg.body.slice(0, 42)}…` : lastMsg.body)
    : lastMsg ? '📎 Attachment' : 'No messages yet';
  const time = lastMsg ? relativeTime(lastMsg.created_at) : '';

  const TYPE_DOT: Record<string, string> = {
    team: '#3B82F6', role_group: '#10B981', custom_group: '#8B5CF6', direct: '#94A3B8',
  };

  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 14px', background: isActive ? '#F5F3FF' : 'none', border: 'none', borderLeft: `3px solid ${isActive ? '#6366F1' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: isActive ? av.bg : av.bg, border: `2px solid ${isActive ? av.ring : av.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: av.text }}>
          {av.label}
        </div>
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: TYPE_DOT[ch.type] || '#94A3B8', border: '2px solid white' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontWeight: isActive ? 700 : 600, fontSize: '0.85rem', color: isActive ? '#4338CA' : '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{displayName}</span>
          {time && <span style={{ fontSize: '0.62rem', color: isActive ? '#6366F1' : '#94A3B8', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{time}</span>}
        </div>
        <div style={{ fontSize: '0.73rem', color: isActive ? '#6366F1' : '#94A3B8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastMsg && !ch.last_message?.body ? preview : (
            <>{lastMsg && ch.type !== 'direct' ? <span style={{ fontWeight: 500, color: '#64748B' }}>{lastMsg.sender_name.split(' ')[0]}: </span> : null}{preview}</>
          )}
        </div>
      </div>
    </button>
  );
}
