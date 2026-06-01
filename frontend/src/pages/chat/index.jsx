// src/pages/chat/index.jsx
import {
  useState, useEffect, useRef, useCallback, useReducer,
} from 'react';
import { useApi, useSubmit } from '../../hooks/useApi';
import { scheduleApi }       from '../../services/schedule.api';
import { chatApi }           from '../../services/chat.api';
import useAuthStore          from '../../store/authStore';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;   // poll every 5 seconds
const PAGE_SIZE        = 50;     // messages per page fetch
const MAX_CHARS        = 2000;

const ROLE_STYLE = {
  Admin:  { color: '#C084FC', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.25)' },
  Coach:  { color: '#93C5FD', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  Player: { color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  Parent: { color: '#FDB974', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 5)   return 'just now';
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initials(msg) {
  const fn = msg.users?.first_name ?? '';
  const ln = msg.users?.last_name  ?? '';
  return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase();
}

function senderName(msg) {
  if (!msg.users) return 'Unknown';
  return `${msg.users.first_name} ${msg.users.last_name}`;
}

// ─────────────────────────────────────────────────────────────────
// MESSAGES REDUCER
// Handles merging, deduplication, and optimistic inserts cleanly
// ─────────────────────────────────────────────────────────────────

function messagesReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL': {
      return action.messages;
    }
    case 'MERGE_POLL': {
      // Add only genuinely new messages (by id), preserving order
      const existingIds = new Set(state.map((m) => m.id));
      const newMsgs = action.messages.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return state;
      return [...state, ...newMsgs];
    }
    case 'OPTIMISTIC_ADD': {
      return [...state, action.message];
    }
    case 'CONFIRM_OPTIMISTIC': {
      // Replace the temp optimistic message with the real server response
      return state.map((m) =>
        m.id === action.tempId ? action.confirmed : m
      );
    }
    case 'REJECT_OPTIMISTIC': {
      return state.filter((m) => m.id !== action.tempId);
    }
    case 'PREPEND_OLDER': {
      const existingIds = new Set(state.map((m) => m.id));
      const older = action.messages.filter((m) => !existingIds.has(m.id));
      return [...older, ...state];
    }
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────
// ROLE PILL
// ─────────────────────────────────────────────────────────────────

function RolePill({ role }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.Player;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 7px', borderRadius: 99,
      fontSize: '0.62rem', fontFamily: 'var(--font-display)',
      fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      flexShrink: 0,
    }}>
      {role}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────

function Avatar({ msg, isSelf }) {
  const role  = msg.users?.role;
  const style = ROLE_STYLE[role] ?? ROLE_STYLE.Player;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: style.bg, border: `1.5px solid ${style.border}`,
      fontFamily: 'var(--font-display)', fontSize: '0.7rem',
      fontWeight: 700, color: style.color,
      opacity: msg._optimistic ? 0.7 : 1,
    }}>
      {initials(msg)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────

function MessageBubble({ msg, isSelf, showHeader }) {
  const [ts, setTs] = useState(() => relativeTime(msg.created_at));

  // Keep timestamp live
  useEffect(() => {
    const t = setInterval(() => setTs(relativeTime(msg.created_at)), 30_000);
    return () => clearInterval(t);
  }, [msg.created_at]);

  const role = msg.users?.role;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isSelf ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      opacity: msg._optimistic ? 0.75 : 1,
      transition: 'opacity 0.2s ease',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Avatar — only on first in a group */}
      {showHeader ? (
        <Avatar msg={msg} isSelf={isSelf} />
      ) : (
        <div style={{ width: 32, flexShrink: 0 }} />
      )}

      <div style={{
        maxWidth: '68%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        alignItems: isSelf ? 'flex-end' : 'flex-start',
      }}>
        {/* Sender header */}
        {showHeader && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexDirection: isSelf ? 'row-reverse' : 'row',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.8rem', color: 'var(--text-primary)',
              letterSpacing: '0.01em',
            }}>
              {isSelf ? 'You' : senderName(msg)}
            </span>
            <RolePill role={role} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: 'var(--text-muted)',
            }}>
              {ts}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '9px 14px',
          borderRadius: isSelf
            ? '16px 4px 16px 16px'
            : '4px 16px 16px 16px',
          background: isSelf
            ? 'var(--accent)'
            : 'var(--bg-elevated)',
          border: isSelf
            ? '1px solid var(--accent-dim)'
            : '1px solid var(--border-default)',
          color: isSelf ? 'var(--text-inverted)' : 'var(--text-primary)',
          fontSize: '0.875rem',
          lineHeight: 1.55,
          wordBreak: 'break-word',
          boxShadow: isSelf
            ? '0 2px 8px rgba(245,158,11,0.2)'
            : 'var(--shadow-sm)',
        }}>
          {msg.message_text}
        </div>

        {/* Inline timestamp for non-header messages */}
        {!showHeader && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: 'var(--text-muted)', paddingLeft: isSelf ? 0 : 4,
          }}>
            {ts}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DATE SEPARATOR
