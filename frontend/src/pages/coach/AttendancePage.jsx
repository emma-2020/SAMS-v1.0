// src/pages/coach/AttendancePage.jsx — Premium v2
import { useState, useEffect } from 'react';
import { useSearchParams }     from 'react-router-dom';
import { useApi, useSubmit }   from '../../hooks/useApi';
import { scheduleApi }         from '../../services/schedule.api';
import { attendanceApi }       from '../../services/attendance.api';
import { PageHeader, EmptyState, Avatar } from '../../components/shared/ui';

// ─── Icons ─────────────────────────────────────────────────────────
const IcoClipboard = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IcoCheck  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoX      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoAlert  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoCal    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoMap    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoSave   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;

const STATUS_CFG = {
  Present: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Present', icon: <IcoCheck /> },
  Absent:  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Absent',  icon: <IcoX /> },
  Injured: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Injured', icon: <IcoAlert /> },
};

const TYPE_CFG = {
  Training: '#2563EB', Match: '#DC2626', Friendly: '#059669',
  Recovery: '#D97706', Meeting: '#7C3AED',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Session Card in sidebar ───────────────────────────────────────
function SessionCard({ event, active, onSelect }) {
  const isPast  = new Date(event.start_time) < new Date();
  const typeColor = TYPE_CFG[event.type] || '#6366F1';

  return (
    <button
      onClick={() => onSelect(event.id)}
      style={{
        display: 'flex', gap: 12, padding: '13px 14px',
        borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
        border: active ? `1.5px solid ${typeColor}` : '1.5px solid #E2E8F0',
        background: active ? `${typeColor}08` : '#fff',
        transition: 'all 0.16s',
        boxShadow: active ? `0 4px 16px ${typeColor}18` : '0 1px 4px rgba(15,23,42,0.04)',
        borderLeft: active ? `4px solid ${typeColor}` : `4px solid ${typeColor}40`,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${typeColor}60`; e.currentTarget.style.background = `${typeColor}05`; e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.07)'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.04)'; } }}
    >
      {/* Date block */}
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: active ? `${typeColor}15` : '#F8FAFC',
        border: `1px solid ${active ? `${typeColor}30` : '#E2E8F0'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.16s',
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: active ? typeColor : '#334155', lineHeight: 1 }}>
          {new Date(event.start_time).getDate()}
        </span>
        <span style={{ fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? `${typeColor}99` : '#94A3B8' }}>
          {new Date(event.start_time).toLocaleDateString('en-GB', { month: 'short' })}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: '0.875rem',
          color: active ? typeColor : '#0F172A',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          letterSpacing: '-0.01em',
        }}>
          {event.title}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'flex', flexShrink: 0 }}><IcoCal /></span>
          {fmtTime(event.start_time)}
          {event.location && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ display: 'flex', flexShrink: 0 }}><IcoMap /></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.location}</span>
            </>
          )}
        </div>
        {event.teams?.name && (
          <div style={{ fontSize: '0.67rem', color: typeColor, marginTop: 3, fontWeight: 700 }}>{event.teams.name}</div>
        )}
      </div>

      {/* Status pill */}
      <div style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
          background: isPast ? '#F8FAFC' : '#ECFDF5',
          color: isPast ? '#94A3B8' : '#059669',
          border: `1px solid ${isPast ? '#E2E8F0' : '#A7F3D0'}`,
          letterSpacing: '0.04em',
        }}>
          {isPast ? 'PAST' : 'UPCOMING'}
        </span>
      </div>
    </button>
  );
}

