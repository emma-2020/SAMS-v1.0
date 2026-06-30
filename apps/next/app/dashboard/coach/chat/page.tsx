'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useSearchParams } from 'next/navigation';
import { chatApi, meetingsApi } from '@sams/api';
import type { ChatChannel, ChatChannelMember, ChatMessage, ChatAttachment, TeamMember, ReportedMessage, CallSession } from '@sams/api';
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
  Coach:  { bg: '#EDE9FE', color: '#7C3AED', border: '#DDD6FE' },
  Player: { bg: '#D1FAE5', color: '#059669', border: '#A7F3D0' },
  Parent: { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
};

const GROUP_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981', '#7C3AED', '#EF4444',
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
const IcoBellOff = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
    <path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IcoBell = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IcoFlag = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);
const IcoLock = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IcoLogOut = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcoBlock = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const IcoImage = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IcoPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IcoVideoCall = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);
const IcoPhoneOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-3.41m-2.7-5.24a19.42 19.42 0 0 1-1.07-3.5 2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27"/>
  </svg>
);
const IcoMicOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IcoMicOn = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IcoCamOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/>
  </svg>
);
const IcoCamOn = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);
const IcoScreenShare = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

// ── Message ticks (WhatsApp-style) ───────────────────────────────────
// Ticks render BELOW the bubble on a light (#F8FAFC) background, so colors must be visible
function MsgTicks({ isOpt }: { isOpt?: boolean }) {
  if (isOpt) {
    // Single grey tick = sending / pending
    return (
      <svg width="13" height="9" viewBox="0 0 13 9" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 4.5L5 8L11.5 1" stroke="#94A3B8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  // Double indigo tick = delivered / confirmed
  return (
    <svg width="17" height="9" viewBox="0 0 17 9" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1.5 4.5L5 8L11.5 1" stroke="#6366F1" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 4.5L9 8L15.5 1" stroke="#6366F1" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Online presence utilities ─────────────────────────────────────────
function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000; // 5 min window
}

function lastSeenLabel(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return 'offline';
  if (isOnline(lastSeenAt)) return 'Online';
  const sec = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
  if (sec < 3600)  return `Last seen ${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `Last seen ${Math.floor(sec / 3600)}h ago`;
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

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

function MsgAvatar({ name, size = 34, avatarUrl }: { name: string; size?: number; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid #E2E8F0', boxShadow: '0 2px 6px rgba(15,23,42,0.10)' }} />
    );
  }
  const p = avatarPalette(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: p.bg, border: `2px solid ${p.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.3), fontWeight: 800, color: p.text, boxShadow: `0 2px 6px ${p.ring}80` }}>
      {initials(name)}
    </div>
  );
}

