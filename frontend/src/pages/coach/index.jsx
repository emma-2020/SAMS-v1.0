// src/pages/coach/index.jsx
import { useState, useCallback } from 'react';
import { useApi, useSubmit }     from '../../hooks/useApi';
import { scheduleApi }           from '../../services/schedule.api';
import { attendanceApi }         from '../../services/attendance.api';
import useAuthStore              from '../../store/authStore';
import {
  PageHeader, SectionCard, ErrorBanner, EmptyState,
  SkeletonTable, SkeletonCard, SkeletonLine, StatusPill, ScoreChip,
} from '../../components/shared/ui';

// ─── Icons ───────────────────────────────────────────────────────
const IcoUsers    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoClipboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>;
const IcoPlusCirc = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoCalendar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoRefresh  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IcoCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;

// ─── Helpers ─────────────────────────────────────────────────────
const fmtDT = (iso) => new Date(iso).toLocaleString('en-GB', {
  weekday:'short', day:'numeric', month:'short',
  hour:'2-digit', minute:'2-digit',
});
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', {
  weekday:'short', day:'numeric', month:'short',
});
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

const STATUSES = ['Present', 'Absent', 'Injured'];
const STATUS_COLOR = {
  Present: { bg:'var(--success-subtle)', color:'var(--success)', border:'rgba(16,185,129,0.3)' },
  Absent:  { bg:'var(--danger-subtle)',  color:'var(--danger)',  border:'rgba(239,68,68,0.3)' },
  Injured: { bg:'var(--warning-subtle)', color:'var(--warning)', border:'rgba(245,158,11,0.3)' },
  null:    { bg:'var(--bg-overlay)',     color:'var(--text-muted)', border:'var(--border-default)' },
};

// ─────────────────────────────────────────────────────────────────
// TEAM ROSTER
// ─────────────────────────────────────────────────────────────────

