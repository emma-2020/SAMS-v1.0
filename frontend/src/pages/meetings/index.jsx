import { useState, useEffect, useCallback, useRef } from 'react';
import { meetingsApi } from '../../services/meetings.api';
import useAuthStore    from '../../store/authStore';
import CallRoom        from '../../components/calls/CallRoom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtCountdown(iso) {
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'Now';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `In ${d}d ${h % 24}h`;
  if (h > 0)  return `In ${h}h ${m % 60}m`;
  return `In ${m}m`;
}

function isJoinable(scheduledAt, durationMinutes) {
  const now   = Date.now();
  const start = new Date(scheduledAt).getTime();
  const end   = start + durationMinutes * 60000;
  return now >= start - 5 * 60000 && now <= end;
}

const ROLE_COLOR = {
  Admin:  '#7C3AED', Coach:  '#2563EB',
  Player: '#059669', Parent: '#D97706',
};

function Avatar({ name, role, size = 32 }) {
  const color = ROLE_COLOR[role] || '#6366F1';
  const inits = name.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}15`, border: `1.5px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.35), fontWeight: 800, color,
    }}>
      {inits}
    </div>
  );
}

// ─── Copy link button (copies to clipboard, no external navigation) ──────────

function CopyLinkBtn({ url }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }
  return (
    <button
      onClick={handleCopy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: copied ? '#059669' : '#94A3B8', transition: 'color 0.2s' }}
    >
      {copied
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

// ─── Meeting card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onJoin, onCancel, isAdmin }) {
  const [hover, setHover] = useState(false);
  const joinable  = isJoinable(meeting.scheduled_at, meeting.duration_minutes);
  const attendees = meeting.meeting_attendees || [];
  const organizer = meeting.users
    ? `${meeting.users.first_name} ${meeting.users.last_name}`
    : 'Unknown';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#FDFDFF' : '#FFFFFF',
        border: `1.5px solid ${hover ? '#C7D2FE' : '#F1F5F9'}`,
        borderRadius: 18,
        padding: '22px 24px',
        boxShadow: hover
          ? '0 8px 32px rgba(99,102,241,0.12), 0 2px 8px rgba(15,23,42,0.06)'
          : '0 2px 8px rgba(15,23,42,0.05)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {meeting.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Organised by <strong style={{ color: '#64748B' }}>{organizer}</strong>
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          padding: '4px 12px', borderRadius: 99, flexShrink: 0,
          background: joinable ? '#D1FAE5' : '#EEF2FF',
          border: `1px solid ${joinable ? '#6EE7B7' : '#C7D2FE'}`,
        }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: joinable ? '#059669' : '#6366F1' }}>
            {joinable ? '🟢 Live' : fmtCountdown(meeting.scheduled_at)}
          </span>
        </div>
      </div>

      {/* Date / time / duration row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { icon: '📅', label: fmtDate(meeting.scheduled_at) },
          { icon: '🕐', label: `${fmtTime(meeting.scheduled_at)} · ${meeting.duration_minutes} min` },
          { icon: '👥', label: `${attendees.length} attendee${attendees.length !== 1 ? 's' : ''}` },
        ].map(({ icon, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B' }}>
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Agenda */}
      {meeting.agenda && (
        <div style={{
          background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
          padding: '10px 14px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.65,
        }}>
          {meeting.agenda}
        </div>
      )}

      {/* Attendee avatars */}
      {attendees.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {attendees.slice(0, 5).map((a, i) => {
              const name = a.users ? `${a.users.first_name} ${a.users.last_name}` : '?';
              return (
                <div key={a.user_id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}>
                  <Avatar name={name} role={a.users?.role} size={28} />
                </div>
              );
            })}
          </div>
          {attendees.length > 5 && (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>+{attendees.length - 5} more</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #F1F5F9' }}>
        <CopyLinkBtn url={meeting.daily_room_url} />

        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button
              onClick={() => onCancel(meeting.id)}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'none', border: '1px solid #FECACA', color: '#EF4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFF1F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onJoin(meeting)}
            disabled={!joinable}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none',
              background: joinable
                ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                : '#F1F5F9',
              color: joinable ? '#fff' : '#94A3B8',
              fontSize: '0.82rem', fontWeight: 700, cursor: joinable ? 'pointer' : 'not-allowed',
              boxShadow: joinable ? '0 4px 12px rgba(99,102,241,0.32)' : 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (joinable) e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.45)'; }}
            onMouseLeave={e => { if (joinable) e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.32)'; }}
          >
            {joinable ? '▶ Join Now' : 'Not started'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule modal ───────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onCreated }) {
  const [members, setMembers]     = useState([]);
  const [form,    setForm]        = useState({
    title: '', agenda: '', date: '', time: '', durationMinutes: 60, attendeeIds: [],
  });
  const [saving,  setSaving]      = useState(false);
  const [error,   setError]       = useState('');
  const [search,  setSearch]      = useState('');

  useEffect(() => {
    meetingsApi.members().then(setMembers).catch(() => {});
  }, []);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(q);
  });

  function toggleAttendee(id) {
    setForm(f => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id)
        ? f.attendeeIds.filter(x => x !== id)
        : [...f.attendeeIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.date || !form.time) return setError('Date and time are required');
    if (!form.attendeeIds.length) return setError('Select at least one attendee');
    setSaving(true); setError('');
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
      const meeting = await meetingsApi.create({
        title:           form.title,
        agenda:          form.agenda,
        scheduledAt,
        durationMinutes: form.durationMinutes,
        attendeeIds:     form.attendeeIds,
      });
      onCreated(meeting);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to schedule meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        width: 580, maxHeight: '90vh',
        background: '#FFFFFF', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(15,23,42,0.22)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', letterSpacing: '-0.02em' }}>Schedule Meeting</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>Invitations will be emailed to all attendees with a calendar file</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', fontSize: '1rem' }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Meeting Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Weekly Team Sync"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.9rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s' }}
              onFocus={e => { e.target.style.borderColor = '#6366F1'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          {/* Agenda */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Agenda <span style={{ color: '#94A3B8', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              value={form.agenda}
              onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
              placeholder="What will be discussed in this meeting?"
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.87rem', color: '#0F172A', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s' }}
              onFocus={e => { e.target.style.borderColor = '#6366F1'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          {/* Date / Time / Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Date *', type: 'date', field: 'date' },
              { label: 'Time *', type: 'time', field: 'time' },
            ].map(({ label, type, field }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.87rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => { e.target.style.borderColor = '#6366F1'; }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Duration</label>
              <select
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.87rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              >
                {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>

          {/* Attendees */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Attendees * <span style={{ color: '#6366F1', fontWeight: 400, textTransform: 'none' }}>({form.attendeeIds.length} selected)</span>
            </label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              style={{ width: '100%', padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: 8, transition: 'border-color 0.15s' }}
              onFocus={e => { e.target.style.borderColor = '#6366F1'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#FAFAFA' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>No members found</div>
              )}
              {filtered.map(m => {
                const selected = form.attendeeIds.includes(m.id);
                const color    = ROLE_COLOR[m.role] || '#6366F1';
                const name     = `${m.first_name} ${m.last_name}`;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAttendee(m.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', background: selected ? '#EEF2FF' : 'transparent',
                      border: 'none', borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={name} role={m.role} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: selected ? '#4338CA' : '#1E293B' }}>{name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{m.role} · {m.email}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: selected ? '#6366F1' : 'transparent',
                      border: `2px solid ${selected ? '#6366F1' : '#CBD5E1'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, fontSize: '0.82rem', color: '#EF4444' }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, background: 'none', border: '1.5px solid #E2E8F0', color: '#64748B', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.32)',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving && <span className="spinner" style={{ width: 14, height: 14 }} />}
            {saving ? 'Scheduling…' : 'Schedule & Send Invites'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main MeetingsPage ────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const user = useAuthStore(s => s.user);
  const [meetings,      setMeetings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeCall,    setActiveCall]    = useState(null);
  const [error,         setError]         = useState('');

  const canSchedule = user?.role === 'Admin' || user?.role === 'Coach';

  const load = useCallback(async () => {
    try {
      const data = await meetingsApi.list();
      setMeetings(data || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id) {
    if (!window.confirm('Cancel this meeting? All attendees will lose access to the room.')) return;
    try {
      await meetingsApi.cancel(id);
      setMeetings(m => m.filter(x => x.id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to cancel meeting');
    }
  }

  function handleJoin(meeting) {
    setActiveCall({ roomUrl: meeting.daily_room_url, sessionId: null, title: meeting.title });
  }

  if (activeCall) {
    return (
      <CallRoom
        roomUrl={activeCall.roomUrl}
        sessionId={activeCall.sessionId}
        title={activeCall.title}
        onLeave={() => setActiveCall(null)}
      />
    );
  }

  const upcoming = meetings.filter(m => new Date(m.scheduled_at) >= Date.now() - m.duration_minutes * 60000);
  const past     = meetings.filter(m => new Date(m.scheduled_at) <  Date.now() - m.duration_minutes * 60000);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1730 0%, #172649 60%, #1E1B4B 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        boxShadow: '0 8px 32px rgba(11,23,48,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative gradient orb */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.45)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Meetings
            </h1>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>

        {canSchedule && (
          <button
            onClick={() => setShowScheduler(true)}
            style={{
              padding: '11px 22px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 22px rgba(99,102,241,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.45)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Schedule Meeting
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
          ))}
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1.5px solid #F1F5F9', borderRadius: 20, padding: '64px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#EEF2FF', border: '2px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', marginBottom: 8 }}>No meetings yet</div>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', maxWidth: 360, margin: '0 auto 20px' }}>
            {canSchedule
              ? 'Schedule your first meeting and send calendar invitations to attendees.'
              : 'You will see meetings here once an Admin or Coach schedules one for your team.'}
          </p>
          {canSchedule && (
            <button
              onClick={() => setShowScheduler(true)}
              style={{ padding: '11px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.32)' }}
            >
              Schedule your first meeting
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 14 }}>
                Upcoming ({upcoming.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {upcoming.map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onJoin={handleJoin}
                    onCancel={handleCancel}
                    isAdmin={user?.role === 'Admin'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 14 }}>
                Past ({past.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: 0.6 }}>
                {past.map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onJoin={handleJoin}
                    onCancel={handleCancel}
                    isAdmin={user?.role === 'Admin'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showScheduler && (
        <ScheduleModal
          onClose={() => setShowScheduler(false)}
          onCreated={(meeting) => {
            setMeetings(prev => [meeting, ...prev]);
            setShowScheduler(false);
          }}
        />
      )}
    </div>
  );
}