// ─────────────────────────────────────────────────────────────────

function DateSeparator({ date }) {
  const label = (() => {
    const d    = new Date(date);
    const now  = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      margin: '8px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.7rem',
        fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-muted)', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE LIST
// ─────────────────────────────────────────────────────────────────

function MessageList({ messages, currentUserId, onLoadMore, hasMore, loadingMore }) {
  const listRef     = useRef(null);
  const bottomRef   = useRef(null);
  const prevCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive at the end
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const lastNew   = messages[messages.length - 1];
      const isFromSelf = lastNew?.sender_id === currentUserId;
      const isRecent   = Date.now() - new Date(lastNew?.created_at ?? 0) < 10_000;

      // Scroll if message is from self OR we're already near the bottom
      if (isFromSelf || isAtBottom(listRef.current)) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length, currentUserId]);

  // Group messages by sender + date
  const groups = groupMessages(messages);

  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        scrollBehavior: 'smooth',
      }}
    >
      {/* Load more trigger */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{
              background: 'none', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', padding: '6px 16px',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '0.78rem', fontFamily: 'var(--font-display)',
              fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {loadingMore ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : '↑ Load earlier messages'}
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10, opacity: 0.5,
        }}>
          <div style={{ fontSize: '2rem' }}>💬</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            color: 'var(--text-muted)', fontSize: '0.9rem',
          }}>
            No messages yet — say hello!
          </div>
        </div>
      )}

      {/* Rendered message groups */}
      {groups.map(({ dateSep, items }) => (
        <div key={dateSep}>
          <DateSeparator date={dateSep} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map(({ msg, isSelf, showHeader }) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isSelf={isSelf}
                showHeader={showHeader}
              />
            ))}
          </div>
        </div>
      ))}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE INPUT BAR
// ─────────────────────────────────────────────────────────────────

function MessageInputBar({ onSend, disabled }) {
  const [text, setText]       = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef           = useRef(null);
  const remaining             = MAX_CHARS - text.length;
  const canSend               = text.trim().length > 0 && !disabled && remaining >= 0;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    textareaRef.current?.focus();
  }, [canSend, onSend, text]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Input row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        padding: '8px 12px',
        background: 'var(--bg-overlay)',
        borderRadius: 'var(--radius-lg)',
        border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border-default)'}`,
        boxShadow: focused ? '0 0 0 3px var(--accent-subtle)' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Message your team... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
            fontSize: '0.9rem', lineHeight: 1.5, resize: 'none',
            placeholder: 'var(--text-muted)', minHeight: 22, maxHeight: 120,
            paddingTop: 3,
          }}
        />

        {/* Character count — only when near limit */}
        {text.length > MAX_CHARS * 0.8 && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
            color: remaining < 50 ? 'var(--danger)' : 'var(--text-muted)',
            flexShrink: 0, alignSelf: 'flex-end', paddingBottom: 2,
          }}>
            {remaining}
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: canSend ? 'var(--accent)' : 'var(--bg-elevated)',
            border: `1px solid ${canSend ? 'var(--accent)' : 'var(--border-default)'}`,
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
            transform: canSend ? 'scale(1)' : 'scale(0.92)',
            boxShadow: canSend ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={canSend ? '#070B11' : 'var(--text-muted)'}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: 4,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: 'var(--text-muted)',
        }}>
          Enter ↵ to send · Shift+Enter for new line
        </span>
        {disabled && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            color: 'var(--warning)',
          }}>
            Sending…
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHANNEL HEADER
// ─────────────────────────────────────────────────────────────────