function TeamRoster() {
  // In V1.0 the roster is fetched via attendance (which includes player list).
  // We load upcoming events then show roster from the first event, or stub.
  const { data: events, loading, error, refetch } = useApi(
    () => scheduleApi.getEvents({ start: new Date().toISOString() }),
    [],
    { fallback: [] }
  );

  // Pull unique players from events or fallback message
  const nextEvent = events?.[0] ?? null;

  // Load roster for next event if available
  const { data: rosterData, loading: rosterLoading, error: rosterError } = useApi(
    () => nextEvent ? attendanceApi.getRoster(nextEvent.id) : Promise.resolve(null),
    [nextEvent?.id],
    { fallback: null }
  );

  const players = rosterData?.roster ?? [];

  return (
    <SectionCard
      title="Team Roster"
      subtitle={nextEvent ? `Showing for: ${nextEvent.title}` : 'Upcoming session'}
      action={
        <button className="btn btn-ghost btn-sm" onClick={refetch}
          disabled={loading} title="Refresh">
          <IcoRefresh />
        </button>
      }
    >
      {(error || rosterError) && (
        <ErrorBanner message={error || rosterError} onRetry={refetch}
          style={{ marginBottom: 16 }} />
      )}

      {(loading || rosterLoading) ? (
        <SkeletonTable rows={5} cols={3} />
      ) : !nextEvent ? (
        <EmptyState
          icon={<IcoUsers />}
          title="No upcoming sessions"
          subtitle="Roster will appear once a session is scheduled."
        />
      ) : players.length === 0 ? (
        <EmptyState icon={<IcoUsers />} title="No players rostered"
          subtitle="Add players to this team to see them here." />
      ) : (
        <>
          {/* Summary row */}
          <div style={{
            display:'flex', gap:12, marginBottom:16, flexWrap:'wrap',
          }}>
            {Object.entries(rosterData?.summary ?? {}).map(([k, v]) => k !== 'total' && (
              <div key={k} style={{
                padding:'4px 12px', borderRadius:99, fontSize:'0.75rem',
                fontFamily:'var(--font-display)', fontWeight:700,
                letterSpacing:'0.06em', textTransform:'uppercase',
                ...STATUS_COLOR[k],
                border:`1px solid ${STATUS_COLOR[k].border}`,
              }}>
                {v} {k}
              </div>
            ))}
            <div style={{
              padding:'4px 12px', borderRadius:99, fontSize:'0.75rem',
              fontFamily:'var(--font-display)', fontWeight:600,
              color:'var(--text-muted)', background:'var(--bg-overlay)',
            }}>
              {rosterData?.summary?.total} total
            </div>
          </div>

          {/* Roster table */}
          <div style={{ borderRadius:'var(--radius-md)', overflow:'hidden',
            border:'1px solid var(--border-subtle)' }}>
            <div style={{
              display:'grid', gridTemplateColumns:'1fr auto',
              gap:16, padding:'10px 16px',
              background:'var(--bg-elevated)',
              borderBottom:'1px solid var(--border-subtle)',
            }}>
              {['Player', 'Status'].map(h => (
                <span key={h} style={{
                  fontFamily:'var(--font-display)', fontSize:'0.7rem',
                  fontWeight:700, letterSpacing:'0.12em',
                  textTransform:'uppercase', color:'var(--text-muted)',
                }}>{h}</span>
              ))}
            </div>
            {players.map((p, i) => (
              <div key={p.player_id} style={{
                display:'grid', gridTemplateColumns:'1fr auto',
                gap:16, padding:'11px 16px', alignItems:'center',
                background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
                borderBottom: i < players.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize:'0.875rem', fontWeight:500,
                    color:'var(--text-primary)' }}>
                    {p.first_name} {p.last_name}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)',
                    fontFamily:'var(--font-mono)', marginTop:1 }}>
                    {p.email}
                  </div>
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// ATTENDANCE SHEET
// ─────────────────────────────────────────────────────────────────

function AttendanceSheet() {
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + 14);

  const { data: events, loading: evLoading, error: evError, refetch: refetchEvents } = useApi(
    () => scheduleApi.getEvents({ start: now.toISOString(), end: end.toISOString() }),
    [],
    { fallback: [] }
  );

  const [selectedEventId, setSelectedEventId] = useState(null);
  const activeEventId = selectedEventId ?? events?.[0]?.id ?? null;

  const { data: rosterData, loading: rosterLoading, error: rosterError, refetch: refetchRoster } = useApi(
    () => activeEventId ? attendanceApi.getRoster(activeEventId) : Promise.resolve(null),
    [activeEventId],
    { fallback: null }
  );

  // Local attendance state: { [player_id]: 'Present' | 'Absent' | 'Injured' }
  const [localAttendance, setLocalAttendance] = useState({});
  const [savedIds, setSavedIds] = useState({});

  const { submit: save, loading: saving, error: saveError, success: saved } = useSubmit(
    (records) => attendanceApi.logAttendance(activeEventId, records)
  );

  // Merge server state + local overrides
  const merged = (rosterData?.roster ?? []).map((p) => ({
    ...p,
    status: localAttendance[p.player_id] ?? p.status,
  }));

  const handleStatusToggle = (playerId, status) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [playerId]: prev[playerId] === status ? null : status,
    }));
  };

  const handleSaveAll = async () => {
    const records = merged.map((p) => ({
      player_id: p.player_id,
      status:    p.status || 'Absent',
    }));
    const res = await save(records);
    if (res.ok) {
      setSavedIds(Object.fromEntries(records.map(r => [r.player_id, true])));
    }
  };

  const loading = evLoading || rosterLoading;
  const error   = evError || rosterError;

  return (
    <SectionCard
      title="Attendance Log"
      subtitle="Click to mark each player"
      action={
        <div style={{ display:'flex', gap:8 }}>
          {saved && (
            <span style={{ color:'var(--success)', fontSize:'0.8rem',
              display:'flex', alignItems:'center', gap:4 }}>
              <IcoCheck /> Saved
            </span>
          )}
          <button
            className={`btn btn-primary btn-sm${saving ? ' btn-loading' : ''}`}
            onClick={handleSaveAll}
            disabled={saving || !activeEventId || merged.length === 0}
          >
            {!saving && 'Save Attendance'}
          </button>
        </div>
      }
    >
      {error && <ErrorBanner message={error} onRetry={refetchEvents} style={{ marginBottom:16 }} />}
      {saveError && <ErrorBanner message={saveError} style={{ marginBottom:16 }} />}

      {/* Event selector */}
      {!evLoading && events?.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {events.slice(0, 5).map((ev) => (
            <button
              key={ev.id}
              onClick={() => { setSelectedEventId(ev.id); setLocalAttendance({}); }}
              style={{
                padding:'6px 14px', borderRadius:'var(--radius-md)',
                border:`1px solid ${activeEventId === ev.id ? 'var(--accent)' : 'var(--border-default)'}`,
                background: activeEventId === ev.id ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                color: activeEventId === ev.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor:'pointer', fontSize:'0.8rem',
                fontFamily:'var(--font-display)', fontWeight:600,
                transition:'all 0.15s ease',
              }}
            >
              {fmtDate(ev.start_time)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} cols={2} />
      ) : !activeEventId ? (
        <EmptyState icon={<IcoClipboard />} title="No sessions available"
          subtitle="Select a session above to log attendance." />
      ) : merged.length === 0 ? (
        <EmptyState icon={<IcoClipboard />} title="No players rostered"
          subtitle="Add players to this team to log attendance." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {merged.map((p) => (
            <div key={p.player_id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 14px', gap:16,
              background:'var(--bg-elevated)',
              border:'1px solid var(--border-subtle)',
              borderRadius:'var(--radius-md)',
            }}>
              {/* Name */}
              <div style={{
                fontWeight:500, fontSize:'0.875rem',
                color:'var(--text-primary)', minWidth:0, flex:1,
              }}>
                {p.first_name} {p.last_name}
              </div>

              {/* Status toggle buttons */}
              <div style={{ display:'flex', gap:6 }}>
                {STATUSES.map((s) => {
                  const active = p.status === s;
                  const sc = STATUS_COLOR[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusToggle(p.player_id, s)}
                      style={{
                        padding:'4px 10px', borderRadius:6, cursor:'pointer',
                        fontFamily:'var(--font-display)', fontSize:'0.72rem',
                        fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
                        border:`1px solid ${active ? sc.border : 'var(--border-subtle)'}`,
                        background: active ? sc.bg : 'transparent',
                        color: active ? sc.color : 'var(--text-muted)',
                        transition:'all 0.12s ease',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// EVENT CREATOR
// ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', type: 'Practice', location: '',
  start_time: '', end_time: '', description: '',
};

function EventCreator({ onCreated }) {
  const [form, setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { submit, loading, error, success, reset } = useSubmit(
    () => scheduleApi.createEvent(form)
  );

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
    if (error) reset();
  };

  function validate() {
    const errs = {};
    if (!form.title.trim())      errs.title      = 'Session title is required.';
    if (!form.start_time)        errs.start_time = 'Start time is required.';
    if (!form.end_time)          errs.end_time   = 'End time is required.';
    if (form.start_time && form.end_time &&
        new Date(form.end_time) <= new Date(form.start_time))
      errs.end_time = 'End must be after start.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const res = await submit();
    if (res.ok) {
      setForm(EMPTY_FORM);
      onCreated?.();
    }
  }

  if (success) {
    return (
      <SectionCard title="Create Session">
        <div style={{ display:'flex', flexDirection:'column',
          alignItems:'center', gap:12, padding:'20px 0', textAlign:'center' }}>
          <div style={{
            width:48, height:48, borderRadius:'50%',
            background:'var(--success-subtle)',
            border:'1px solid rgba(16,185,129,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.2rem',
          }}>✓</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700,
            fontSize:'1.1rem', color:'var(--success)' }}>
            Session Created
          </div>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
            The session has been added to the team calendar.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={reset}>
            Add Another
          </button>
        </div>
      </SectionCard>
    );
  }

  const Field = ({ label, id, error: ferr, children }) => (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {ferr && <span className="field-error">{ferr}</span>}
    </div>
  );

  return (
    <SectionCard title="Create Session" subtitle="Schedule a new team event">
      {error && <ErrorBanner message={error} style={{ marginBottom:16 }} />}

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Field label="Session Title" id="ev-title" error={errors.title}>
          <input
            id="ev-title" className={`field-input${errors.title ? ' error' : ''}`}
            value={form.title} placeholder="e.g. Tuesday Tactical Session"
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Type" id="ev-type">
            <select id="ev-type" className="field-select"
              value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="Practice">Practice</option>
              <option value="Game">Game</option>
            </select>
          </Field>

          <Field label="Location" id="ev-location">
            <input id="ev-location" className="field-input"
              value={form.location} placeholder="e.g. Pitch A"
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Start Time" id="ev-start" error={errors.start_time}>
            <input id="ev-start" type="datetime-local"
              className={`field-input${errors.start_time ? ' error' : ''}`}
              value={form.start_time}
              onChange={(e) => set('start_time', e.target.value)}
            />
          </Field>
          <Field label="End Time" id="ev-end" error={errors.end_time}>
            <input id="ev-end" type="datetime-local"
              className={`field-input${errors.end_time ? ' error' : ''}`}
              value={form.end_time}
              onChange={(e) => set('end_time', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Notes (Optional)" id="ev-notes">
          <textarea
            id="ev-notes"
            className="field-input"
            value={form.description}
            placeholder="Training focus, special instructions..."
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            style={{ height:'auto', padding:'12px 16px', resize:'vertical', minHeight:80 }}
          />
        </Field>

        <button
          type="submit"
          className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
          disabled={loading}
        >
          {!loading && <><IcoPlusCirc /> Schedule Session</>}
        </button>
      </form>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// COACH DASHBOARD — LAYOUT
// ─────────────────────────────────────────────────────────────────

export default function CoachDashboard() {
  const user = useAuthStore((s) => s.user);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      <PageHeader
        eyebrow="Coach Workspace"
        title={`Coach ${user?.last_name}'s Hub`}
        subtitle="Manage your roster, log attendance, and schedule sessions"
        roleColor="var(--role-coach)"
      />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Top row: roster + attendance */}
        <TeamRoster key={refreshKey} />
        <AttendanceSheet />
        {/* Full-width event creator */}
        <div style={{ gridColumn:'1 / -1' }}>
          <EventCreator onCreated={() => setRefreshKey(k => k + 1)} />
        </div>
      </div>
    </div>
  );
}
