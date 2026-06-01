// src/pages/parent/index.jsx
import { useApi }       from '../../hooks/useApi';
import { scheduleApi }  from '../../services/schedule.api';
import { healthApi }    from '../../services/health.api';
import useAuthStore     from '../../store/authStore';
import {
  PageHeader, SectionCard, ErrorBanner, EmptyState,
  SkeletonCard, SkeletonLine, StatusPill, ScoreChip,
} from '../../components/shared/ui';

// ─── Icons ───────────────────────────────────────────────────────
const IcoAlertTriangle = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoCalendar      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoHeart         = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoShieldOff     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/></svg>;
const IcoCheckShield   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
const IcoPin           = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoClock         = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

// ─── Helpers ─────────────────────────────────────────────────────

const fmtDate  = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
const fmtTime  = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
const fmtAgo   = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};

function daysUntil(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Tomorrow';
  if (d < 0)  return 'Past';   return `In ${d}d`;
}

// Determines if a health log entry should show a red alert
function isHealthAlert(log) {
  return (
    (log.fatigue      >= 4) ||
    (log.soreness     >= 4) ||
    (log.sleep_quality <= 2) ||
    log.is_flagged
  );
}

function isInjuryAlert(log) {
  // attendance injuries surface separately, but flag if fatigue is 5
  return log.fatigue === 5 || log.soreness === 5;
}

// ─────────────────────────────────────────────────────────────────
// HEALTH STATUS BANNER
// Prominent visual at the top — green (clear) or red (alert)
// ─────────────────────────────────────────────────────────────────

