'use client';

import { useState, useEffect, useMemo } from 'react';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';

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
  .pg4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }

  @media(max-width:860px) { .pg4 { grid-template-columns:repeat(2,1fr); gap:10px; } }
  @media(max-width:500px) { .pg4 { grid-template-columns:1fr 1fr; gap:8px; } }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB',{ day:'numeric', month:'short' });
}
function fmtTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB',{ hour:'2-digit', minute:'2-digit' });
}
function daysAgo(iso?: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; return `${d}d ago`;
}
function scoreColor(s: number) { return s >= 70 ? '#059669' : s >= 40 ? '#D97706' : '#DC2626'; }
function scoreLabel(s: number) { return s >= 70 ? 'Good' : s >= 40 ? 'Moderate' : 'Low'; }
function scoreBg(s:   number) { return s >= 70 ? '#ECFDF5' : s >= 40 ? '#FFFBEB' : '#FEF2F2'; }

function computeStreak(logs: HealthEntry[]): number {
  if (!logs.length) return 0;
  const sorted  = [...logs].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  const todayMs = new Date().setHours(0, 0, 0, 0);
  let streak    = 0, expected = todayMs;
  for (const log of sorted) {
    const dayMs = new Date(log.submitted_at).setHours(0, 0, 0, 0);
    if (dayMs === expected || dayMs === expected - 86400000) {
      streak++;
      expected = dayMs - 86400000;
    } else break;
  }
  return streak;
}

// ── Score Donut ────────────────────────────────────────────────────────────────
function ScoreDonut({ score }: { score: number }) {
  const sz = 130, r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div style={{ position:'relative', width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:'rotate(-90deg)', position:'absolute', inset:0 }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={11}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={11}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)', filter:`drop-shadow(0 0 8px ${color}55)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:10, borderRadius:'50%', background:scoreBg(score), display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:'1.7rem', fontWeight:900, color, lineHeight:1, letterSpacing:'-0.04em' }}>{score}</span>
        <span style={{ fontSize:'0.5rem', fontWeight:800, color:`${color}90`, letterSpacing:'0.08em', textTransform:'uppercase', marginTop:1 }}>score</span>
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="pc" style={{ padding:'18px 16px', textAlign:'center' }}>
      <div style={{ width:40, height:40, borderRadius:11, background:`${color}12`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', margin:'0 auto 10px' }}>{icon}</div>
      <div style={{ fontSize:'1.4rem', fontWeight:900, color, letterSpacing:'-0.03em', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'0.63rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginTop:5 }}>{label}</div>
    </div>
  );
}

// ── Wellness Trend Chart ───────────────────────────────────────────────────────
function WellnessTrendChart({ logs }: { logs: HealthEntry[] }) {
  const data = useMemo(() => {
    return [...logs]
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
      .map(l => ({ date: l.submitted_at.slice(0, 10), score: l.overall_score, submitted_at: l.submitted_at }));
  }, [logs]);

  const W = 400, H = 80;
  if (data.length < 2) return (
    <div style={{ textAlign:'center', padding:'24px 0' }}>
      <div style={{ fontSize:'1.8rem', marginBottom:6 }}>📈</div>
      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
        {data.length === 0 ? 'No logs yet' : 'Log at least 2 check-ins to see the trend'}
      </div>
    </div>
  );

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: 8 + ((100 - d.score) / 100) * (H - 16),
    score: d.score,
  }));
  const line   = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area   = `${line} L${W},${H} L0,${H} Z`;
  const latest = data[data.length - 1].score;
  const tc     = scoreColor(latest);

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display:'block', marginBottom:6 }}>
        <defs>
          <linearGradient id="ph-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tc} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={tc} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ph-trend)"/>
        <path d={line} fill="none" stroke={tc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.5 : 2.5}
            fill="var(--bg-surface)" stroke={scoreColor(p.score)} strokeWidth="2"
            style={i === pts.length - 1 ? { filter:`drop-shadow(0 0 4px ${tc})` } : {}}/>
        ))}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{fmtDateShort(data[0].submitted_at)}</span>
        <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{fmtDateShort(data[data.length - 1].submitted_at)}</span>
      </div>
    </>
  );
}

