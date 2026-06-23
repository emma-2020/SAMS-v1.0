'use client';

import { useState, useEffect } from 'react';
import { healthApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp {
    from{ opacity:0; transform:translateY(12px); }
    to  { opacity:1; transform:translateY(0); }
  }
  .pc {
    background:var(--bg-surface);
    border:1px solid var(--border-subtle);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.04);
    transition:box-shadow .2s;
  }
  .pc:hover { box-shadow:0 4px 32px rgba(0,0,0,.08); }
  .pg3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }

  @media(max-width:860px){ .pg3 { grid-template-columns:repeat(3,1fr); gap:10px; } }
  @media(max-width:560px){
    .pg3 { grid-template-columns:1fr 1fr 1fr; gap:8px; }
    .pc  { border-radius:16px; }
  }
  @media(max-width:400px){ .pg3 { grid-template-columns:1fr; } }
`;

// ── Types ──────────────────────────────────────────────────────────────────────
interface HealthLog {
  id: string; player_id: string; overall_score?: number;
  energy?: number; sleep?: number; muscle_soreness?: number; stress?: number;
  fatigue?: number; soreness?: number; sleep_quality?: number;
  is_flagged?: boolean; notes?: string;
  submitted_at?: string; logged_at?: string;
  users?: { first_name: string; last_name: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' });
}
function fmtTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB',{ hour:'2-digit', minute:'2-digit' });
}
function daysAgo(iso?: string): string | null {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; return `${d}d ago`;
}

function scoreColor(s: number) { return s >= 70 ? '#059669' : s >= 40 ? '#D97706' : '#DC2626'; }
function scoreLabel(s: number) { return s >= 70 ? 'Good' : s >= 40 ? 'Moderate' : 'Low'; }
function scoreBg(s: number)    { return s >= 70 ? '#ECFDF5' : s >= 40 ? '#FFFBEB' : '#FEF2F2'; }

// ── Score donut ────────────────────────────────────────────────────────────────
function ScoreDonut({ score }: { score: number }) {
  const sz = 110, r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ - (score / 100) * circ;
  const color = scoreColor(score);
  const bg    = scoreBg(score);
  return (
    <div style={{ position:'relative', width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:'rotate(-90deg)', position:'absolute', inset:0 }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={9}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter:`drop-shadow(0 0 6px ${color}60)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:9, borderRadius:'50%', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:'1.5rem', fontWeight:900, color, lineHeight:1, letterSpacing:'-0.03em' }}>{score}</span>
        <span style={{ fontSize:'0.52rem', fontWeight:700, color:`${color}90`, letterSpacing:'0.06em', textTransform:'uppercase' }}>score</span>
      </div>
    </div>
  );
}

// ── Metric bar ─────────────────────────────────────────────────────────────────
function MetricBar({ label, value, max = 5, lowIsBetter = false }: {
  label: string; value: number | null | undefined; max?: number; lowIsBetter?: boolean;
}) {
  if (value == null) return null;
  const hp       = lowIsBetter ? (1 - (value - 1) / (max - 1)) * 100 : ((value - 1) / (max - 1)) * 100;
  const barColor = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#DC2626';
  const fill     = (value / max) * 100;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize:'0.8rem', fontWeight:800, color:barColor, fontFamily:'var(--font-mono)' }}>{value}/{max}</span>
      </div>
      <div style={{ height:7, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ width:`${fill}%`, height:'100%', borderRadius:99, background:`linear-gradient(90deg,${barColor}80,${barColor})`, boxShadow:`0 0 6px ${barColor}44`, transition:'width .8s ease' }}/>
      </div>
    </div>
  );
}