// ─── Select-a-Session placeholder ────────────────────────────────
function SelectPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 480,
      background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
      borderRadius: 20, border: '1.5px dashed #CBD5E1',
      padding: '48px 32px', textAlign: 'center',
    }}>
      {/* SVG illustration */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{
          width: 96, height: 96, borderRadius: 28,
          background: 'linear-gradient(135deg, #EEF2FF, #DBEAFE)',
          border: '1.5px solid #BFDBFE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(99,102,241,0.12)',
          color: '#6366F1',
        }}>
          <IcoClipboard />
        </div>
        {/* Decorative dots */}
        {[[-22,-10],[22,-16],[-18,28],[26,20]].map(([x,y], i) => (
          <div key={i} style={{
            position: 'absolute', width: i % 2 === 0 ? 6 : 8, height: i % 2 === 0 ? 6 : 8,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#C7D2FE' : '#BFDBFE',
            top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`,
            transform: 'translate(-50%, -50%)',
          }} />
        ))}
        <div style={{ position: 'absolute', inset: -10, borderRadius: 38, border: '1px solid #C7D2FE40', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: -22, borderRadius: 50, border: '1px dashed #C7D2FE30', pointerEvents: 'none' }} />
      </div>

      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', letterSpacing: '-0.015em', marginBottom: 8 }}>
        Select a Session
      </div>
      <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 260, margin: 0, lineHeight: 1.6 }}>
        Choose a session from the sidebar to start marking player attendance.
      </p>

      {/* Fake steps */}
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        {[
          { n: '1', text: 'Pick a session on the left' },
          { n: '2', text: 'Mark each player Present, Absent, or Injured' },
          { n: '3', text: 'Save attendance to record it' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#6366F1', flexShrink: 0 }}>
              {s.n}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Summary Card ─────────────────────────────────────────────
function StatBox({ label, count, color, bg, border }) {
  return (
    <div style={{
      textAlign: 'center', padding: '14px 10px', borderRadius: 14,
      background: bg, border: `1px solid ${border}`,
      boxShadow: count > 0 ? `0 2px 8px ${color}15` : 'none',
      transition: 'all 0.15s',
    }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em' }}>{count}</div>
      <div style={{ fontSize: '0.67rem', fontWeight: 700, color, marginTop: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ─── Player Row ───────────────────────────────────────────────────
function PlayerRow({ player, status, onSet }) {
  const current = status ? STATUS_CFG[status] : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 14,
      background: current ? current.bg : '#F8FAFC',
      border: `1.5px solid ${current ? current.border : '#E2E8F0'}`,
      transition: 'all 0.14s',
      borderLeft: `4px solid ${current ? current.color : '#CBD5E1'}`,
    }}>
      <Avatar name={`${player.first_name} ${player.last_name}`} role="Player" size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
          {player.first_name} {player.last_name}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 1 }}>{player.email}</div>
      </div>

      {/* Status toggle group */}
      <div style={{
        display: 'flex', gap: 4, flexShrink: 0,
        background: '#F1F5F9', borderRadius: 10, padding: 4,
      }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const active = status === key;
          return (
            <button
              key={key}
              onClick={() => onSet(player.player_id, active ? null : key)}
              title={cfg.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
                border: active ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                background: active ? cfg.bg : 'transparent',
                color: active ? cfg.color : '#94A3B8',
                fontSize: '0.72rem', fontWeight: active ? 800 : 500,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.color = cfg.color; e.currentTarget.style.border = `1.5px solid ${cfg.border}`; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.border = '1.5px solid transparent'; } }}
            >
              <span style={{ display: 'flex' }}>{cfg.icon}</span>
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event') || null);
  const [statuses, setStatuses]               = useState({});
  const [savedSuccess, setSavedSuccess]       = useState(false);

  const today = new Date();
  const from  = new Date(); from.setDate(today.getDate() - 90);
  const to    = new Date(); to.setDate(today.getDate() + 90);

  const { data: events, loading: eventsLoading } = useApi(
    () => scheduleApi.getEvents({ start: from.toISOString(), end: to.toISOString() }),
    [], { fallback: [] }
  );

  const { data: rosterData, loading: rosterLoading, error: rosterError, refetch: refetchRoster } = useApi(
    () => selectedEventId ? attendanceApi.getRoster(selectedEventId) : Promise.resolve(null),
    [selectedEventId], { fallback: null }
  );

  useEffect(() => {
    if (rosterData?.roster) {
      const init = {};
      for (const p of rosterData.roster) { if (p.status) init[p.player_id] = p.status; }
      setStatuses(init);
      setSavedSuccess(false);
    }
  }, [rosterData]);

  function handleSelectEvent(id) {
    setSelectedEventId(id);
    setSearchParams({ event: id });
    setStatuses({});
    setSavedSuccess(false);
  }

  function handleSetStatus(playerId, status) {
    setStatuses(prev => {
      if (status === null) { const n = { ...prev }; delete n[playerId]; return n; }
      return { ...prev, [playerId]: status };
    });
    setSavedSuccess(false);
  }

  const { submit, loading: saving, error: saveError } = useSubmit(
    (eventId, records) => attendanceApi.logAttendance(eventId, records)
  );

  async function handleSave() {
    if (!rosterData?.roster || !selectedEventId) return;
    const records = rosterData.roster.map(p => ({ player_id: p.player_id, status: statuses[p.player_id] || 'Present' }));
    const { ok } = await submit(selectedEventId, records);
    if (ok) { setSavedSuccess(true); refetchRoster(); }
  }

  const roster  = rosterData?.roster || [];
  const presentCount = Object.values(statuses).filter(s => s === 'Present').length;
  const absentCount  = Object.values(statuses).filter(s => s === 'Absent').length;
  const injuredCount = Object.values(statuses).filter(s => s === 'Injured').length;
  const pendingCount = roster.length - Object.keys(statuses).length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Attendance Tracker"
        subtitle="Select a session to mark player attendance"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left sidebar */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: 20, border: '1px solid #E2E8F0',
          padding: '16px 14px',
          boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
        }}>
          <div style={{
            fontSize: '0.67rem', fontWeight: 900, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12, paddingLeft: 4,
          }}>
            Sessions
          </div>

          {eventsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
            </div>
          ) : !(events || []).length ? (
            <div style={{
              borderRadius: 14, padding: '24px 16px', textAlign: 'center',
              background: '#fff', border: '1px solid #E2E8F0',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>No sessions found.</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>Create one from the Schedule page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...(events || [])].sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).map(ev => (
                <SessionCard key={ev.id} event={ev} active={ev.id === selectedEventId} onSelect={handleSelectEvent} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div>
          {!selectedEventId ? (
            <SelectPlaceholder />
          ) : rosterLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}
            </div>
          ) : rosterError ? (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.875rem' }}>
              {rosterError}
            </div>
          ) : (
            <>
              {/* Event header card */}
              {rosterData?.event && (() => {
                const tc = TYPE_CFG[rosterData.event.type] || '#6366F1';
                return (
                  <div style={{
                    background: `linear-gradient(135deg, ${tc}10, #fff)`,
                    borderRadius: 18, padding: '16px 20px', marginBottom: 16,
                    border: `1.5px solid ${tc}25`,
                    boxShadow: `0 4px 16px ${tc}12`,
                    borderLeft: `5px solid ${tc}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A', letterSpacing: '-0.015em' }}>
                          {rosterData.event.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IcoCal />{fmtDate(rosterData.event.start_time)}
                          </span>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span>{fmtTime(rosterData.event.start_time)}</span>
                          {rosterData.event.location && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <IcoMap />{rosterData.event.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 12px', borderRadius: 99, background: `${tc}15`, color: tc, border: `1px solid ${tc}30`, flexShrink: 0, letterSpacing: '0.04em' }}>
                        {rosterData.event.type}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Summary stats */}
              {roster.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  <StatBox label="Present" count={presentCount} color="#059669" bg="#ECFDF5" border="#A7F3D0" />
                  <StatBox label="Absent"  count={absentCount}  color="#DC2626" bg="#FEF2F2" border="#FECACA" />
                  <StatBox label="Injured" count={injuredCount} color="#D97706" bg="#FFFBEB" border="#FDE68A" />
                  <StatBox label="Pending" count={pendingCount} color="#94A3B8" bg="#F8FAFC" border="#E2E8F0" />
                </div>
              )}

              {/* Quick mark-all */}
              {roster.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                  padding: '10px 14px', borderRadius: 12,
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginRight: 2 }}>Mark all:</span>
                  {['Present', 'Absent', 'Injured'].map(s => {
                    const cfg = STATUS_CFG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          const next = {};
                          roster.forEach(p => { next[p.player_id] = s; });
                          setStatuses(next); setSavedSuccess(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                          border: `1.5px solid ${cfg.border}`, background: cfg.bg,
                          color: cfg.color, fontSize: '0.75rem', fontWeight: 700,
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 8px ${cfg.color}20`; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <span style={{ display: 'flex' }}>{cfg.icon}</span> {s}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Player list */}
              {!roster.length ? (
                <EmptyState icon={<IcoClipboard />} title="No players on this team" subtitle="No roster entries found for this session's team." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roster.map(p => (
                    <PlayerRow key={p.player_id} player={p} status={statuses[p.player_id] || null} onSet={handleSetStatus} />
                  ))}
                </div>
              )}

              {/* Save bar */}
              {roster.length > 0 && (
                <div style={{
                  marginTop: 16, padding: '14px 18px',
                  background: savedSuccess ? '#ECFDF5' : '#fff',
                  border: `1.5px solid ${savedSuccess ? '#A7F3D0' : '#E2E8F0'}`,
                  borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                }}>
                  {savedSuccess ? (
                    <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 99, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoCheck /></span>
                      Attendance saved successfully!
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{Object.keys(statuses).length}</span> of {roster.length} players marked
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {saveError && <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>{saveError}</span>}
                    <button
                      onClick={handleSave}
                      disabled={saving || !roster.length}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 20px', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                        background: saving ? '#94A3B8' : 'linear-gradient(135deg, #059669, #10B981)',
                        border: 'none', color: '#fff',
                        fontSize: '0.875rem', fontWeight: 700,
                        boxShadow: saving ? 'none' : '0 4px 12px rgba(16,185,129,0.35)',
                        transition: 'all 0.14s',
                      }}
                    >
                      <IcoSave /> {saving ? 'Saving…' : 'Save Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
