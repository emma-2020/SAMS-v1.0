'use client';

import { useState, useEffect, useMemo } from 'react';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes critPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  .pc {
    background:var(--bg-surface);
    border:1px solid var(--border-subtle);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.04);
    transition:box-shadow .2s;
  }
  .pc:hover { box-shadow:0 4px 32px rgba(0,0,0,.08); }
  .htab {
    padding:8px 18px; border:none; background:none; cursor:pointer;
    font-size:0.85rem; font-weight:700; border-radius:99px;
    color:var(--text-muted); transition:all .18s; white-space:nowrap;
  }
  .htab.active { background:var(--bg-elevated); color:var(--text-primary); box-shadow:0 1px 4px rgba(0,0,0,.08); }
  .htab:hover:not(.active) { color:var(--text-secondary); }
  .mg2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .pg4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  @media(max-width:860px) { .pg4 { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:500px) { .mg2 { grid-template-columns:1fr; } .pg4 { grid-template-columns:1fr 1fr; } }
  @media(max-width:400px) { .pg4 { grid-template-columns:1fr; } .mg2 { grid-template-columns:1fr; } }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}
function fmtTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}
function daysAgo(iso?: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; return `${d}d ago`;
}
function scoreColor(s: number) { return s >= 70 ? '#059669' : s >= 40 ? '#D97706' : '#DC2626'; }
function scoreLabel(s: number) { return s >= 70 ? 'Good' : s >= 40 ? 'Moderate' : 'Low'; }
function scoreBg(s: number)   { return s >= 70 ? '#ECFDF5' : s >= 40 ? '#FFFBEB' : '#FEF2F2'; }

function computeStreak(logs: HealthEntry[]): number {
  if (!logs.length) return 0;
  const sorted  = [...logs].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  const todayMs = new Date().setHours(0, 0, 0, 0);
  let streak = 0, expected = todayMs;
  for (const log of sorted) {
    const dayMs = new Date(log.submitted_at).setHours(0, 0, 0, 0);
    if (dayMs === expected || dayMs === expected - 86400000) { streak++; expected = dayMs - 86400000; }
    else break;
  }
  return streak;
}

// ── Wellness Arc Gauge ─────────────────────────────────────────────────────────
// Animates needle from far-left (score=0) to actual score position on every mount.
function WellnessArcGauge({ score }: { score: number }) {
  const col   = scoreColor(score);
  const label = scoreLabel(score);
  const rA    = Math.round((score / 100) * 180); // score 0-100 → arc 0°-180°

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const toXY = (a: number) => ({
    x: 140 + 110 * Math.cos(Math.PI * (180 - a) / 180),
    y: 145 - 110 * Math.sin(Math.PI * (180 - a) / 180),
  });
  const seg = (a1: number, a2: number) => {
    const p1 = toXY(a1), p2 = toXY(a2);
    return `M ${p1.x.toFixed(1)},${p1.y.toFixed(1)} A 110,110 0 0,1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  };
  const needleDeg = animated ? rA - 90 : -90;

  return (
    <svg viewBox="0 0 280 170" width="100%" height={170} style={{ maxWidth:300, display:'block', margin:'0 auto' }}>
      {/* Background track */}
      <path d={seg(0,180)} fill="none" stroke="var(--bg-elevated)" strokeWidth={16} strokeLinecap="round"/>
      {/* Zone fills (faint) */}
      <path d={seg(0,60)}   fill="none" stroke="#DC2626" strokeWidth={12} strokeLinecap="round" opacity={0.2}/>
      <path d={seg(60,120)} fill="none" stroke="#D97706" strokeWidth={12} strokeLinecap="round" opacity={0.2}/>
      <path d={seg(120,180)} fill="none" stroke="#059669" strokeWidth={12} strokeLinecap="round" opacity={0.2}/>
      {/* Active fill up to score */}
      {rA > 0 && (
        <path d={seg(0, rA)} fill="none" stroke={col} strokeWidth={13} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 7px ${col}66)` }}/>
      )}
      {/* Zone labels */}
      <text x={24}  y={163} textAnchor="middle" fontSize={9} fontWeight={800} fill="#DC2626" opacity={0.85}>LOW</text>
      <text x={140} y={40}  textAnchor="middle" fontSize={9} fontWeight={800} fill="#D97706" opacity={0.85}>MOD</text>
      <text x={256} y={163} textAnchor="middle" fontSize={9} fontWeight={800} fill="#059669" opacity={0.85}>GOOD</text>
      {/* Score in center */}
      <text x={140} y={112} textAnchor="middle" fontSize={32} fontWeight={900} fill={col}>{score}</text>
      <text x={140} y={132} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-muted)" letterSpacing={1}>
        {label.toUpperCase()} · WELLNESS SCORE
      </text>
      {/* Animated needle */}
      <g style={{ transform:`rotate(${needleDeg}deg)`, transformOrigin:'140px 145px', transition:animated ? 'transform 1.3s cubic-bezier(.34,1.56,.64,1)' : 'none' }}>
        <line x1={140} y1={145} x2={140} y2={35} stroke={col} strokeWidth={2.5} strokeLinecap="round" opacity={0.8}/>
        <circle cx={140} cy={35} r={9} fill={col} stroke="var(--bg-surface)" strokeWidth={3}/>
      </g>
      <circle cx={140} cy={145} r={5} fill={col} stroke="var(--bg-surface)" strokeWidth={2}/>
    </svg>
  );
}