function MessageBubble({ msg, isSelf, showHeader, isLast, canDelete, onDelete, onReport }: {
  msg: OptMsg; isSelf: boolean; showHeader: boolean; isLast: boolean;
  canDelete?: boolean; onDelete?: () => void; onReport?: (id: string) => void;
}) {
  const [ts,         setTs]         = useState(() => relativeTime(msg.created_at));
  const [hovered,    setHovered]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const u    = msg.sender;
  const name = u ? `${u.first_name} ${u.last_name}` : 'Unknown';
  const role = u?.role ?? '';
  const rs   = ROLE_STYLES[role];

  useEffect(() => {
    const t = setInterval(() => setTs(relativeTime(msg.created_at)), 30_000);
    return () => clearInterval(t);
  }, [msg.created_at]);

  function startLongPress() {
    longPressRef.current = setTimeout(() => setHovered(true), 500);
  }
  function cancelLongPress() {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  }
  function handleTouchEnd() {
    cancelLongPress();
  }

  function handleCopy() {
    if (msg.body) {
      navigator.clipboard.writeText(msg.body).catch(() => {});
      setCopied(true);
      setTimeout(() => { setCopied(false); setHovered(false); }, 1500);
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, opacity: msg._opt ? 0.65 : 1, transition: 'opacity 0.2s', marginBottom: showHeader ? 8 : 2, paddingLeft: isSelf ? 56 : 0, paddingRight: isSelf ? 0 : 56 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false); }}
      onTouchStart={startLongPress}
      onTouchEnd={handleTouchEnd}
      onTouchMove={cancelLongPress}
    >
      {showHeader
        ? <MsgAvatar name={name} size={34} avatarUrl={u?.avatar_url} />
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

          {hovered && !msg._opt && (msg.body || onReport || canDelete) && (
            <div style={{ position: 'absolute', top: -12, zIndex: 20, display: 'flex', gap: 4, ...(isSelf ? { left: -4, transform: 'translateX(-100%)' } : { right: -4, transform: 'translateX(100%)' }) }}>
              {!confirming ? (
                <>
                  {msg.body && (
                    <button onClick={e => { e.stopPropagation(); handleCopy(); }}
                      title={copied ? 'Copied!' : 'Copy text'}
                      style={{ height: 28, padding: '0 8px', borderRadius: 7, border: '1px solid #E2E8F0', background: copied ? '#ECFDF5' : '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: copied ? '#059669' : '#64748B', fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(15,23,42,0.07)' }}>
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                  )}
                  {onReport && !isSelf && (
                    <button onClick={e => { e.stopPropagation(); onReport(msg.id); }}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #FDE68A', background: '#FFFBEB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', boxShadow: '0 2px 6px rgba(217,119,6,0.15)' }}
                      title="Report message">
                      <IcoFlag />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={e => { e.stopPropagation(); setConfirming(true); }}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #FECDD3', background: '#FFF1F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F43F5E', boxShadow: '0 2px 6px rgba(244,63,94,0.15)' }}
                      title="Delete message">
                      <IcoTrash />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setHovered(false); setConfirming(false); }}
                    style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.8rem', boxShadow: '0 2px 6px rgba(15,23,42,0.07)' }}
                    title="Dismiss">
                    ✕
                  </button>
                </>
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

        {/* Timestamp row — always show for self, only on last in group for others */}
        {isSelf ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 1 }}>
            <span style={{ fontSize: '0.56rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>{ts}</span>
            <MsgTicks isOpt={!!msg._opt} />
          </div>
        ) : (!showHeader && isLast && (
          <span style={{ fontSize: '0.58rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 0 }}>{ts}</span>
        ))}
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
  if (ch.type === 'direct' && ch.other_user?.avatar_url) {
    return (
      <img src={ch.other_user.avatar_url} alt={`${ch.other_user.first_name} ${ch.other_user.last_name}`}
        style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid #E2E8F0' }} />
    );
  }
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
        setSearchRes(users.users.filter(u => !selected.find(s => s.id === u.id)));
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
    { value: 'Coach',  label: 'All Coaches',  color: '#7C3AED' },
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
function GroupInfoPanel({ channel, onClose, isAdmin, onMembersChange, onChannelUpdate, messages = [] }: {
  channel: ChatChannel;
  onClose: () => void;
  isAdmin: boolean;
  onMembersChange: () => void;
  onChannelUpdate?: (updated: Partial<ChatChannel>) => void;
  messages?: OptMsg[];
}) {
  const user = useAuthStore(s => s.user);
  const [members,    setMembers]    = useState<ChatChannelMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [addSearch,  setAddSearch]  = useState('');
  const [addResults, setAddResults] = useState<TeamMember[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);
  const [leaving,      setLeaving]      = useState(false);
  const [muting,       setMuting]       = useState(false);
  const [blocking,     setBlocking]     = useState(false);
  const [isBlocked,    setIsBlocked]    = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [editName,     setEditName]     = useState(channel.name);
  const [editDesc,     setEditDesc]     = useState(channel.description ?? '');
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState('');
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const [infoTab,      setInfoTab]      = useState<'media' | 'docs' | 'search' | 'members'>(() => channel.type === 'direct' ? 'media' : 'members');
  const [searchQuery,  setSearchQuery]  = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DM: derive shared media/docs/search from passed messages
  const mediaItems    = messages.filter(m => m.attachment_url && m.mime_type?.startsWith('image/'));
  const docItems      = messages.filter(m => m.attachment_url && m.mime_type && !m.mime_type.startsWith('image/'));
  const searchResults = searchQuery.trim()
    ? messages.filter(m => m.body?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const isDirect = channel.type === 'direct';
  const isTeam   = channel.type === 'team';
  const isMuted  = channel.is_muted ?? false;
  const otherUser = isDirect ? channel.other_user : null;

  useEffect(() => {
    chatApi.getChannelMembers(channel.id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [channel.id]);

  // For DMs, check if other user is blocked
  useEffect(() => {
    if (!isDirect || !otherUser) return;
    chatApi.getBlockedUsers().then(list => {
      setIsBlocked(list.some(u => u.id === otherUser.id));
    }).catch(() => {});
  }, [isDirect, otherUser?.id]);

  useEffect(() => {
    if (!isAdmin || isDirect) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!addSearch.trim()) { setAddResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const result = await chatApi.searchUsers(addSearch);
        setAddResults(result.users.filter(u => !members.find(m => m.user_id === u.id)));
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [addSearch, members, isAdmin, isDirect]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

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

  async function handleClearChat() {
    const label = isDirect
      ? `Clear all messages with ${otherUser?.first_name ?? 'this contact'}?`
      : `Clear all messages in "${channel.name}"?`;
    if (!confirm(`${label} This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await chatApi.deleteGroup(channel.id);
      onMembersChange();
      onClose();
    } catch { setDeleting(false); }
  }

  async function handleLeave() {
    if (!confirm('Leave this group?')) return;
    setLeaving(true);
    try {
      await chatApi.leaveChannel(channel.id);
      onMembersChange();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to leave.');
      setLeaving(false);
    }
  }

  async function handleMuteToggle(mutedUntil?: string | null) {
    setMuting(true);
    try {
      if (isMuted) {
        await chatApi.unmuteChannel(channel.id);
        onChannelUpdate?.({ is_muted: false, muted_until: null });
        showToast('Notifications unmuted');
      } else {
        await chatApi.muteChannel(channel.id, mutedUntil ?? null);
        onChannelUpdate?.({ is_muted: true, muted_until: mutedUntil ?? null });
        showToast('Notifications muted');
      }
    } catch { /* ignore */ }
    finally { setMuting(false); }
  }

  async function handleBlockToggle() {
    if (!otherUser) return;
    const action = isBlocked ? 'Unblock' : 'Block';
    if (!confirm(`${action} ${otherUser.first_name}?`)) return;
    setBlocking(true);
    try {
      if (isBlocked) {
        await chatApi.unblockUser(otherUser.id);
        setIsBlocked(false);
        showToast(`Unblocked ${otherUser.first_name}`);
      } else {
        await chatApi.blockUser(otherUser.id);
        setIsBlocked(true);
        showToast(`Blocked ${otherUser.first_name}`);
      }
    } catch { /* ignore */ }
    finally { setBlocking(false); }
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await chatApi.updateGroup(channel.id, { name: editName.trim(), description: editDesc.trim() });
      onChannelUpdate?.({ name: editName.trim(), description: editDesc.trim() });
      setEditing(false);
      showToast('Group updated');
      onMembersChange();
    } catch { showToast('Failed to save.'); }
    finally { setSaving(false); }
  }

  const av = channelAvatar(channel);
  const isMemberAndNotAdmin = !isAdmin && !isDirect && !isTeam;
  const muteOptions = [
    { label: 'Mute for 8 hours',  ms: 8  * 3600 * 1000 },
    { label: 'Mute for 24 hours', ms: 24 * 3600 * 1000 },
    { label: 'Mute for 1 week',   ms: 7  * 86400 * 1000 },
    { label: 'Mute forever',      ms: null },
  ];

  // ── shared mute dropdown rendered for both DM and group ──────────────
  function MuteDropdown() {
    return (
      <div style={{ position: 'relative' }}>
        {isMuted ? (
          <button onClick={() => handleMuteToggle()} disabled={muting}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <IcoBell size={16} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#0F172A' }}>Unmute notifications</div>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                {channel.muted_until ? `Until ${new Date(channel.muted_until).toLocaleDateString()}` : 'Muted forever'}
              </div>
            </div>
            {muting && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
          </button>
        ) : (
          <>
            <button onClick={() => setShowMuteMenu(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <IcoBellOff size={16} />
              <span style={{ fontWeight: 600, fontSize: '0.83rem', color: '#0F172A', flex: 1 }}>Mute notifications</span>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'inline-block', transition: 'transform 0.15s', transform: showMuteMenu ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {showMuteMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 20, marginTop: 4, overflow: 'hidden' }}>
                {muteOptions.map(opt => (
                  <button key={opt.label}
                    onClick={() => { setShowMuteMenu(false); const until = opt.ms ? new Date(Date.now() + opt.ms).toISOString() : null; handleMuteToggle(until); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F8FAFC', textAlign: 'left', fontSize: '0.83rem', color: '#1E293B', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 360, height: '100vh', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(15,23,42,0.15)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><IcoChevronLeft /></button>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', flex: 1 }}>{isDirect ? 'Contact Info' : 'Group Info'}</div>
          {isAdmin && !isDirect && !isTeam && !editing && (
            <button onClick={() => { setEditing(true); setEditName(channel.name); setEditDesc(channel.description ?? ''); }}
              style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              <IcoPencil />
            </button>
          )}
        </div>

        {toast && (
          <div style={{ margin: '8px 16px 0', padding: '8px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, fontSize: '0.78rem', color: '#15803D', fontWeight: 600 }}>{toast}</div>
        )}

        {/* ── DM: WhatsApp-style contact view ── */}
        {isDirect ? (
          <>
            {/* Big avatar + name + role + presence */}
            <div style={{ padding: '28px 20px 20px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ position: 'relative', width: 88, margin: '0 auto 14px' }}>
                {otherUser?.avatar_url ? (
                  <img src={otherUser.avatar_url} alt={otherUser.first_name} style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '4px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15,23,42,0.12)' }} />
                ) : (
                  <div style={{ width: 88, height: 88, borderRadius: '50%', background: av.bg, border: `4px solid ${av.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem', fontWeight: 800, color: av.text, boxShadow: `0 4px 20px ${av.ring}80` }}>
                    {av.label}
                  </div>
                )}
                {/* Online indicator dot */}
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: isOnline(otherUser?.last_seen_at) ? '#10B981' : '#CBD5E1', border: '3px solid white', boxShadow: isOnline(otherUser?.last_seen_at) ? '0 0 0 2px rgba(16,185,129,0.25)' : 'none' }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', marginBottom: 4 }}>
                {otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : channel.name}
              </div>
              {/* Presence label */}
              <div style={{ fontSize: '0.72rem', color: isOnline(otherUser?.last_seen_at) ? '#10B981' : '#94A3B8', fontWeight: 600, marginBottom: 8 }}>
                {lastSeenLabel(otherUser?.last_seen_at)}
              </div>
              {otherUser?.role && (() => {
                const rs = ROLE_STYLES[otherUser.role];
                return (
                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: rs?.color ?? '#6366F1', background: rs?.bg ?? '#EEF2FF', border: `1px solid ${rs?.border ?? '#C7D2FE'}` }}>
                    {otherUser.role}
                  </span>
                );
              })()}
            </div>

            {/* Mute + Block + Delete Conversation */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MuteDropdown />
              <button onClick={handleBlockToggle} disabled={blocking}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${isBlocked ? '#E2E8F0' : '#FECDD3'}`, background: isBlocked ? '#F8FAFC' : '#FFF1F2', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ color: isBlocked ? '#64748B' : '#DC2626' }}><IcoBlock size={16} /></span>
                <span style={{ fontWeight: 600, fontSize: '0.83rem', color: isBlocked ? '#0F172A' : '#DC2626', flex: 1 }}>
                  {isBlocked ? `Unblock ${otherUser?.first_name}` : `Block ${otherUser?.first_name}`}
                </span>
                {blocking && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              </button>
              <button onClick={handleClearChat} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #FECDD3', background: '#FFF1F2', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ color: '#DC2626' }}><IcoTrash /></span>
                <span style={{ fontWeight: 600, fontSize: '0.83rem', color: '#DC2626', flex: 1 }}>
                  {deleting ? 'Deleting…' : 'Delete Conversation'}
                </span>
              </button>
            </div>

            {/* Tabs: Media / Docs / Search */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              {(['media', 'docs', 'search'] as const).map(tab => (
                <button key={tab} onClick={() => setInfoTab(tab)}
                  style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', borderBottom: `2.5px solid ${infoTab === tab ? '#6366F1' : 'transparent'}`, marginBottom: -1, color: infoTab === tab ? '#6366F1' : '#94A3B8', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                  {tab === 'media' ? `Media (${mediaItems.length})` : tab === 'docs' ? `Docs (${docItems.length})` : 'Search'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              {infoTab === 'media' && (
                mediaItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                    <div style={{ marginBottom: 10, color: '#CBD5E1' }}><IcoImage /></div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>No shared photos yet</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {mediaItems.map(m => (
                      <div key={m.id} onClick={() => window.open(m.attachment_url!, '_blank')}
                        style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                        <img src={m.attachment_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )
              )}
              {infoTab === 'docs' && (
                docItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>No shared documents yet</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {docItems.map(m => (
                      <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', textDecoration: 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', flexShrink: 0 }}><IcoFile /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file_name ?? 'Document'}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 2 }}>
                            {m.file_size ? `${(m.file_size / 1024).toFixed(0)} KB · ` : ''}{new Date(m.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )
              )}
              {infoTab === 'search' && (
                <>
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><IcoSearch /></div>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search messages in this chat…" autoFocus
                      style={{ width: '100%', padding: '9px 10px 9px 34px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                      onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                    />
                  </div>
                  {!searchQuery.trim() ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0' }}>Type to search messages</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0' }}>No messages found for &ldquo;{searchQuery}&rdquo;</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {searchResults.slice(0, 30).map(m => {
                        const sName = m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : 'Unknown';
                        const q = searchQuery.toLowerCase();
                        const body = m.body ?? '';
                        const idx = body.toLowerCase().indexOf(q);
                        return (
                          <div key={m.id} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F1F5F9', background: '#FAFBFC' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginBottom: 3 }}>{sName} · {new Date(m.created_at).toLocaleDateString()}</div>
                            <div style={{ fontSize: '0.82rem', color: '#1E293B' }}>
                              {body ? (idx >= 0 ? <>{body.slice(0, idx)}<mark style={{ background: '#FDE68A', borderRadius: 2, padding: '0 1px' }}>{body.slice(idx, idx + searchQuery.length)}</mark>{body.slice(idx + searchQuery.length)}</> : body) : '📎 Attachment'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </>

        ) : (
          /* ── GROUP: 4-tab layout (Media | Docs | Members | Search) ── */
          <>
            <div style={{ padding: '24px 20px 18px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: av.bg, border: `3px solid ${av.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: av.text, margin: '0 auto 12px' }}>
                {av.label}
              </div>
              {editing ? (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>GROUP NAME</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={60}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                      onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={200} rows={3}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                      onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSaveEdit} disabled={saving || !editName.trim()}
                      style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#6366F1', color: 'white', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', opacity: saving || !editName.trim() ? 0.6 : 1 }}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: 4 }}>{channel.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, marginBottom: 4 }}>{CHANNEL_TYPE_LABELS[channel.type]}</div>
                  {channel.description && <div style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 260, margin: '0 auto' }}>{channel.description}</div>}
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 6 }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
                </>
              )}
            </div>

            {!editing && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <MuteDropdown />
              </div>
            )}

            {/* 4-tab bar */}
            {!editing && (
              <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
                {(['media', 'docs', 'members', 'search'] as const).map(tab => (
                  <button key={tab} onClick={() => setInfoTab(tab)}
                    style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: `2.5px solid ${infoTab === tab ? '#6366F1' : 'transparent'}`, marginBottom: -1, color: infoTab === tab ? '#6366F1' : '#94A3B8', fontWeight: 700, fontSize: '0.6rem', cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                    {tab === 'media'   ? `Media (${mediaItems.length})`
                     : tab === 'docs'    ? `Docs (${docItems.length})`
                     : tab === 'members' ? `Members (${members.length})`
                     : 'Search'}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content */}
            {!editing && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                {/* ── Media tab ── */}
                {infoTab === 'media' && (
                  mediaItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                      <div style={{ marginBottom: 10, color: '#CBD5E1' }}><IcoImage /></div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>No shared photos yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                      {mediaItems.map(m => (
                        <div key={m.id} onClick={() => window.open(m.attachment_url!, '_blank')}
                          style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                          <img src={m.attachment_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )
                )}
                {/* ── Docs tab ── */}
                {infoTab === 'docs' && (
                  docItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>No shared documents yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docItems.map(m => (
                        <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', textDecoration: 'none' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', flexShrink: 0 }}><IcoFile /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file_name ?? 'Document'}</div>
                            <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 2 }}>
                              {m.file_size ? `${(m.file_size / 1024).toFixed(0)} KB · ` : ''}{new Date(m.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )
                )}
                {/* ── Members tab ── */}
                {infoTab === 'members' && (
                  <>
                    {isAdmin && !isTeam && (
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
                                <MsgAvatar name={`${u.first_name} ${u.last_name}`} size={28} avatarUrl={u.avatar_url} />
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
                      ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 6 }} />)
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
                              {isAdmin && !isTeam && !m.is_admin && (
                                <button onClick={() => handleRemove(m.user_id)} disabled={removingId === m.user_id}
                                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #FECDD3', background: '#FFF1F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F43F5E', opacity: removingId === m.user_id ? 0.5 : 1 }}>
                                  <IcoX size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                  </>
                )}
                {/* ── Search tab ── */}
                {infoTab === 'search' && (
                  <>
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><IcoSearch /></div>
                      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search messages in this chat…" autoFocus
                        style={{ width: '100%', padding: '9px 10px 9px 34px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                        onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                      />
                    </div>
                    {!searchQuery.trim() ? (
                      <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0' }}>Type to search messages</div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem', padding: '20px 0' }}>No messages found for &ldquo;{searchQuery}&rdquo;</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {searchResults.slice(0, 30).map(m => {
                          const sName = m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : 'Unknown';
                          const q = searchQuery.toLowerCase();
                          const body = m.body ?? '';
                          const idx = body.toLowerCase().indexOf(q);
                          return (
                            <div key={m.id} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F1F5F9', background: '#FAFBFC' }}>
                              <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginBottom: 3 }}>{sName} · {new Date(m.created_at).toLocaleDateString()}</div>
                              <div style={{ fontSize: '0.82rem', color: '#1E293B' }}>
                                {body ? (idx >= 0 ? <>{body.slice(0, idx)}<mark style={{ background: '#FDE68A', borderRadius: 2, padding: '0 1px' }}>{body.slice(idx, idx + searchQuery.length)}</mark>{body.slice(idx + searchQuery.length)}</> : body) : '📎 Attachment'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!editing && (
              <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {!isTeam && (
                  <button onClick={handleLeave} disabled={leaving}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <IcoLogOut size={15} />
                    {leaving ? 'Leaving…' : 'Leave Group'}
                  </button>
                )}
                {isAdmin && !isTeam && (
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, border: '1.5px solid #FECDD3', background: '#FFF1F2', color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <IcoTrash />
                    {deleting ? 'Deleting…' : 'Delete Group'}
                  </button>
                )}
              </div>
            )}
          </>
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
  const currentUser = useAuthStore(s => s.user);
  const [query,          setQuery]          = useState('');
  const [results,        setResults]        = useState<TeamMember[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [opening,        setOpening]        = useState<string | null>(null);
  const [dmPolicyError,  setDmPolicyError]  = useState<string | null>(null);
  const [coachPlayerDms, setCoachPlayerDms] = useState(true);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    setLoading(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await chatApi.searchUsers(query);
        setResults(res.users);
        setCoachPlayerDms(res.academy_allows_coach_player_dm);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query]);

  function isRestricted(u: TeamMember): boolean {
    if (coachPlayerDms) return false;
    const myRole = currentUser?.role;
    return (myRole === 'Coach' && u.role === 'Player') || (myRole === 'Player' && u.role === 'Coach');
  }

  async function openDM(u: TeamMember) {
    if (isRestricted(u)) {
      setDmPolicyError(`Your academy has disabled direct messages between coaches and players. Contact your admin to enable this.`);
      return;
    }
    setOpening(u.id);
    setDmPolicyError(null);
    try {
      const ch = await chatApi.getOrCreateDirect(u.id);
      onChannel(ch);
    } catch (err: unknown) {
      setDmPolicyError(err instanceof Error ? err.message : 'Failed to open chat.');
    } finally { setOpening(null); }
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
          {dmPolicyError && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: '0.75rem', color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <IcoLock size={14} />
              {dmPolicyError}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
          {loading
            ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 6 }} />)
            : results.length === 0
              ? <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', padding: '24px 0' }}>No users found</div>
              : results.map((u, i) => {
                  const rs = ROLE_STYLES[u.role];
                  const isOpening = opening === u.id;
                  const locked = isRestricted(u);
                  return (
                    <button key={u.id} onClick={() => openDM(u)} disabled={!!opening}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid #F8FAFC' : 'none', cursor: locked ? 'not-allowed' : (opening ? 'wait' : 'pointer'), textAlign: 'left', borderRadius: 10, opacity: locked ? 0.5 : (opening && !isOpening ? 0.5 : 1), transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (!opening && !locked) e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <MsgAvatar name={`${u.first_name} ${u.last_name}`} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {u.first_name} {u.last_name}
                          {locked && <span title="DMs restricted by academy policy"><IcoLock size={11} /></span>}
                        </div>
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

// ─── Call control button helper ────────────────────────────────────────
function CallCtrlBtn({ on, offColor = 'rgba(255,255,255,0.18)', onColor = '#EF4444', onClick, label, children }: {
  on: boolean; offColor?: string; onColor?: string; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <button onClick={onClick} style={{ width: 58, height: 58, borderRadius: '50%', background: on ? onColor : offColor, border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transition: 'all 0.15s' }}>
        {children}
      </button>
      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
    </div>
  );
}

// ─── WhatsApp-style CallRoom ───────────────────────────────────────────
function CallRoom({ roomUrl, sessionId, title, onLeave }: { roomUrl: string; sessionId?: string; title: string; onLeave: () => void }) {
  const callRef        = useRef<any>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const audioRefs      = useRef<Record<string, HTMLAudioElement>>({});
  const speakerRef     = useRef(true);

  const [phase,       setPhase]       = useState<'calling' | 'ringing' | 'connected'>('calling');
  const [muted,       setMuted]       = useState(false);
  const [camOff,      setCamOff]      = useState(false);
  const [speakerOn,   setSpeakerOn]   = useState(true);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [dots,        setDots]        = useState('');

  // Animated dots while calling/ringing
  useEffect(() => {
    if (phase === 'connected') return;
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, [phase]);

  // Timer ticks while connected
  useEffect(() => {
    if (phase !== 'connected') return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Speaker toggle applies to already-created audio elements
  useEffect(() => {
    speakerRef.current = speakerOn;
    Object.values(audioRefs.current).forEach(el => { el.muted = !speakerOn; });
  }, [speakerOn]);

  useEffect(() => {
    let call: any;
    import('@daily-co/daily-js').then(mod => {
      const Daily = (mod as any).default ?? mod;
      call = Daily.createCallObject({ audioSource: true, videoSource: true });
      callRef.current = call;

      function sync() {
        const all     = Object.values(call.participants()) as any[];
        const remotes = all.filter((p: any) => !p.local);

        // Detect if any remote participant has a playable video track
        const vidPart = remotes.find((p: any) => {
          const v = p.tracks?.video;
          return v?.persistentTrack && (v.state === 'playable' || v.state === 'loading');
        });

        setRemoteVideo(!!vidPart);

        if (vidPart?.tracks?.video?.persistentTrack && remoteVideoRef.current) {
          const t = vidPart.tracks.video.persistentTrack;
          const cur = remoteVideoRef.current.srcObject as MediaStream | null;
          if (!cur || !cur.getTracks().includes(t)) {
            remoteVideoRef.current.srcObject = new MediaStream([t]);
          }
        } else if (!vidPart && remoteVideoRef.current) {
          // Clear to avoid black frozen frame
          remoteVideoRef.current.srcObject = null;
        }

        // Wire audio for each remote
        remotes.forEach((p: any) => {
          const at = p.tracks?.audio?.persistentTrack;
          if (!at || p.tracks?.audio?.state !== 'playable') return;
          if (!audioRefs.current[p.session_id]) {
            const el = new Audio();
            el.autoplay = true;
            el.muted = !speakerRef.current;
            el.srcObject = new MediaStream([at]);
            el.play().catch(() => {});
            audioRefs.current[p.session_id] = el;
          }
        });

        // Local video refresh
        const lv = call.participants().local?.tracks?.video?.persistentTrack;
        if (lv && localVideoRef.current) {
          const cur = localVideoRef.current.srcObject as MediaStream | null;
          if (!cur || !cur.getTracks().includes(lv)) {
            localVideoRef.current.srcObject = new MediaStream([lv]);
          }
        }

        if (remotes.length > 0) setPhase('connected');
      }

      call.on('joined-meeting', () => {
        setPhase('ringing');
        const lv = call.participants().local?.tracks?.video?.persistentTrack;
        if (lv && localVideoRef.current) localVideoRef.current.srcObject = new MediaStream([lv]);
      });

      ['participant-joined', 'participant-left', 'participant-updated', 'track-started', 'track-stopped'].forEach(ev => call.on(ev, sync));

      call.join({ url: roomUrl }).catch(console.error);
    });

    return () => {
      Object.values(audioRefs.current).forEach(el => el.pause());
      audioRefs.current = {};
      if (call) { call.leave().catch(() => {}); call.destroy(); }
    };
  }, [roomUrl]);

  async function leave() {
    if (callRef.current) { await callRef.current.leave().catch(() => {}); callRef.current.destroy(); }
    if (sessionId) await meetingsApi.updateCallStatus(sessionId, 'ended').catch(() => {});
    onLeave();
  }

  function toggleMute() {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.setLocalAudio(!next);
    setMuted(next);
  }

  function toggleCam() {
    if (!callRef.current) return;
    const next = !camOff;
    callRef.current.setLocalVideo(!next);
    setCamOff(next);
    if (next && localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    } else {
      const lv = callRef.current?.participants()?.local?.tracks?.video?.persistentTrack;
      if (lv && localVideoRef.current) localVideoRef.current.srcObject = new MediaStream([lv]);
    }
  }

  const mm       = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss       = String(elapsed % 60).padStart(2, '0');
  const initials = title.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
  const statusText = phase === 'calling' ? `Calling${dots}` : phase === 'ringing' ? `Ringing${dots}` : `${mm}:${ss}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'inherit', color: '#fff', userSelect: 'none' }}>

      {/* Remote video — always in DOM, hidden when off (avoids remount flicker) */}
      <video ref={remoteVideoRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: remoteVideo ? 1 : 0, transition: 'opacity 0.3s' }} />

      {/* Scrim so text is always readable over video */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: remoteVideo ? 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.7) 100%)' : 'transparent', transition: 'opacity 0.3s' }} />

      {/* ── TOP BAR: name + status always visible ── */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: 'max(52px, env(safe-area-inset-top, 52px))', paddingBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center', padding: '52px 20px 0' }}>
        <div style={{ fontWeight: 700, fontSize: 'clamp(1.1rem,4vw,1.3rem)', textShadow: '0 2px 10px rgba(0,0,0,0.55)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.02em' }}>{statusText}</div>
      </div>

      {/* ── CENTER: avatar when remote video is off ── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {/* Avatar always visible — opacity transitions when video comes/goes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, opacity: remoteVideo ? 0 : 1, transition: 'opacity 0.3s', pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: 'clamp(100px,25vw,140px)', height: 'clamp(100px,25vw,140px)' }}>
            {/* Pulse rings — show while calling or ringing */}
            {phase !== 'connected' && [1, 2, 3].map(i => (
              <div key={i} style={{ position: 'absolute', inset: -i * 20, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', animation: `wa-pulse ${0.9 + i * 0.35}s ease-out infinite`, animationDelay: `${i * 0.22}s` }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1.8rem,6vw,2.4rem)', fontWeight: 800, color: '#fff', boxShadow: phase !== 'connected' ? '0 0 52px rgba(99,102,241,0.5)' : '0 8px 40px rgba(0,0,0,0.5)' }}>
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* ── LOCAL VIDEO PIP: bottom-right corner ── */}
      {!camOff && phase === 'connected' && (
        <div style={{ position: 'absolute', zIndex: 20, bottom: 'calc(max(40px, env(safe-area-inset-bottom, 40px)) + 90px)', right: 16, width: 'clamp(72px,20vw,88px)', height: 'clamp(108px,28vw,128px)', borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.22)', boxShadow: '0 8px 28px rgba(0,0,0,0.55)', background: '#1E293B' }}>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        </div>
      )}

      {/* ── BOTTOM CONTROLS ── */}
      <div style={{ position: 'relative', zIndex: 10, paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 'clamp(12px,4vw,28px)', padding: '0 20px' }}>

          {/* Speaker */}
          <CallCtrlBtn on={!speakerOn} onClick={() => setSpeakerOn(s => !s)} label="Speaker">
            {speakerOn ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            )}
          </CallCtrlBtn>

          {/* Mute */}
          <CallCtrlBtn on={muted} onClick={toggleMute} label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <IcoMicOff /> : <IcoMicOn />}
          </CallCtrlBtn>

          {/* End call — big red, centre */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <button onClick={leave} style={{ width: 68, height: 68, borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 28px rgba(239,68,68,0.55)', transform: 'rotate(135deg)', transition: 'all 0.15s' }}>
              <IcoPhone />
            </button>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>End</span>
          </div>

          {/* Camera */}
          <CallCtrlBtn on={camOff} onClick={toggleCam} label={camOff ? 'Cam on' : 'Camera'}>
            {camOff ? <IcoCamOff /> : <IcoCamOn />}
          </CallCtrlBtn>

          {/* Screen share */}
          <CallCtrlBtn on={false} onClick={() => callRef.current?.startScreenShare?.().catch(() => {})} label="Share">
            <IcoScreenShare />
          </CallCtrlBtn>

        </div>
      </div>

      <style>{`
        @keyframes wa-pulse {
          0%   { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.85); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── IncomingCallModal ─────────────────────────────────────────────────
function IncomingCallModal({ onActivate }: { onActivate: (s: CallSession) => void }) {
  const [pending,  setPending]  = useState<CallSession | null>(null);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const calls = await meetingsApi.getPendingCalls();
        if (alive && calls.length > 0) setPending(p => p ?? calls[0]);
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  async function accept() {
    if (!pending) return;
    await meetingsApi.updateCallStatus(pending.id, 'active').catch(() => {});
    onActivate(pending);
    setPending(null);
  }
  async function decline() {
    if (!pending || declining) return;
    setDeclining(true);
    await meetingsApi.updateCallStatus(pending.id, 'ended').catch(() => {});
    setPending(null);
    setDeclining(false);
  }

  if (!pending) return null;
  const callerName = pending.users ? `${pending.users.first_name} ${pending.users.last_name}` : 'Someone';
  const init = callerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <style>{`@keyframes slide-up-ring{from{transform:translate(-50%,30px);opacity:0}to{transform:translate(-50%,0);opacity:1}}@keyframes pulse-ring-chat{0%,100%{box-shadow:0 0 0 8px rgba(99,102,241,.18),0 0 0 16px rgba(99,102,241,.08)}50%{box-shadow:0 0 0 12px rgba(99,102,241,.10),0 0 0 24px rgba(99,102,241,.04)}}`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(11,17,32,.55)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', bottom: 28, left: '50%', zIndex: 9991, width: 320, background: 'linear-gradient(145deg,#1E293B,#0F172A)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 22, padding: '24px 20px 20px', boxShadow: '0 32px 80px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'slide-up-ring .3s cubic-bezier(.34,1.56,.64,1) forwards' }}>
        <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F118,#8B5CF610)', border: '2px solid #6366F135', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: '#818CF8', animation: 'pulse-ring-chat 2s infinite' }}>{init}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Incoming call</div>
          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', letterSpacing: '-.02em' }}>{callerName}</div>
          {pending.users?.role && <div style={{ fontSize: '0.68rem', color: '#818CF8', marginTop: 3 }}>{pending.users.role}</div>}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <button onClick={decline} disabled={declining} style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#DC2626,#EF4444)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,.4)' }}><IcoPhoneOff /></button>
            <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>Decline</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <button onClick={accept} style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10B981)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 16px rgba(16,185,129,.45)' }}><IcoPhone /></button>
            <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>Accept</span>
          </div>
        </div>
      </div>
    </>
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
  const searchParams = useSearchParams();
  const openChannelId = searchParams.get('open');

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
  const [showReports,     setShowReports]     = useState(false);
  const [reportingMsgId,  setReportingMsgId]  = useState<string | null>(null);
  const [mobileView,      setMobileView]      = useState<'list' | 'chat'>('list');

  // Call state
  const [activeCall,   setActiveCall]   = useState<CallSession | null>(null);
  const [startingCall, setStartingCall] = useState(false);

  async function startDirectCall() {
    if (!activeChannel || activeChannel.type !== 'direct' || !activeChannel.other_user || startingCall) return;
    setStartingCall(true);
    try {
      const session = await meetingsApi.startCall({ recipientId: activeChannel.other_user.id });
      setActiveCall(session);
    } catch (e) { console.error(e); }
    finally { setStartingCall(false); }
  }

  async function startGroupCall() {
    if (!activeChannel || startingCall) return;
    setStartingCall(true);
    try {
      const teamId = (activeChannel as any).team_id ?? undefined;
      const session = await meetingsApi.startCall(teamId ? { teamId } : {});
      setActiveCall(session);
    } catch (e) { console.error(e); }
    finally { setStartingCall(false); }
  }

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestRef  = useRef<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  // Load channels on mount; honour ?open= param from roster Message button
  useEffect(() => {
    chatApi.listChannels()
      .then(chs => {
        setChannels(chs);
        const target = openChannelId ? chs.find(c => c.id === openChannelId) : null;
        setActiveChannel(target ?? chs[0] ?? null);
        if (target && mobile) setMobileView('chat');
      })
      .catch(err => setChError(err.message || 'Failed to load channels.'))
      .finally(() => setLoadingCh(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* Clicking name/avatar opens the info panel */}
          <button
            onClick={() => activeChannel && setShowGroupInfo(true)}
            disabled={!activeChannel}
            style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', padding: '4px 6px', cursor: activeChannel ? 'pointer' : 'default', textAlign: 'left', borderRadius: 10, transition: 'opacity 0.15s' }}
            onMouseEnter={e => { if (activeChannel) e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
            {activeChannel && <ChannelAvatar ch={activeChannel} size={40} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', letterSpacing: '-0.01em' }}>{displayName}</div>
              <div style={{ fontSize: '0.7rem', marginTop: 1 }}>
                {activeChannel ? (
                  activeChannel.type === 'direct' ? (
                    <span style={{ color: isOnline(activeChannel.other_user?.last_seen_at) ? '#10B981' : '#94A3B8', fontWeight: isOnline(activeChannel.other_user?.last_seen_at) ? 600 : 400 }}>
                      {lastSeenLabel(activeChannel.other_user?.last_seen_at)}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>{CHANNEL_TYPE_LABELS[activeChannel.type]}{activeChannel.member_count ? ` · ${activeChannel.member_count} members` : ''}</span>
                  )
                ) : <span style={{ color: '#94A3B8' }}>Choose a conversation</span>}
              </div>
            </div>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.20)' }} />
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>Live · {POLL_MS / 1000}s</span>
          </div>

          {/* ── Call buttons ── */}
          {activeChannel?.type === 'direct' && (
            <button
              onClick={startDirectCall}
              disabled={startingCall}
              title="Voice / video call"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid #D1FAE5', background: '#F0FDF4', cursor: startingCall ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', opacity: startingCall ? 0.6 : 1, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!startingCall) { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.borderColor = '#86EFAC'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.borderColor = '#D1FAE5'; }}
            >
              {startingCall ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#86EFAC', borderTopColor: '#059669' }} /> : <IcoPhone />}
            </button>
          )}
          {activeChannel && activeChannel.type !== 'direct' && (
            <button
              onClick={startGroupCall}
              disabled={startingCall}
              title="Start group video call"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid #EDE9FE', background: '#F5F3FF', cursor: startingCall ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', opacity: startingCall ? 0.6 : 1, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!startingCall) { e.currentTarget.style.background = '#EDE9FE'; e.currentTarget.style.borderColor = '#DDD6FE'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F5F3FF'; e.currentTarget.style.borderColor = '#EDE9FE'; }}
            >
              {startingCall ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#DDD6FE', borderTopColor: '#7C3AED' }} /> : <IcoVideoCall />}
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setShowReports(true)} title="Message reports"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid #FDE68A', background: '#FFFBEB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', position: 'relative' }}>
              <IcoFlag size={15} />
            </button>
          )}
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
                    onReport={!msg._opt && !isSelf ? (id) => setReportingMsgId(id) : undefined}
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

  // Active call takes over full screen
  if (activeCall) {
    const isCaller = activeCall.caller_id === user?.id;
    const title = activeCall.team_id
      ? (activeChannel?.name ?? 'Group Call')
      : isCaller
        ? (activeChannel?.other_user ? `${activeChannel.other_user.first_name} ${activeChannel.other_user.last_name}` : 'Call')
        : (activeCall.users ? `${activeCall.users.first_name} ${activeCall.users.last_name}` : 'Call');
    return <CallRoom roomUrl={activeCall.daily_room_url} sessionId={activeCall.id} title={title} onLeave={() => setActiveCall(null)} />;
  }

  return (
    <>
    <IncomingCallModal onActivate={s => setActiveCall(s)} />
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
          messages={messages}
          onChannelUpdate={updates => {
            setChannels(prev => prev.map(c => c.id === activeChannel.id ? { ...c, ...updates } : c));
            setActiveChannel(prev => prev ? { ...prev, ...updates } : prev);
          }}
        />
      )}
      {reportingMsgId && (
        <ReportMsgModal
          messageId={reportingMsgId}
          onClose={() => setReportingMsgId(null)}
        />
      )}
      {showReports && isAdmin && (
        <AdminReportsPanel onClose={() => setShowReports(false)} />
      )}
    </div>
    </>
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
    team: '#7C3AED', role_group: '#10B981', custom_group: '#8B5CF6', direct: '#94A3B8',
  };

  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 14px', background: isActive ? '#F5F3FF' : 'none', border: 'none', borderLeft: `3px solid ${isActive ? '#6366F1' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {ch.type === 'direct' && ch.other_user?.avatar_url ? (
          <img src={ch.other_user.avatar_url} alt={displayName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${isActive ? av.ring : '#E2E8F0'}` }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: av.bg, border: `2px solid ${av.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: av.text }}>
            {av.label}
          </div>
        )}
        {/* Presence dot for DMs; channel-type dot for groups */}
        {ch.type === 'direct' ? (
          <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: isOnline(ch.other_user?.last_seen_at) ? '#10B981' : '#CBD5E1', border: '2px solid white' }} />
        ) : (
          <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: TYPE_DOT[ch.type] || '#94A3B8', border: '2px solid white' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontWeight: isActive ? 700 : 600, fontSize: '0.85rem', color: isActive ? '#4338CA' : '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{displayName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {ch.is_muted && <span style={{ color: '#94A3B8' }} title="Muted"><IcoBellOff size={11} /></span>}
            {time && <span style={{ fontSize: '0.62rem', color: isActive ? '#6366F1' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>{time}</span>}
          </div>
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

// ─── Report Message Modal ────────────────────────────────────────────
function ReportMsgModal({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const REASONS = ['Harassment', 'Inappropriate content', 'Spam', 'Other'];
  const [reason,     setReason]     = useState(REASONS[0]);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await chatApi.reportMessage(messageId, reason, notes || undefined);
      setDone(true);
      setTimeout(onClose, 1800);
    } catch { setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', animation: 'fadeIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Report Message</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>This will be sent to your academy admin for review</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><IcoX size={13} /></button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#15803D', fontWeight: 700, fontSize: '0.9rem' }}>✓ Report submitted</div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reason</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {REASONS.map(r => (
                    <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${reason === r ? '#6366F1' : '#E2E8F0'}`, background: reason === r ? '#F5F3FF' : '#F8FAFC', transition: 'all 0.1s' }}>
                      <input type="radio" value={r} checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: '#6366F1' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: reason === r ? 600 : 400, color: reason === r ? '#4338CA' : '#1E293B' }}>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Additional notes (optional)</div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Any additional context…"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366F1'}
                  onBlur={e  => e.currentTarget.style.borderColor = '#E2E8F0'}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#EF4444', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Reports Panel ─────────────────────────────────────────────
function AdminReportsPanel({ onClose }: { onClose: () => void }) {
  const [reports,     setReports]     = useState<ReportedMessage[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    chatApi.getReports()
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  async function handleReview(reportId: string, status: 'reviewed' | 'dismissed') {
    setReviewingId(reportId);
    try {
      await chatApi.reviewReport(reportId, status);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    } catch { /* ignore */ }
    finally { setReviewingId(null); }
  }

  const STATUS_BG: Record<string, string> = { pending: '#FFFBEB', reviewed: '#F0FDF4', dismissed: '#F8FAFC' };
  const STATUS_FG: Record<string, string> = { pending: '#D97706', reviewed: '#15803D', dismissed: '#64748B' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 420, height: '100vh', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(15,23,42,0.15)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><IcoChevronLeft /></button>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', flex: 1 }}>Message Reports</div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: 99 }}>
            {reports.filter(r => r.status === 'pending').length} pending
          </span>
        </div>
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 10 }} />)
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: '0.85rem' }}>No reports yet</div>
          ) : reports.map(r => {
            const msg      = r.messages;
            const reporter = r.reporter;
            const sender   = msg?.users;
            return (
              <div key={r.id} style={{ border: '1px solid #F1F5F9', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: 99 }}>{r.reason}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: STATUS_FG[r.status] ?? '#64748B', background: STATUS_BG[r.status] ?? '#F8FAFC', padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>{r.status}</span>
                  </div>
                  {msg && (
                    <div style={{ padding: '8px 10px', background: 'white', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#1E293B', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginBottom: 3, fontWeight: 600 }}>
                        {sender ? `${sender.first_name} ${sender.last_name} · ${sender.role}` : 'Unknown'}
                      </div>
                      {msg.message_text ?? <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>📎 Attachment</span>}
                    </div>
                  )}
                  {r.notes && <div style={{ fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', marginBottom: 4 }}>Notes: {r.notes}</div>}
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                    Reported by {reporter ? `${reporter.first_name} ${reporter.last_name}` : 'Unknown'} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', borderTop: '1px solid #F1F5F9' }}>
                    <button onClick={() => handleReview(r.id, 'reviewed')} disabled={reviewingId === r.id}
                      style={{ flex: 1, padding: '9px', background: 'none', border: 'none', borderRight: '1px solid #F1F5F9', color: '#15803D', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {reviewingId === r.id ? '…' : '✓ Reviewed'}
                    </button>
                    <button onClick={() => handleReview(r.id, 'dismissed')} disabled={reviewingId === r.id}
                      style={{ flex: 1, padding: '9px', background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