function HealthStatusBanner({ alerts, loading }) {
  if (loading) {
    return (
      <div style={{ height:80, borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div className="skeleton" style={{ width:'100%', height:'100%' }} />
      </div>
    );
  }

  const activeAlerts = (alerts ?? []).filter(isHealthAlert);
  const hasAlert     = activeAlerts.length > 0;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:20,
      padding:'20px 24px',
      borderRadius:'var(--radius-lg)',
      background: hasAlert
        ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))'
        : 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.04))',
      border:`1px solid ${hasAlert ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}`,
      animation: hasAlert ? 'pulse-amber 2s ease-in-out infinite' : 'none',
    }}>
      <div style={{
        width:52, height:52, borderRadius:'50%', flexShrink:0,
        background: hasAlert ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color: hasAlert ? 'var(--danger)' : 'var(--success)',
      }}>
        {hasAlert ? <IcoShieldOff /> : <IcoCheckShield />}
      </div>
      <div style={{ flex:1 }}>
        <div style={{
          fontFamily:'var(--font-display)', fontWeight:800,
          fontSize:'1.1rem',
          color: hasAlert ? 'var(--danger)' : 'var(--success)',
          marginBottom:2,
        }}>
          {hasAlert
            ? `⚠ ${activeAlerts.length} Active Health Alert${activeAlerts.length > 1 ? 's' : ''}`
            : '✓ Athlete Status: All Clear'}
        </div>
        <div style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>
          {hasAlert
            ? 'Your athlete has logged concerning wellness scores. Review details below.'
            : 'No flagged health concerns in the last 30 days. Your athlete is doing well.'}
        </div>
      </div>
      {hasAlert && (
        <div style={{
          flexShrink:0, padding:'6px 16px', borderRadius:'var(--radius-md)',
          background:'var(--danger)', color:'#fff',
          fontFamily:'var(--font-display)', fontWeight:700,
          fontSize:'0.78rem', letterSpacing:'0.08em', textTransform:'uppercase',
        }}>
          Action Needed
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHILD SCHEDULE
// ─────────────────────────────────────────────────────────────────

function ChildSchedule() {
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + 21);

  const { data: events, loading, error, refetch } = useApi(
    () => scheduleApi.getEvents({ start: now.toISOString(), end: end.toISOString() }),
    [],
    { fallback: [] }
  );

  const typeColor = { Practice:'var(--info)', Game:'var(--accent)' };

  return (
    <SectionCard
      title="Athlete Schedule"
      subtitle="Your child's upcoming sessions"
      action={
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text-muted)' }}>
          {!loading && `${events?.length ?? 0} upcoming`}
        </span>
      }
    >
      {error && <ErrorBanner message={error} onRetry={refetch} style={{ marginBottom:16 }} />}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height:68, borderRadius:'var(--radius-md)' }} />
          ))}
        </div>
      ) : events?.length === 0 ? (
        <EmptyState icon={<IcoCalendar />} title="No sessions scheduled"
          subtitle="Your child has no upcoming training sessions or games." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {events.map((ev) => {
            const soon = daysUntil(ev.start_time);
            const tc   = typeColor[ev.type] ?? 'var(--text-muted)';
            return (
              <div key={ev.id} style={{
                display:'flex', alignItems:'center', gap:0,
                borderRadius:'var(--radius-md)', overflow:'hidden',
                border:'1px solid var(--border-default)',
                background:'var(--bg-elevated)',
              }}>
                {/* Date block */}
                <div style={{
                  width:56, flexShrink:0, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  padding:'10px 0', borderRight:'1px solid var(--border-subtle)',
                  background:'var(--bg-overlay)',
                }}>
                  <div style={{
                    fontFamily:'var(--font-display)', fontSize:'1.1rem',
                    fontWeight:800, color: soon === 'Today' ? 'var(--accent)' : 'var(--text-primary)',
                    lineHeight:1,
                  }}>
                    {new Date(ev.start_time).getDate()}
                  </div>
                  <div style={{
                    fontFamily:'var(--font-display)', fontSize:'0.65rem',
                    fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase',
                    color:'var(--text-muted)',
                  }}>
                    {new Date(ev.start_time).toLocaleDateString('en-GB', { month:'short' })}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex:1, padding:'10px 14px', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8,
                    marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{
                      fontFamily:'var(--font-display)', fontWeight:700,
                      fontSize:'0.9rem', color:'var(--text-primary)',
                    }}>{ev.title}</span>
                    <span style={{
                      padding:'1px 7px', borderRadius:99, fontSize:'0.65rem',
                      fontFamily:'var(--font-display)', fontWeight:700,
                      letterSpacing:'0.08em', textTransform:'uppercase',
                      background:`${tc}18`, color:tc,
                      border:`1px solid ${tc}33`,
                    }}>{ev.type}</span>
                  </div>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4,
                      color:'var(--text-secondary)', fontSize:'0.78rem' }}>
                      <IcoClock />{fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
                    </span>
                    {ev.location && (
                      <span style={{ display:'flex', alignItems:'center', gap:4,
                        color:'var(--text-secondary)', fontSize:'0.78rem' }}>
                        <IcoPin />{ev.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day badge */}
                <div style={{
                  flexShrink:0, padding:'0 14px', alignSelf:'stretch',
                  display:'flex', alignItems:'center',
                  borderLeft:'1px solid var(--border-subtle)',
                }}>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                    color: soon === 'Today' ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: soon === 'Today' ? 600 : 400,
                    whiteSpace:'nowrap',
                  }}>{soon}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// HEALTH ALERT PANEL
// ─────────────────────────────────────────────────────────────────

const METRIC_LABEL = {
  fatigue:       { label:'Fatigue',       badHigh: true  },
  soreness:      { label:'Soreness',      badHigh: true  },
  sleep_quality: { label:'Sleep Quality', badHigh: false },
};

function HealthAlertPanel() {
  const { data: alerts, loading, error, refetch } = useApi(
    () => healthApi.getAlerts(),
    [],
    { fallback: [] }
  );

  const flagged = (alerts ?? []).filter(isHealthAlert);

  return (
    <SectionCard title="Health Alerts" subtitle="Flagged wellness logs">
      {error && <ErrorBanner message={error} onRetry={refetch} style={{ marginBottom:16 }} />}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2].map(i => <SkeletonCard key={i} rows={3} />)}
        </div>
      ) : flagged.length === 0 ? (
        <EmptyState
          icon={<IcoHeart />}
          title="No health alerts"
          subtitle="Your child's recent wellness logs are all within normal range."
        />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {flagged.map((log) => {
            const isInjury = isInjuryAlert(log);
            return (
              <div key={log.id} style={{
                borderRadius:'var(--radius-md)',
                border:`1px solid ${isInjury ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)'}`,
                background: isInjury ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                overflow:'hidden',
                animation:'fadeIn 0.25s ease',
              }}>
                {/* Alert header */}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px',
                  borderBottom:`1px solid ${isInjury ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)'}`,
                  background: isInjury ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color: isInjury ? 'var(--danger)' : 'var(--warning)' }}>
                      <IcoAlertTriangle />
                    </span>
                    <span style={{
                      fontFamily:'var(--font-display)', fontWeight:700,
                      fontSize:'0.875rem',
                      color: isInjury ? 'var(--danger)' : 'var(--warning)',
                    }}>
                      {isInjury ? 'High-Risk Score Detected' : 'Wellness Flag'}
                    </span>
                  </div>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                    color:'var(--text-muted)',
                  }}>
                    {fmtAgo(log.logged_at)}
                  </span>
                </div>

                {/* Metric bars */}
                <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                  {['fatigue','soreness','sleep_quality'].map((key) => {
                    const val = log[key];
                    const { label, badHigh } = METRIC_LABEL[key];
                    const bad = badHigh ? val >= 4 : val <= 2;
                    const pct = ((val - 1) / 4) * 100;
                    const barColor = bad
                      ? 'var(--danger)' : val >= 4 && !badHigh
                      ? 'var(--success)' : 'var(--accent)';

                    return (
                      <div key={key}>
                        <div style={{ display:'flex', justifyContent:'space-between',
                          marginBottom:4 }}>
                          <span style={{ fontSize:'0.78rem',
                            color: bad ? (isInjury ? 'var(--danger)' : 'var(--warning)') : 'var(--text-secondary)',
                            fontWeight: bad ? 600 : 400,
                          }}>
                            {label} {bad && '⚠'}
                          </span>
                          <ScoreChip value={val} low={badHigh} />
                        </div>
                        <div style={{ height:4, borderRadius:2, background:'var(--bg-overlay)' }}>
                          <div style={{
                            height:'100%', borderRadius:2,
                            background:barColor, width:`${pct}%`,
                            transition:'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// PARENT DASHBOARD — LAYOUT
// ─────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: alerts, loading: alertsLoading } = useApi(
    () => healthApi.getAlerts(),
    [],
    { fallback: [] }
  );

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      <PageHeader
        eyebrow="Parent Portal"
        title={`${user?.first_name}'s Dashboard`}
        subtitle="Monitor your athlete's schedule and wellness in real time"
        roleColor="var(--role-parent)"
      />

      {/* Prominent health status banner */}
      <div style={{ marginBottom:24 }}>
        <HealthStatusBanner alerts={alerts} loading={alertsLoading} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <ChildSchedule />
        <HealthAlertPanel />
      </div>
    </div>
  );
}