function ChannelHeader({ teamName, memberCount, polling, lastUpdated }) {
  const [dotColor, setDotColor] = useState('var(--success)');

  // Flash the dot green on each successful poll
  useEffect(() => {
    if (polling) {
      setDotColor('var(--accent)');
      const t = setTimeout(() => setDotColor('var(--success)'), 600);
      return () => clearTimeout(t);
    }
  }, [lastUpdated, polling]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Channel icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}>
          💬
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}>
            {teamName ?? 'Team Channel'}
          </div>
          {memberCount != null && (
            <div style={{
              fontSize: '0.72rem', color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {memberCount} members
            </div>
          )}
        </div>
      </div>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor,
          transition: 'background 0.3s ease',
          boxShadow: `0 0 6px ${dotColor}`,
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          color: 'var(--text-muted)', userSelect: 'none',
        }}>
          Live · {POLL_INTERVAL_MS / 1000}s sync
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TEAM SELECTOR (when user is in multiple teams)
// ─────────────────────────────────────────────────────────────────

function TeamSelector({ teams, activeId, onSelect }) {
  if (!teams || teams.length <= 1) return null;
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '10px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      overflowX: 'auto', background: 'var(--bg-elevated)',
      flexShrink: 0,
    }}>
      {teams.map((t) => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: '4px 14px', borderRadius: 'var(--radius-md)',
          border: `1px solid ${activeId === t.id ? 'var(--accent)' : 'var(--border-default)'}`,
          background: activeId === t.id ? 'var(--accent-subtle)' : 'transparent',
          color: activeId === t.id ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display)', fontSize: '0.8rem',
          fontWeight: 600, letterSpacing: '0.04em',
          transition: 'all 0.15s ease',
        }}>
          {t.name}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN CHAT PAGE
// ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const user         = useAuthStore((s) => s.user);
  const [messages,   dispatch]       = useReducer(messagesReducer, []);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [activeTeamName, setActiveTeamName] = useState('');
  const [teams, setTeams]            = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]        = useState(false);
  const [sendError, setSendError]    = useState('');
  const [sending, setSending]        = useState(false);
  const [lastPollTs, setLastPollTs]  = useState(null);
  const [initError, setInitError]    = useState('');
  const pollingRef  = useRef(null);
  const latestIdRef = useRef(null);   // tracks newest message id seen

  // ── Step 1: Load teams the user belongs to ─────────────────────

  useEffect(() => {
    async function loadTeams() {
      setLoadingInit(true);
      try {
        // Use schedule events to derive teams visible to this user
        const events = await scheduleApi.getEvents({
          start: new Date(Date.now() - 30 * 86400000).toISOString(),
        });
        const seen = new Map();
        (events ?? []).forEach((ev) => {
          if (ev.teams && !seen.has(ev.team_id)) {
            seen.set(ev.team_id, ev.teams);
          }
        });
        const teamList = [...seen.entries()].map(([id, t]) => ({
          id,
          name: t.name,
        }));
        setTeams(teamList);
        if (teamList.length > 0) {
          setActiveTeamId(teamList[0].id);
          setActiveTeamName(teamList[0].name);
        }
      } catch (err) {
        setInitError(err.message || 'Could not load team channels.');
      } finally {
        setLoadingInit(false);
      }
    }
    loadTeams();
  }, []);

  // ── Step 2: Fetch initial messages when team changes ───────────

  useEffect(() => {
    if (!activeTeamId) return;
    setLoadingInit(true);
    setSendError('');

    chatApi.getMessages({ teamId: activeTeamId, limit: PAGE_SIZE })
      .then((result) => {
        dispatch({ type: 'SET_INITIAL', messages: result.messages ?? [] });
        setHasMore(result.page?.has_more ?? false);

        const msgs = result.messages ?? [];
        latestIdRef.current = msgs[msgs.length - 1]?.id ?? null;
      })
      .catch((err) => setInitError(err.message))
      .finally(() => setLoadingInit(false));

    return () => {
      dispatch({ type: 'SET_INITIAL', messages: [] });
    };
  }, [activeTeamId]);

  // ── Step 3: Polling loop ───────────────────────────────────────
  // Polls every POLL_INTERVAL_MS for new messages since the latest
  // known message ID. Only new messages are merged, preventing
  // full list re-renders.

  useEffect(() => {
    if (!activeTeamId || loadingInit) return;

    pollingRef.current = setInterval(async () => {
      try {
        const result = await chatApi.getMessages({
          teamId: activeTeamId,
          limit:  50,
        });
        const incoming = result.messages ?? [];

        // Filter to only messages newer than our latest known
        if (latestIdRef.current) {
          const knownIdx = incoming.findIndex((m) => m.id === latestIdRef.current);
          const newer    = knownIdx >= 0 ? incoming.slice(knownIdx + 1) : [];
          if (newer.length > 0) {
            dispatch({ type: 'MERGE_POLL', messages: newer });
            latestIdRef.current = newer[newer.length - 1].id;
          }
        } else {
          dispatch({ type: 'MERGE_POLL', messages: incoming });
          if (incoming.length > 0) {
            latestIdRef.current = incoming[incoming.length - 1].id;
          }
        }

        setLastPollTs(Date.now());
      } catch {
        // Silent — don't interrupt the UX on a poll failure
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollingRef.current);
  }, [activeTeamId, loadingInit]);

  // ── Load older messages ────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!activeTeamId || loadingMore || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    setLoadingMore(true);
    try {
      const result = await chatApi.getMessages({
        teamId: activeTeamId,
        limit:  PAGE_SIZE,
        before: oldestId,
      });
      dispatch({ type: 'PREPEND_OLDER', messages: result.messages ?? [] });
      setHasMore(result.page?.has_more ?? false);
    } catch (err) {
      console.warn('Load more failed:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [activeTeamId, loadingMore, messages]);

  // ── Send message ───────────────────────────────────────────────

  const handleSend = useCallback(async (text) => {
    if (!activeTeamId || !text) return;
    setSendError('');
    setSending(true);

    // Create an optimistic message immediately
    const tempId  = `opt-${Date.now()}`;
    const optMsg  = {
      id:           tempId,
      team_id:      activeTeamId,
      sender_id:    user.id,
      message_text: text,
      created_at:   new Date().toISOString(),
      _optimistic:  true,
      users: {
        id:         user.id,
        first_name: user.first_name,
        last_name:  user.last_name,
        role:       user.role,
      },
    };
    dispatch({ type: 'OPTIMISTIC_ADD', message: optMsg });

    try {
      const confirmed = await chatApi.sendMessage({
        teamId:      activeTeamId,
        messageText: text,
      });
      dispatch({ type: 'CONFIRM_OPTIMISTIC', tempId, confirmed });
      latestIdRef.current = confirmed.id;
    } catch (err) {
      dispatch({ type: 'REJECT_OPTIMISTIC', tempId });
      setSendError(err.message || 'Message failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  }, [activeTeamId, user]);

  // ── Team switch ────────────────────────────────────────────────

  const handleTeamSwitch = (id) => {
    clearInterval(pollingRef.current);
    const t = teams.find((t) => t.id === id);
    setActiveTeamId(id);
    setActiveTeamName(t?.name ?? '');
    latestIdRef.current = null;
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 80px)',  // fill viewport minus topbar/padding
      background: 'var(--bg-base)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>

      {/* Channel header */}
      <ChannelHeader
        teamName={activeTeamName}
        polling={!!pollingRef.current}
        lastUpdated={lastPollTs}
      />

      {/* Team tabs */}
      <TeamSelector teams={teams} activeId={activeTeamId} onSelect={handleTeamSwitch} />

      {/* Init error */}
      {initError && (
        <div className="alert alert-error" style={{ margin: 16, flexShrink: 0 }}>
          {initError}
        </div>
      )}

      {/* Message list */}
      {loadingInit ? (
        <MessageListSkeleton />
      ) : !activeTeamId && teams.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: '2.5rem' }}>🏟️</div>
          <div style={{
            fontFamily: 'var(--font-display)', color: 'var(--text-muted)',
            fontSize: '0.95rem', fontWeight: 600,
          }}>
            You are not part of any team channel yet.
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Contact your coach or admin to be added to a team.
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={user?.id}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
        />
      )}

      {/* Send error */}
      {sendError && (
        <div className="alert alert-error" style={{
          margin: '0 16px 8px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.85rem' }}>{sendError}</span>
          <button
            onClick={() => setSendError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'inherit', padding: '0 4px', marginLeft: 'auto' }}>
            ✕
          </button>
        </div>
      )}

      {/* Input bar */}
      {activeTeamId && (
        <MessageInputBar onSend={handleSend} disabled={sending} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────

function MessageListSkeleton() {
  const items = [
    { self: false, lines: 1, width: '55%' },
    { self: false, lines: 2, width: '70%' },
    { self: true,  lines: 1, width: '40%' },
    { self: false, lines: 1, width: '60%' },
    { self: true,  lines: 2, width: '50%' },
    { self: false, lines: 1, width: '45%' },
  ];
  return (
    <div style={{ flex: 1, padding: '16px 20px', display: 'flex',
      flexDirection: 'column', gap: 12, overflowY: 'hidden' }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          flexDirection: item.self ? 'row-reverse' : 'row',
          animationDelay: `${i * 80}ms`,
        }}
          className="animate-fade-in">
          <div className="skeleton" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          }} />
          <div style={{ maxWidth: item.width, display: 'flex',
            flexDirection: 'column', gap: 6 }}>
            {i % 3 === 0 && (
              <div className="skeleton" style={{ width: '60%', height: 10, borderRadius: 3 }} />
            )}
            {Array.from({ length: item.lines }).map((_, l) => (
              <div key={l} className="skeleton" style={{
                height: 38 + l * 8,
                borderRadius: item.self
                  ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// UTILITY: group messages by date + consecutive sender
// ─────────────────────────────────────────────────────────────────

function groupMessages(messages) {
  if (!messages.length) return [];

  const byDate = [];
  let currentDate = null;

  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      byDate.push({ dateSep: msg.created_at, items: [] });
      currentDate = msgDate;
    }
    byDate[byDate.length - 1].items.push(msg);
  }

  // Tag each message: isSelf, showHeader (new sender or >5 min gap)
  for (const group of byDate) {
    group.items = group.items.map((msg, i, arr) => {
      const prev = arr[i - 1];
      const gap  = prev
        ? (new Date(msg.created_at) - new Date(prev.created_at)) / 60000
        : Infinity;
      const newSender  = !prev || prev.sender_id !== msg.sender_id;
      const longGap    = gap > 5;

      return {
        msg,
        isSelf:     msg.sender_id === useAuthStore.getState().user?.id,
        showHeader: newSender || longGap,
      };
    });
  }

  return byDate;
}

function isAtBottom(el) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}