// ── Metric Card ────────────────────────────────────────────────────────────────
function MetricCard({ label, pct, rawVal, icon, color, desc }: {
  label:string; pct:number; rawVal:number; icon:string; color:string; desc:string;
}) {
  const critical = pct < 20;
  const low      = pct < 40;
  const dc       = critical ? '#DC2626' : low ? '#D97706' : color;
  const status   = pct >= 70 ? 'Optimal' : pct >= 40 ? 'Fair' : pct >= 20 ? 'Low' : 'Critical';
  return (
    <div className="pc" style={{ padding:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${dc}14`, border:`1px solid ${dc}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>{icon}</div>
          <div>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{desc}</div>
          </div>
        </div>
        <span style={{ fontSize:'0.6rem', fontWeight:800, padding:'3px 8px', borderRadius:99,
          background: critical ? '#FEF2F2' : low ? '#FFFBEB' : `${color}12`,
          color:dc, border:`1px solid ${dc}22`,
          animation: critical ? 'critPulse 2s infinite' : 'none' }}>
          {status}
        </span>
      </div>
      <div style={{ fontSize:'1.65rem', fontWeight:900, color:dc, letterSpacing:'-0.04em', lineHeight:1, marginBottom:8 }}>
        {pct}%
        <span style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', marginLeft:5 }}>{rawVal}/5</span>
      </div>
      <div style={{ height:7, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        {pct > 0 ? (
          <div style={{ width:`${Math.max(pct, 4)}%`, height:'100%', borderRadius:99,
            background: pct < 20
              ? 'repeating-linear-gradient(45deg,#DC2626,#DC2626 4px,#FEF2F2 4px,#FEF2F2 8px)'
              : `linear-gradient(90deg,${dc}80,${dc})`,
            boxShadow:`0 0 5px ${dc}44`, transition:'width .9s ease' }}/>
        ) : (
          <div style={{ width:'100%', height:'100%', background:'repeating-linear-gradient(45deg,#DC262620,#DC262620 4px,transparent 4px,transparent 8px)', borderRadius:99 }}/>
        )}
      </div>
    </div>
  );
}

// ── KPI Stat Card ──────────────────────────────────────────────────────────────
function KpiStat({ label, value, icon, color }: { label:string; value:string|number; icon:string; color:string }) {
  return (
    <div className="pc" style={{ padding:'16px 14px', textAlign:'center' }}>
      <div style={{ width:38, height:38, borderRadius:10, background:`${color}12`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.05rem', margin:'0 auto 8px' }}>{icon}</div>
      <div style={{ fontSize:'1.3rem', fontWeight:900, color, letterSpacing:'-0.03em', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
    </div>
  );
}

// ── Trend Chart ────────────────────────────────────────────────────────────────
function TrendChart({ logs }: { logs: HealthEntry[] }) {
  const data = useMemo(() =>
    [...logs].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
      .map(l => ({ date: l.submitted_at, score: l.overall_score })),
    [logs]);

  const W = 400, H = 96;
  if (data.length < 2) return (
    <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:'0.8rem' }}>
      {data.length === 0 ? 'No data yet' : 'Log at least 2 check-ins to see the trend'}
    </div>
  );

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: 12 + ((100 - d.score) / 100) * (H - 24),
    score: d.score, date: d.date,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const tc   = scoreColor(data[data.length - 1].score);

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display:'block', marginBottom:8 }}>
        <defs>
          <linearGradient id="pwt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tc} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={tc} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pwt-grad)"/>
        <path d={line} fill="none" stroke={tc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3}
              fill="var(--bg-surface)" stroke={scoreColor(p.score)} strokeWidth="2"
              style={i === pts.length - 1 ? { filter:`drop-shadow(0 0 5px ${tc})` } : {}}/>
            {(i === 0 || i === pts.length - 1) && (
              <text x={p.x} y={p.y - 8}
                textAnchor={i === pts.length - 1 && pts.length > 2 ? 'end' : 'middle'}
                fontSize={9} fill={scoreColor(p.score)} fontWeight={700}>{p.score}</text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{fmtDateShort(data[0].date)}</span>
        <span style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{fmtDateShort(data[data.length-1].date)}</span>
      </div>
    </>
  );
}

// ── History Card ───────────────────────────────────────────────────────────────
function HistoryCard({ log }: { log: HealthEntry }) {
  const score   = log.overall_score ?? 0;
  const flagged = log.is_flagged || score < 40;
  const col     = scoreColor(score);
  const bg      = scoreBg(score);

  const rawE  = log.energy           ?? null;
  const rawSl = log.sleep            ?? null;
  const rawSo = log.muscle_soreness  ?? null;
  const rawSt = log.stress           ?? null;

  const pctE  = rawE  != null ? Math.round(((rawE  - 1) / 4) * 100) : null;
  const pctSl = rawSl != null ? Math.round(((rawSl - 1) / 4) * 100) : null;
  const pctSo = rawSo != null ? Math.round(((5 - rawSo) / 4) * 100) : null;
  const pctSt = rawSt != null ? Math.round(((5 - rawSt) / 4) * 100) : null;

  const mc = (pct: number | null) =>
    pct == null ? 'var(--text-muted)' : pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626';

  const metrics = [
    { icon:'⚡', label:'Energy',   pct:pctE  },
    { icon:'💤', label:'Sleep',    pct:pctSl },
    { icon:'💪', label:'Soreness', pct:pctSo },
    { icon:'🧘', label:'Stress',   pct:pctSt },
  ].filter(m => m.pct != null);

  return (
    <div style={{
      background: flagged ? 'linear-gradient(135deg,#FFF5F5,#FFFBF5)' : 'var(--bg-surface)',
      border:`1.5px solid ${flagged ? '#FECACA' : 'var(--border-subtle)'}`,
      borderLeft:`5px solid ${col}`,
      borderRadius:16, overflow:'hidden',
    }}>
      {/* Header row */}
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Circular score badge */}
          <div style={{ width:46, height:46, borderRadius:'50%', background:bg, border:`2.5px solid ${col}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:'0.95rem', fontWeight:900, color:col, lineHeight:1 }}>{score}</span>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>{fmtDate(log.submitted_at)}</div>
            <div style={{ fontSize:'0.67rem', color:'var(--text-muted)', marginTop:1 }}>
              Logged at {fmtTime(log.submitted_at)} · {daysAgo(log.submitted_at)}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.72rem', fontWeight:800, padding:'4px 12px', borderRadius:99, background:bg, color:col, border:`1px solid ${col}28` }}>
            {scoreLabel(score)} ({score})
          </span>
          {flagged && (
            <span style={{ fontSize:'0.6rem', fontWeight:800, padding:'3px 8px', borderRadius:99, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>
              ⚠️ ALERT
            </span>
          )}
        </div>
      </div>

      {/* Metric pills */}
      {metrics.length > 0 && (
        <div style={{ padding:'0 16px 14px', display:'flex', gap:7, flexWrap:'wrap' }}>
          {metrics.map(m => (
            <div key={m.label} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:99, background:`${mc(m.pct)}12`, border:`1px solid ${mc(m.pct)}22` }}>
              <span style={{ fontSize:'0.75rem' }}>{m.icon}</span>
              <span style={{ fontSize:'0.67rem', fontWeight:600, color:'var(--text-secondary)' }}>{m.label}</span>
              <span style={{ fontSize:'0.72rem', fontWeight:900, color:mc(m.pct), fontFamily:'var(--font-mono)' }}>{m.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {log.notes && (
        <div style={{ margin:'0 16px 14px', padding:'8px 12px', background:'rgba(99,102,241,.05)', borderRadius:10, border:'1px solid rgba(99,102,241,.1)', fontSize:'0.74rem', color:'var(--text-secondary)', fontStyle:'italic' }}>
          &ldquo;{log.notes}&rdquo;
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ParentHealthPage() {
  const [allLogs, setAllLogs] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'Overview' | 'History'>('Overview');

  useEffect(() => {
    Promise.all([
      healthApi.getHealthLogs().catch(()   => [] as HealthEntry[]),
      healthApi.getHealthAlerts().catch(() => [] as HealthEntry[]),
    ]).then(([logs, alts]: [HealthEntry[], HealthEntry[]]) => {
      const seen = new Set<string>(), merged: HealthEntry[] = [];
      for (const l of [...logs, ...alts]) { if (!seen.has(l.id)) { seen.add(l.id); merged.push(l); } }
      merged.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
      setAllLogs(merged);
    }).finally(() => setLoading(false));
  }, []);

  const latest   = allLogs[0];
  const score    = latest?.overall_score ?? 0;
  const streak   = useMemo(() => computeStreak(allLogs), [allLogs]);
  const avgScore = allLogs.length
    ? Math.round(allLogs.reduce((a, l) => a + l.overall_score, 0) / allLogs.length)
    : 0;

  // Latest entry metric percentages
  const rawE  = latest?.energy            ?? null;
  const rawSl = latest?.sleep             ?? null;
  const rawSo = latest?.muscle_soreness   ?? null;
  const rawSt = latest?.stress            ?? null;
  const pctE  = rawE  != null ? Math.round(((rawE  - 1) / 4) * 100) : 50;
  const pctSl = rawSl != null ? Math.round(((rawSl - 1) / 4) * 100) : 50;
  const pctSo = rawSo != null ? Math.round(((5 - rawSo) / 4) * 100) : 50;
  const pctSt = rawSt != null ? Math.round(((5 - rawSt) / 4) * 100) : 50;

  const TABS = ['Overview', 'History'] as const;

  return (
    <div style={{ animation:'fadeUp .3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:'1.55rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.025em', lineHeight:1.2, margin:0 }}>
          Child&rsquo;s Wellness
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginTop:5 }}>
          Health check-in tracking and wellness insights
        </p>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg-surface)', padding:4, borderRadius:14, border:'1px solid var(--border-subtle)', boxShadow:'0 1px 3px rgba(0,0,0,.04)', maxWidth:'100%', overflowX:'auto', scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t} className={`htab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'Overview' && (
        <div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[170, 90, 200].map((h, i) => <div key={i} className="skeleton" style={{ height:h, borderRadius:20 }}/>)}
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
            <>
              {/* Wellness Arc Gauge hero */}
              <div className="pc" style={{ marginBottom:20, padding:'20px 24px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:'0.95rem', color:'var(--text-primary)' }}>Wellness Assessment</div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>
                      Latest check-in · {latest?.submitted_at
                        ? `${daysAgo(latest.submitted_at)}, ${fmtDate(latest.submitted_at)}`
                        : '—'}
                    </div>
                  </div>
                  <span style={{ fontSize:'0.72rem', fontWeight:800, padding:'4px 12px', borderRadius:99, background:scoreBg(score), color:scoreColor(score), border:`1px solid ${scoreColor(score)}28` }}>
                    {scoreLabel(score)}
                  </span>
                </div>

                {/* Gauge remounts on every Overview tab visit → animation replays */}
                <WellnessArcGauge score={score}/>

                {/* Alert strip */}
                {score < 40 && (
                  <div style={{ marginTop:12, padding:'10px 14px', borderRadius:12, background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'flex-start', gap:10 }}>
                    <span style={{ fontSize:'1.1rem', flexShrink:0 }}>⚠️</span>
                    <div>
                      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#DC2626' }}>Wellness score is low</div>
                      <div style={{ fontSize:'0.71rem', color:'#B91C1C', marginTop:2 }}>
                        Consider contacting your child&rsquo;s coach to discuss their wellbeing.
                      </div>
                    </div>
                  </div>
                )}
                {score >= 70 && (
                  <div style={{ marginTop:12, padding:'10px 14px', borderRadius:12, background:'#ECFDF5', border:'1px solid #A7F3D0', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:'1.1rem' }}>✅</span>
                    <span style={{ fontSize:'0.8rem', fontWeight:700, color:'#059669' }}>Your child is feeling well — great consistency!</span>
                  </div>
                )}
              </div>

              {/* 2×2 Metric Cards */}
              {latest && (
                <div className="mg2" style={{ marginBottom:20 }}>
                  <MetricCard label="Energy Level"  pct={pctE}  rawVal={rawE  ?? 3} icon="⚡" color="#D97706" desc="Vitality & stamina"/>
                  <MetricCard label="Sleep Quality" pct={pctSl} rawVal={rawSl ?? 3} icon="💤" color="#6D28D9" desc="Rest & recovery"/>
                  <MetricCard label="Soreness"      pct={pctSo} rawVal={rawSo ?? 3} icon="💪" color="#0891B2" desc="Muscle readiness"/>
                  <MetricCard label="Stress Level"  pct={pctSt} rawVal={rawSt ?? 3} icon="🧘" color="#059669" desc="Mental state"/>
                </div>
              )}

              {/* KPI stats row */}
              <div className="pg4" style={{ marginBottom:20 }}>
                <KpiStat label="Latest Score" value={score > 0 ? score : '—'} icon="💚" color={scoreColor(score)}/>
                <KpiStat label="Avg Score"    value={avgScore > 0 ? avgScore : '—'} icon="📊" color="#6366F1"/>
                <KpiStat label="Check-ins"    value={allLogs.length} icon="📋" color="#7C3AED"/>
                <KpiStat label="Day Streak"   value={streak > 0 ? `${streak}d` : '—'} icon="🔥" color={streak >= 7 ? '#059669' : '#D97706'}/>
              </div>

              {/* Trend chart */}
              {allLogs.length > 1 && (
                <div className="pc">
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
                    <TrendChart logs={allLogs}/>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          HISTORY TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'History' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>Wellness History</h2>
            {allLogs.length > 0 && (
              <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{allLogs.length} entries</span>
            )}
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:120, borderRadius:16 }}/>)}
            </div>
          ) : !allLogs.length ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 32px', textAlign:'center', background:'linear-gradient(135deg,#F8FAFC,#FFFBEB)', borderRadius:20, border:'1px solid #FDE68A' }}>
              <div style={{ fontSize:'3rem', marginBottom:14 }}>📋</div>
              <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text-primary)', marginBottom:8 }}>No entries yet</div>
              <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', maxWidth:280, margin:'0 auto', lineHeight:1.6 }}>
                Your child&rsquo;s wellness check-ins will appear here once they start logging.
              </p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {allLogs.map(log => <HistoryCard key={log.id} log={log}/>)}
            </div>
          )}

          {allLogs.length > 0 && (
            <div style={{ marginTop:16, padding:'11px 16px', borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:'1rem', flexShrink:0 }}>ℹ️</span>
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:0, lineHeight:1.6 }}>
                Wellness scores are submitted by your child before training. Scores below 40 trigger an alert. Contact the coach if you have concerns about your child&rsquo;s welfare.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