// ── Metric Bar ─────────────────────────────────────────────────────────────────
function MetricBar({ label, value, max = 5, lowIsBetter = false }: {
  label: string; value: number | null | undefined; max?: number; lowIsBetter?: boolean;
}) {
  if (value == null) return null;
  const hp       = lowIsBetter ? (1 - (value - 1) / (max - 1)) * 100 : ((value - 1) / (max - 1)) * 100;
  const barColor = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#DC2626';
  const fill     = (value / max) * 100;
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize:'0.78rem', fontWeight:800, color:barColor, fontFamily:'var(--font-mono)' }}>{value}/{max}</span>
      </div>
      <div style={{ height:6, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ width:`${fill}%`, height:'100%', borderRadius:99, background:`linear-gradient(90deg,${barColor}80,${barColor})`, boxShadow:`0 0 5px ${barColor}44`, transition:'width .8s ease' }}/>
      </div>
    </div>
  );
}

// ── Health Log Card ────────────────────────────────────────────────────────────
function HealthLogCard({ log }: { log: HealthEntry }) {
  const date    = log.submitted_at;
  const score   = log.overall_score ?? 0;
  const flagged = log.is_flagged || score < 40;
  const col     = scoreColor(score);
  const bg      = scoreBg(score);

  const energyV = log.energy ?? null;
  const sleepV  = log.sleep  ?? null;
  const sorV    = log.muscle_soreness ?? null;
  const stressV = log.stress ?? null;

  return (
    <div style={{ background:flagged ? 'linear-gradient(135deg,#FFF5F5,#FFFBF5)' : 'var(--bg-elevated)',
      border:`1px solid ${flagged ? '#FECACA' : 'var(--border-subtle)'}`,
      borderRadius:16, overflow:'hidden',
      borderLeft:`4px solid ${flagged ? '#DC2626' : score >= 70 ? '#059669' : '#D97706'}` }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,.04)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>{fmtDate(date)}</div>
          {date && <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:1 }}>Logged at {fmtTime(date)} · {daysAgo(date)}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {score > 0 && (
            <span style={{ fontSize:'0.73rem', fontWeight:800, padding:'4px 12px', borderRadius:99, background:bg, color:col, border:`1px solid ${col}28` }}>
              {scoreLabel(score)} ({score})
            </span>
          )}
          {flagged && (
            <span style={{ fontSize:'0.6rem', fontWeight:800, padding:'3px 8px', borderRadius:99, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>⚠️ ALERT</span>
          )}
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <MetricBar label="Energy"   value={energyV} lowIsBetter={false}/>
        <MetricBar label="Sleep"    value={sleepV}  lowIsBetter={false}/>
        <MetricBar label="Soreness" value={sorV}    lowIsBetter={true}/>
        {stressV != null && <MetricBar label="Stress" value={stressV} lowIsBetter={true}/>}
        {log.notes && (
          <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(99,102,241,.05)', borderRadius:8, border:'1px solid rgba(99,102,241,.1)', fontSize:'0.75rem', color:'var(--text-secondary)', fontStyle:'italic' }}>
            &ldquo;{log.notes}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ParentHealthPage() {
  const [allLogs, setAllLogs] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      healthApi.getHealthLogs().catch(() => [] as HealthEntry[]),
      healthApi.getHealthAlerts().catch(() => [] as HealthEntry[]),
    ]).then(([logs, alts]: [HealthEntry[], HealthEntry[]]) => {
      // Merge and de-duplicate by id, prefer full log history
      const seen  = new Set<string>();
      const merged: HealthEntry[] = [];
      for (const l of [...logs, ...alts]) {
        if (!seen.has(l.id)) { seen.add(l.id); merged.push(l); }
      }
      merged.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
      setAllLogs(merged);
    }).finally(() => setLoading(false));
  }, []);

  const latestLog   = allLogs[0];
  const latestScore = latestLog?.overall_score ?? 0;
  const latestDate  = latestLog?.submitted_at;
  const streak      = useMemo(() => computeStreak(allLogs), [allLogs]);
  const avgScore    = allLogs.length ? Math.round(allLogs.reduce((a, l) => a + l.overall_score, 0) / allLogs.length) : 0;

  return (
    <div style={{ animation:'fadeUp .3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:'1.55rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.025em', lineHeight:1.2, margin:0 }}>
          Child&rsquo;s Wellness
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginTop:5 }}>
          Health check-in history and wellness overview
        </p>
      </div>

      {/* ── Latest snapshot hero ─────────────────────────────────── */}
      {!loading && latestLog && (
        <div style={{ marginBottom:20, borderRadius:20, padding:'22px 26px',
          background:latestScore < 40 ? 'linear-gradient(135deg,#FFF5F5,#FFFBF5)' : latestScore >= 70 ? 'linear-gradient(135deg,#F0FDF4,#FFFBF5)' : 'linear-gradient(135deg,#FFFBEB,#FFF 60%)',
          border:`1.5px solid ${latestScore < 40 ? '#FECACA' : latestScore >= 70 ? '#A7F3D0' : '#FDE68A'}`,
          boxShadow:'0 4px 20px rgba(0,0,0,.05)' }}>
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
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:99, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.8rem', fontWeight:700 }}>
                  ⚠️ Wellness score is low — consider checking in with the coach
                </div>
              )}
              {latestScore >= 70 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:99, background:'#ECFDF5', border:'1px solid #A7F3D0', color:'#059669', fontSize:'0.8rem', fontWeight:700 }}>
                  ✓ Your child is feeling well
                </div>
              )}
              {latestScore >= 40 && latestScore < 70 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:99, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#D97706', fontSize:'0.8rem', fontWeight:700 }}>
                  ℹ️ Wellness is moderate — monitor closely
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI row ─────────────────────────────────────────────── */}
      {!loading && allLogs.length > 0 && (
        <div className="pg4" style={{ marginBottom:20 }}>
          <KpiCard label="Wellness Score"  value={latestScore > 0 ? `${latestScore}` : '—'} icon="💚" color={latestScore >= 70 ? '#059669' : latestScore >= 40 ? '#D97706' : '#DC2626'}/>
          <KpiCard label="Avg Score"       value={avgScore > 0 ? `${avgScore}` : '—'}         icon="📊" color="#6366F1"/>
          <KpiCard label="Total Check-ins" value={allLogs.length}                              icon="📋" color="#7C3AED"/>
          <KpiCard label="Day Streak"      value={streak > 0 ? `${streak}d` : '—'}            icon="🔥" color={streak >= 7 ? '#059669' : streak >= 3 ? '#D97706' : '#7C3AED'}/>
        </div>
      )}

      {/* ── Wellness Trend Chart ─────────────────────────────────── */}
      {!loading && allLogs.length > 0 && (
        <div className="pc" style={{ marginBottom:20 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:800, fontSize:'0.92rem', color:'var(--text-primary)' }}>Wellness Trend</div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>Score history · {allLogs.length} entries</div>
            </div>
            {avgScore > 0 && (
              <span style={{ fontSize:'0.7rem', fontWeight:800, padding:'3px 10px', borderRadius:99, background:`${scoreColor(avgScore)}10`, color:scoreColor(avgScore), border:`1px solid ${scoreColor(avgScore)}22` }}>
                Avg {avgScore}
              </span>
            )}
          </div>
          <div style={{ padding:'16px 20px' }}>
            <WellnessTrendChart logs={allLogs}/>
          </div>
        </div>
      )}

      {/* ── Log history ─────────────────────────────────────────── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h2 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>Wellness History</h2>
          {allLogs.length > 0 && <span style={{ fontSize:'0.76rem', color:'var(--text-muted)' }}>{allLogs.length} entries</span>}
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:130, borderRadius:16 }}/>)}
          </div>
        ) : !allLogs.length ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 32px', textAlign:'center', background:'linear-gradient(135deg,#F8FAFC,#FFFBEB)', borderRadius:20, border:'1px solid #FDE68A' }}>
            <div style={{ fontSize:'3rem', marginBottom:14 }}>❤️</div>
            <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text-primary)', marginBottom:8 }}>No wellness check-ins yet</div>
            <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', maxWidth:300, margin:0, lineHeight:1.6 }}>
              Once your child completes a wellness check-in, you&rsquo;ll see their health data here.
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {allLogs.map(log => <HealthLogCard key={log.id} log={log}/>)}
          </div>
        )}
      </div>

      {/* ── Info footer ─────────────────────────────────────────── */}
      <div style={{ marginTop:20, padding:'12px 16px', borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:'1rem', flexShrink:0 }}>ℹ️</span>
        <p style={{ fontSize:'0.73rem', color:'var(--text-muted)', margin:0, lineHeight:1.6 }}>
          Wellness scores are submitted by your child before training. Scores below 40 trigger an alert. Contact the coach if you have concerns about your child&rsquo;s welfare.
        </p>
      </div>
    </div>
  );
}
