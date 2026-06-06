'use client';

import { useEffect, useState, useRef } from 'react';
import { chatApi, teamsApi } from '@sams/api';
import type { Team, ChatMessage } from '@sams/api';
import { useAuthStore } from '@sams/store';

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    teamsApi.getTeams().then((t) => { setTeams(t); if (t[0]) setActiveTeam(t[0].id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeTeam) return;
    chatApi.getMessages(activeTeam).then(setMessages).catch(() => {});
    const id = setInterval(() => chatApi.getMessages(activeTeam).then(setMessages).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [activeTeam]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTeam || !body.trim()) return;
    setSending(true);
    const optimistic: ChatMessage = { id: Date.now().toString(), team_id: activeTeam, sender_id: user?.id ?? '', body: body.trim(), created_at: new Date().toISOString() };
    setMessages((p) => [...p, optimistic]);
    setBody('');
    try { await chatApi.sendMessage(activeTeam, optimistic.body); } catch (_) {}
    setSending(false);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 0 }}>

      {/* Team sidebar */}
      <div style={{ width: 220, background: 'var(--bg-surface)', borderRadius: '16px 0 0 16px', border: '1px solid var(--border-subtle)', borderRight: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>Channels</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {teams.map((t) => (
            <button key={t.id} onClick={() => setActiveTeam(t.id)}
              style={{ width: '100%', padding: '11px 16px', background: activeTeam === t.id ? '#6366F110' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderLeft: activeTeam === t.id ? '3px solid #6366F1' : '3px solid transparent' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: activeTeam === t.id ? 700 : 500, color: activeTeam === t.id ? '#6366F1' : 'var(--text-secondary)' }}># {t.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0 16px 16px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ maxWidth: '72%', padding: '10px 14px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isMe ? '#6366F1' : 'var(--bg-elevated)', color: isMe ? '#fff' : 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {msg.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={activeTeam ? 'Type a message…' : 'Select a channel first'}
            disabled={!activeTeam}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }} />
          <button type="submit" disabled={sending || !body.trim()}
            style={{ padding: '10px 20px', borderRadius: 12, background: '#6366F1', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: (!body.trim() || sending) ? 0.5 : 1 }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
