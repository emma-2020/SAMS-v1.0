'use client';

import { useState, useEffect } from 'react';
import { announcementsApi } from '@sams/api';
import type { Announcement } from '@sams/api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const Ico = {
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  X:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Megaphone: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
};

function AnnouncementCard({ ann, onDelete }: { ann: Announcement; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const preview = ann.body.length > 160 && !expanded ? ann.body.slice(0, 160) + '…' : ann.body;

  return (
    <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)', borderLeft: '4px solid #6366F1' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#EEF2FF,#F5F3FF)', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#6366F1' }}>
          <Ico.Megaphone />
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{ann.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: '0.67rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{fmtDate(ann.created_at)}</span>
              <button onClick={onDelete} style={{ padding: '6px', borderRadius: 8, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Ico.Trash /></button>
            </div>
          </div>
          {ann.author && (
            <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600, marginTop: 4 }}>
              {ann.author.first_name} {ann.author.last_name}
            </div>
          )}
          <p style={{ margin: '10px 0 0', fontSize: '0.875rem', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{preview}</p>
          {ann.body.length > 160 && (
            <button onClick={() => setExpanded(v => !v)} style={{ marginTop: 6, border: 'none', background: 'none', color: '#6366F1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ComposeModal({ onSend, onClose }: { onSend: () => void; onClose: () => void }) {
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSend() {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!body.trim())  { setError('Message body is required.'); return; }
    setSending(true); setError('');
    try {
      await announcementsApi.createAnnouncement({ title: title.trim(), body: body.trim() });
      onSend();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send announcement.');
    } finally { setSending(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(15,23,42,0.18)', display: 'flex', flexDirection: 'column', gap: 16 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>New Announcement</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}><Ico.X /></button>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem' }}>{error}</div>}

        <div>
          <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Training cancelled this Saturday"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.9rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
            onFocus={e => e.target.style.borderColor = '#6366F1'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
            placeholder="Write your announcement here. All academy members will see this."
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', color: '#0F172A', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.65, boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#6366F1'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#94A3B8', marginTop: 4 }}>{body.length} chars</div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #A7F3D0', fontSize: '0.78rem', color: '#059669', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>📢</span> This announcement will be visible to all players, coaches, and parents in your academy.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid #E2E8F0', borderRadius: 11, background: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSend} disabled={sending}
            style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 11, background: sending ? '#94A3B8' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: sending ? 'not-allowed' : 'pointer' }}>
            {sending ? 'Sending…' : 'Send Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showCompose,   setShowCompose]   = useState(false);

  async function load() {
    setLoading(true);
    try { setAnnouncements(await announcementsApi.getAnnouncements()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement? Members will no longer see it.')) return;
    try { await announcementsApi.deleteAnnouncement(id); load(); } catch { /* silent */ }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>Announcements</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>Broadcast updates to everyone in your academy</p>
        </div>
        <button onClick={() => setShowCompose(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0 }}>
          <Ico.Plus /> New Announcement
        </button>
      </div>

      {/* Count chip */}
      {!loading && announcements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '4px 12px', borderRadius: 99, border: '1.5px solid #DDD6FE' }}>
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
        </div>
      ) : !announcements.length ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: '#F8FAFC', borderRadius: 20, border: '1.5px dashed #CBD5E1' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12, color: '#CBD5E1' }}>📢</div>
          <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6 }}>No announcements yet</div>
          <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: 20 }}>Keep your academy informed — create your first announcement.</div>
          <button onClick={() => setShowCompose(true)}
            style={{ padding: '10px 22px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
            Create Announcement
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {announcements.map(ann => (
            <AnnouncementCard key={ann.id} ann={ann} onDelete={() => handleDelete(ann.id)} />
          ))}
        </div>
      )}

      {showCompose && (
        <ComposeModal
          onSend={() => { setShowCompose(false); load(); }}
          onClose={() => setShowCompose(false)} />
      )}
    </div>
  );
}