// ── Health log card ────────────────────────────────────────────────────────────
function HealthLogCard({ log }: { log: HealthLog }) {
  const date    = log.logged_at ?? log.submitted_at;
  const score   = log.overall_score ?? 0;
  const flagged = log.is_flagged || score < 40;
  const col     = scoreColor(score);
  const bg      = scoreBg(score);

  const energyV  = log.energy ?? log.fatigue ?? null;
  const sleepV   = log.sleep  ?? log.sleep_quality ?? null;
  const sorV     = log.muscle_soreness ?? log.soreness ?? null;
  const stressV  = log.stress ?? null;

  return (
    <div style={{ background:flagged ? 'linear-gradient(135deg,#FFF5F5,#FFFBF5)' : 'var(--bg-elevated)', border:`1px solid ${flagged ? '#FECACA' : 'var(--border-subtle)'}`, borderRadius:16, overflow:'hidden', borderLeft:`4px solid ${flagged ? '#DC2626' : score >= 70 ? '#059669' : '#D97706'}` }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,.04)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>{fmtDate(date)}</div>
          {date && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>Logged at {fmtTime(date)} · {daysAgo(date)}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {score > 0 && (
            <span style={{ fontSize:'0.75rem', fontWeight:800, padding:'4px 12px', borderRadius:99, background:bg, color:col, border:`1px solid ${col}28` }}>
              {scoreLabel(score)} ({score})
            </span>
          )}
          {flagged && (
            <span style={{ fontSize:'0.62rem', fontWeight:800, padding:'3px 8px', borderRadius:99, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>⚠️ ALERT</span>
          )}
        </div>
      </div>
      {/* Metrics */}
      <div style={{ padding:'14px 16px' }}>
        <MetricBar label="Energy"   value={energyV}  lowIsBetter={false}/>
        <MetricBar label="Sleep"    value={sleepV}   lowIsBetter={false}/>
        <MetricBar label="Soreness" value={sorV}     lowIsBetter={true}/>
        {stressV != null && <MetricBar label="Stress" value={stressV} lowIsBetter={true}/>}
        {log.notes && (
          <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(99,102,241,.05)', borderRadius:8, border:'1px solid rgba(99,102,241,.1)', fontSize:'0.76rem', color:'var(--text-secondary)', fontStyle:'italic' }}>
            &ldquo;{log.notes}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ParentHealthPage() {
  useAuthStore(s => s.user);
  const [logs,    setLogs]    = useState<HealthLog[]>([]);
  const [alerts,  setAlerts]  = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch(() => [] as HealthLog[]),
      (healthApi as any).getMyHealth?.()?.catch?.(() => []) ?? Promise.resolve([]),
    ]).then(([alts, myLogs]: [any, any]) => {
      setAlerts(Array.isArray(alts) ? alts : []);
      setLogs(Array.isArray(myLogs) ? myLogs : []);
    }).finally(() => setLoading(false));
  }, []);

  const latestLog   = alerts[0] ?? logs[0];
  const latestScore = latestLog?.overall_score ?? 0;
  const latestDate  = latestLog?.logged_at ?? latestLog?.submitted_at;
  const allLogs     = alerts.length > 0 ? alerts : logs;

  return (
    <div style={{ animation:'fadeUp .3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:'1.55rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.025em', lineHeight:1.2, margin:0 }}>
          Child&rsquo;s Wellness
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginTop:6 }}>
          Health check-in history and wellness alerts
        </p>
      </div>

      {/* ── Latest wellness snapshot ─────────────────────────────── */}
      {!loading && latestLog && (
        <div style={{ marginBottom:24, borderRadius:20, padding:'22px 26px', background:'linear-gradient(135deg,#FFFBEB,#FFF 60%)', border:'1.5px solid #FDE68A', boxShadow:'0 4px 20px rgba(217,119,6,.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:22, flexWrap:'wrap' }}>
            <ScoreDonut score={latestScore}/>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-primary)', marginBottom:4 }}>Latest Wellness Check-in</div>
              {latestDate && (
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:14 }}>
                  {daysAgo(latestDate)} · {fmtDate(latestDate)}
                </div>
              )}
              {latestScore < 40 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:99, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.8rem', fontWeight:700 }}>
                  ⚠️ Wellness score is low — consider checking in with the coach
                </div>
              )}
              {latestScore >= 70 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:99, background:'#ECFDF5', border:'1px solid #A7F3D0', color:'#059669', fontSize:'0.8rem', fontWeight:700 }}>
                  ✓ Your child is feeling well today
                </div>
              )}
              {latestScore >= 40 && latestScore < 70 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:99, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#D97706', fontSize:'0.8rem', fontWeight:700 }}>
                  ℹ️ Wellness is moderate — monitor closely
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI row ─────────────────────────────────────────────── */}
      {!loading && allLogs.length > 0 && (
        <div className="pg3" style={{ marginBottom:24 }}>
          {[
            { label:'Wellness Score',  value:latestScore > 0 ? `${latestScore}%` : '—', icon:'💚', color:latestScore >= 70 ? '#059669' : latestScore >= 40 ? '#D97706' : '#DC2626' },
            { label:'Total Check-ins', value:allLogs.length,                             icon:'📊', color:ROLE_COLOR.Parent },
            { label:'Last Check-in',   value:daysAgo(latestDate) ?? '—',                icon:'🕐', color:'#6366F1' },
          ].map(kpi => (
            <div key={kpi.label} className="pc" style={{ padding:'18px 16px', textAlign:'center' }}>
              <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{kpi.icon}</div>
              <div style={{ fontSize:'1.35rem', fontWeight:900, color:kpi.color, letterSpacing:'-0.03em', lineHeight:1 }}>{kpi.value}</div>
              <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginTop:5 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log history ─────────────────────────────────────────── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>Wellness History</h2>
          {allLogs.length > 0 && <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{allLogs.length} entries</span>}
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:130, borderRadius:16 }}/>)}
          </div>
        ) : !allLogs.length ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 32px', textAlign:'center', background:'linear-gradient(135deg,#F8FAFC,#FFFBEB)', borderRadius:20, border:'1px solid #FDE68A' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>❤️</div>
            <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text-primary)', marginBottom:8 }}>No wellness check-ins yet</div>
            <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', maxWidth:300, margin:0, lineHeight:1.6 }}>
              Once your child completes a wellness check-in, you&rsquo;ll see their health data here.
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {allLogs.map((log: HealthLog) => <HealthLogCard key={log.id} log={log}/>)}
          </div>
        )}
      </div>

      {/* ── Info footer ─────────────────────────────────────────── */}
      <div style={{ marginTop:24, padding:'13px 16px', borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:'1.1rem', flexShrink:0 }}>ℹ️</span>
        <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', margin:0, lineHeight:1.6 }}>
          Wellness scores are submitted by your child before training. Scores below 40 trigger an alert. Contact the coach if you have concerns about your child&rsquo;s welfare.
        </p>
      </div>
    </div>
  );
}
