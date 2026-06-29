'use client';

import { useState, useEffect, useMemo } from 'react';
import { coachApi, healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp {
    from{ opacity:0; transform:translateY(12px); }
    to  { opacity:1; transform:translateY(0); }
  }
  @keyframes scaleIn {
    from{ opacity:0; transform:scale(.96); }
    to  { opacity:1; transform:scale(1); }
  }
  .hc {
    background:var(--bg-surface);
    border:1px solid var(--border-subtle);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.04);
    transition:box-shadow .2s;
  }
  .hc:hover { box-shadow:0 4px 32px rgba(0,0,0,.08); }

  .hk {
    background:var(--bg-surface);
    border-radius:18px;
    padding:18px 16px;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03);
    transition:box-shadow .2s,transform .2s,border-color .15s;
    cursor:pointer;
    text-align:left;
    width:100%;
    border:1.5px solid var(--border-subtle);
  }
  .hk:hover { box-shadow:0 8px 28px rgba(0,0,0,.08); transform:translateY(-2px); }

  .hg5 { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
  .hg2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }

  @media(max-width:1100px){ .hg5 { grid-template-columns:repeat(3,1fr); } }
  @media(max-width:860px) {
    .hg5 { grid-template-columns:repeat(2,1fr); gap:10px; }
    .hg2 { grid-template-columns:1fr; }
  }
  @media(max-width:560px) {
    .hg5 { grid-template-columns:1fr 1fr; gap:8px; }
    .hk  { padding:14px 12px; }
  }
  @media(max-width:400px) {
    .hg5 { grid-template-columns:1fr; }
    .hg2 { grid-template-columns:1fr; }
  }

  /* Alert card — collapse to 2 rows on mobile */
  @media(max-width:640px){
    .alert-card       { flex-wrap:wrap; gap:10px; }
    .alert-card-chips { width:100%; flex:none; justify-content:flex-start; padding-left:66px; }
    .alert-card-date  { display:none; }
  }

  /* Table */
  .h-table { width:100%; border-collapse:collapse; }
  .h-table thead tr { background:var(--bg-elevated); }
  .h-table th {
    padding:10px 14px; text-align:left; font-size:.67rem; font-weight:700;
    text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted);
    border-bottom:1px solid var(--border-subtle); white-space:nowrap;
  }
  .h-table td { padding:0; border-bottom:1px solid var(--border-subtle); }
  .h-table tbody tr:last-child td { border-bottom:none; }
  .h-table tbody tr { transition:background .15s; }
  .h-table tbody tr:hover { filter:brightness(.97); }

  .h-tbl-wrap { overflow-x:auto; }
  @media(max-width:700px){
    .h-tbl-wrap { overflow-x:visible; }
    .h-table, .h-table thead, .h-table tbody, .h-table tr,
    .h-table th, .h-table td { display:block; }
    .h-table thead { display:none; }
    .h-table tbody tr {
      padding:14px 16px; border-bottom:none;
      border:1px solid var(--border-subtle); border-radius:14px;
      margin:0 0 8px;
    }
    .h-table td { padding:0; border:none; }
    .h-table td[data-label]:before {
      content:attr(data-label);
      display:inline-block; width:85px;
      font-size:.63rem; font-weight:700; text-transform:uppercase;
      letter-spacing:.06em; color:var(--text-muted); margin-right:6px;
    }
    .h-table td[data-label] { display:flex; align-items:center; padding:4px 0; }
    .h-table td:first-child { padding-bottom:8px; margin-bottom:4px; border-bottom:1px solid var(--border-subtle); }
    .h-table td:first-child:before { display:none; }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlayerHealth {
  id: string; first_name: string; last_name: string; email: string;
  teams: Array<{ id: string; name: string }>;
  latest_health?: {
    id?: string; energy?: number; sleep?: number; muscle_soreness?: number;
    stress?: number; overall_score?: number; submitted_at?: string; logged_at?: string;
    fatigue?: number; soreness?: number; sleep_quality?: number;
    is_flagged?: boolean; notes?: string;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysAgo(iso?: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; return `${d}d ago`;
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB',{ day:'numeric', month:'short' });
}
function initials(fn?: string, ln?: string) { return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase(); }

// Normalize raw backend fields to frontend scale (1=bad, 5=good)
// fatigue: 1=Energised,5=Exhausted → invert; sleep_quality: 1=Excellent,5=Terrible → invert
function normalizeHealth(h: PlayerHealth['latest_health']) {
  if (!h) return null;
  const energy   = h.energy   != null ? h.energy   : (h.fatigue       != null ? 6 - h.fatigue       : null);
  const sleep    = h.sleep    != null ? h.sleep    : (h.sleep_quality  != null ? 6 - h.sleep_quality  : null);
  const soreness = h.muscle_soreness ?? h.soreness ?? null;
  return { energy, sleep, soreness };
}

function healthLevel(h: PlayerHealth['latest_health']) {
  if (!h) return 'unknown';
  if (h.is_flagged) return 'flagged';
  const score = h.overall_score ?? 0;
  if (score > 0) { if (score >= 70) return 'good'; if (score >= 50) return 'moderate'; return 'poor'; }
  const n = normalizeHealth(h);
  if (!n || n.energy == null || n.sleep == null || n.soreness == null) return 'unknown';
  const avg = (n.energy + n.sleep + (6 - n.soreness)) / 3;
  if (avg >= 4) return 'good'; if (avg >= 3) return 'moderate'; return 'poor';
}

function computeScore(h: PlayerHealth['latest_health']): number | null {
  if (!h) return null;
  if (h.overall_score && h.overall_score > 0) return h.overall_score;
  const n = normalizeHealth(h);
  if (!n || n.energy == null || n.sleep == null || n.soreness == null) return null;
  const ePct = Math.round(((n.energy - 1) / 4) * 100);
  const sPct = Math.round(((n.sleep - 1) / 4) * 100);
  const rPct = Math.round(((5 - n.soreness) / 4) * 100);
  return Math.round((ePct + sPct + rPct) / 3);
}

const STATUS = {
  flagged:  { label:'Flagged',    color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  poor:     { label:'Needs Rest', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  moderate: { label:'Moderate',   color:'#6366F1', bg:'#EEF2FF', border:'#C7D2FE' },
  good:     { label:'Optimal',    color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  unknown:  { label:'No Data',    color:'#94A3B8', bg:'#F8FAFC', border:'#E2E8F0' },
};

function scoreColor(s: number) { return s >= 70 ? '#059669' : s >= 40 ? '#D97706' : '#DC2626'; }

// ── Mini score ring ────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size / 2) - 5, circ = 2 * Math.PI * r;
  const dash = circ - (score / 100) * circ;
  const c = scoreColor(score);
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', position:'absolute', inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${c}20`} strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1s ease', filter:`drop-shadow(0 0 3px ${c}60)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize: size < 50 ? '0.62rem' : '0.75rem', fontWeight:900, color:c, lineHeight:1 }}>{score}</span>
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ first, last, level, size = 38 }: { first?: string; last?: string; level: string; size?: number }) {
  const cfg = STATUS[level as keyof typeof STATUS] ?? STATUS.unknown;
  const ins  = initials(first, last);
  const hue  = ((first?.charCodeAt(0) ?? 0) + (last?.charCodeAt(0) ?? 0)) % 4;
  const pals = ['#7C3AED','#0891B2','#0D9488','#D97706'];
  const bg   = pals[hue];
  return (
    <div style={{ width:size+6, height:size+6, borderRadius:'50%', flexShrink:0, padding:3, background:cfg.color, boxShadow:`0 0 0 2px ${cfg.color}28` }}>
      <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:`${bg}18`, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.68rem', fontWeight:900, color:bg }}>
        {ins || '?'}
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, count, total, color, iconBg, icon, description, isActive, onClick }: {
  label: string; count: number; total: number | null; color: string;
  iconBg: string; icon: string; description: string; isActive: boolean; onClick: () => void;
}) {
  const pct = total && total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button onClick={onClick} className="hk"
      style={{ border:`1.5px solid ${isActive ? color : 'var(--border-subtle)'}`,
        background:isActive ? `linear-gradient(145deg,${color}08,${color}04)` : 'var(--bg-surface)',
        boxShadow:isActive ? `0 6px 28px ${color}18` : undefined } as React.CSSProperties}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>{icon}</div>
        {total != null && total > 0 && (
          <div style={{ fontSize:'0.6rem', fontWeight:800, padding:'2px 7px', borderRadius:7,
            background:isActive ? `${color}12` : 'var(--bg-elevated)',
            border:`1px solid ${isActive ? `${color}22` : 'var(--border-subtle)'}`,
            color:isActive ? color : 'var(--text-muted)' }}>{pct}%</div>
        )}
      </div>
      <div style={{ fontSize:'2rem', fontWeight:900, lineHeight:1, letterSpacing:'-0.04em', marginBottom:2, color:isActive ? color : count > 0 ? color : 'var(--text-muted)' }}>{count}</div>
      <div style={{ fontSize:'0.73rem', fontWeight:700, marginBottom:8, color:isActive ? color : 'var(--text-secondary)' }}>{label}</div>
      {total != null && total > 0 ? (
        <div style={{ height:3, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden', marginBottom:7 }}>
          <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background:`linear-gradient(90deg,${color}80,${color})`, transition:'width .9s' }}/>
        </div>
      ) : <div style={{ height:3, borderRadius:99, background:'var(--bg-elevated)', marginBottom:7 }}/>}
      <div style={{ fontSize:'0.64rem', color:'var(--text-muted)', lineHeight:1.4 }}>{description}</div>
    </button>
  );
}

// ── Status Breakdown Chart ─────────────────────────────────────────────────────
function StatusBreakdown({ counts, total }: {
  counts: { flagged:number; moderate:number; good:number; nodata:number }; total: number;
}) {
  const rows = [
    { key:'flagged',  label:'Flagged / Low',    count:counts.flagged,   color:'#DC2626', icon:'🔴' },
    { key:'moderate', label:'Needs Attention',  count:counts.moderate,  color:'#D97706', icon:'🟡' },
    { key:'good',     label:'Optimal',          count:counts.good,      color:'#059669', icon:'🟢' },
    { key:'nodata',   label:'No Data',          count:counts.nodata,    color:'#94A3B8', icon:'⚪' },
  ];
  return (
    <div className="hc" style={{ padding:0 }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)' }}>
        <div style={{ fontWeight:800, fontSize:'0.92rem', color:'var(--text-primary)' }}>Team Health Status</div>
        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>{total} players · latest check-in</div>
      </div>
      <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {rows.map(row => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.key}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:row.color, boxShadow:`0 0 5px ${row.color}60`, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)' }}>{row.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'0.75rem', fontWeight:900, color:row.color, fontFamily:'var(--font-mono)', minWidth:14, textAlign:'right' }}>{row.count}</span>
                  <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', minWidth:30, textAlign:'right' }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height:6, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, minWidth: row.count > 0 ? 6 : 0,
                  background:`linear-gradient(90deg,${row.color}80,${row.color})`,
                  boxShadow:`0 0 6px ${row.color}44`, transition:'width 1.1s cubic-bezier(.4,0,.2,1)' }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Team Wellness Trend Chart ──────────────────────────────────────────────────
function WellnessTrend({ logs }: { logs: HealthEntry[] }) {
  const dailyData = useMemo(() => {
    const map: Record<string, number[]> = {};
    logs.forEach(l => {
      const day = l.submitted_at.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(l.overall_score);
    });
    return Object.entries(map)
      .map(([date, scores]) => ({ date, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [logs]);

  const W = 400, H = 90;
  const hasData = dailyData.length >= 2;
  const pts = hasData ? dailyData.map((d, i) => ({
    x: (i / (dailyData.length - 1)) * W,
    y: 8 + ((100 - d.avg) / 100) * (H - 16),
    avg: d.avg, date: d.date,
  })) : [];
  const line   = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area   = `${line} L${W},${H} L0,${H} Z`;
  const avgAll = dailyData.length ? Math.round(dailyData.reduce((a, d) => a + d.avg, 0) / dailyData.length) : 0;
  const trendColor = avgAll >= 70 ? '#059669' : avgAll >= 40 ? '#D97706' : '#DC2626';

  return (
    <div className="hc" style={{ padding:0 }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'0.92rem', color:'var(--text-primary)' }}>Wellness Trend</div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>Team daily average · last {dailyData.length} log days</div>
        </div>
        {avgAll > 0 && (
          <span style={{ fontSize:'0.72rem', fontWeight:800, padding:'3px 10px', borderRadius:99, background:`${trendColor}10`, color:trendColor, border:`1px solid ${trendColor}22` }}>
            Avg {avgAll}
          </span>
        )}
      </div>
      <div style={{ padding:'18px 20px' }}>
        {!hasData ? (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ fontSize:'2rem', marginBottom:8 }}>📈</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
              {logs.length === 0 ? 'No wellness logs yet' : 'Need 2+ log days to show trend'}
            </div>
          </div>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display:'block', marginBottom:8 }}>
              <defs>
                <linearGradient id="wt-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity="0.22"/>
                  <stop offset="100%" stopColor={trendColor} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={area} fill="url(#wt-grad)"/>
              <path d={line} fill="none" stroke={trendColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.5 : 2.5}
                  fill="var(--bg-surface)" stroke={trendColor} strokeWidth="2"
                  style={i === pts.length - 1 ? { filter:`drop-shadow(0 0 4px ${trendColor})` } : {}}/>
              ))}
            </svg>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{fmtDateShort(dailyData[0].date)}</span>
              <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{fmtDateShort(dailyData[dailyData.length - 1].date)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Alert Card ─────────────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: HealthEntry }) {
  const [hov, setHov] = useState(false);
  const firstName = alert.users?.first_name ?? '';
  const lastName  = alert.users?.last_name ?? '';
  const name      = `${firstName} ${lastName}`.trim() || `Player #${alert.player_id.slice(0, 8)}`;
  const score     = alert.overall_score;
  const c         = scoreColor(score);

  const metrics = [
    { label:'Energy',   v:alert.energy,          low:false },
    { label:'Soreness', v:alert.muscle_soreness, low:true  },
    { label:'Sleep',    v:alert.sleep,           low:false },
  ].filter(s => s.v != null);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="alert-card"
      style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14,
        background:hov ? 'rgba(220,38,38,.06)' : 'rgba(220,38,38,.03)',
        border:'1px solid rgba(220,38,38,.14)', borderLeft:'4px solid #DC2626', transition:'all .2s' }}>

      {/* Score ring */}
      <ScoreRing score={score} size={52}/>

      {/* Avatar + name */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
          background:'linear-gradient(135deg,#EF444420,#F9731618)',
          border:'2px solid rgba(239,68,68,.25)', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:'0.82rem', fontWeight:900, color:'#EF4444' }}>
          {initials(firstName, lastName) || '?'}
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontWeight:800, fontSize:'0.88rem', color:'#7F1D1D' }}>{name}</span>
            <span style={{ fontSize:'0.58rem', fontWeight:800, padding:'2px 6px', borderRadius:99,
              background:'rgba(220,38,38,.1)', color:'#DC2626', border:'1px solid rgba(220,38,38,.2)' }}>ALERT</span>
          </div>
          <div style={{ fontSize:'0.7rem', color:'#B45309', marginTop:2 }}>Low score · {daysAgo(alert.submitted_at)}</div>
        </div>
      </div>

      {/* Metric chips */}
      <div className="alert-card-chips" style={{ flex:1, display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
        {metrics.map(s => {
          const pct = s.low ? (1 - ((s.v as number) - 1) / 4) * 100 : (((s.v as number) - 1) / 4) * 100;
          const mc  = pct >= 65 ? '#059669' : pct >= 35 ? '#D97706' : '#DC2626';
          return (
            <div key={s.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:54 }}>
              <span style={{ fontSize:'0.62rem', color:'#78350F', fontWeight:600 }}>{s.label}</span>
              <div style={{ height:4, width:52, borderRadius:99, background:'rgba(0,0,0,.06)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(s.v as number / 5) * 100}%`, borderRadius:99,
                  background:`linear-gradient(90deg,${mc}80,${mc})`, transition:'width .8s ease' }}/>
              </div>
              <span style={{ fontSize:'0.7rem', fontWeight:800, color:mc, fontFamily:'var(--font-mono)' }}>{s.v}/5</span>
            </div>
          );
        })}
      </div>

      {/* Date */}
      <div className="alert-card-date" style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#92400E' }}>{fmtDate(alert.submitted_at)}</div>
        {alert.notes && (
          <div style={{ fontSize:'0.65rem', color:'#A16207', marginTop:4, fontStyle:'italic', maxWidth:130,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            &ldquo;{alert.notes}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ── Metric mini bar (table column) ────────────────────────────────────────────
function MetricCell({ value, lowIsBetter = false }: { value?: number | null; lowIsBetter?: boolean }) {
  if (value == null) return <span style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>—</span>;
  const hp    = lowIsBetter ? (1 - (value - 1) / 4) * 100 : ((value - 1) / 4) * 100;
  const color = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <span style={{ fontSize:'0.82rem', fontWeight:800, color, fontFamily:'var(--font-mono)' }}>
        {value}<span style={{ fontSize:'0.55rem', opacity:.6 }}>/5</span>
      </span>
      <div style={{ width:44, height:4, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ width:`${(value / 5) * 100}%`, height:'100%', borderRadius:99,
          background:`linear-gradient(90deg,${color}88,${color})`, transition:'width .7s ease' }}/>
      </div>
    </div>
  );
}

// ── Player Row ─────────────────────────────────────────────────────────────────
function PlayerRow({ player }: { player: PlayerHealth }) {
  const h     = player.latest_health;
  const level = healthLevel(h);
  const cfg   = STATUS[level as keyof typeof STATUS] ?? STATUS.unknown;
  const date  = h?.logged_at ?? h?.submitted_at;
  const norm  = normalizeHealth(h);
  const energyV = norm?.energy ?? null;
  const sleepV  = norm?.sleep  ?? null;
  const sorV    = norm?.soreness ?? null;
  const score   = computeScore(h);

  const rowBg = level === 'flagged' ? 'rgba(220,38,38,.04)'
              : level === 'poor'    ? 'rgba(217,119,6,.04)'
              : level === 'moderate'? 'rgba(99,102,241,.03)'
              : level === 'good'    ? 'rgba(5,150,105,.03)'
              : 'transparent';

  return (
    <tr style={{ background:rowBg }}>
      <td data-label="" style={{ padding:'12px 16px 12px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar first={player.first_name} last={player.last_name} level={level} size={32}/>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>{player.first_name} {player.last_name}</div>
            <div style={{ fontSize:'0.66rem', color:'var(--text-muted)', marginTop:1 }}>{player.email}</div>
          </div>
        </div>
      </td>
      <td data-label="Teams" style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {(player.teams ?? []).length ? player.teams.map(t => (
            <span key={t.id} style={{ fontSize:'0.63rem', fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#EEF2FF', color:'#4338CA', border:'1px solid #C7D2FE' }}>{t.name}</span>
          )) : <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>—</span>}
        </div>
      </td>
      <td data-label="Last Check-in" style={{ padding:'12px 14px' }}>
        {h ? <span style={{ fontSize:'0.77rem', color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>{daysAgo(date)}</span>
           : <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>No data</span>}
      </td>
      <td data-label="Score" style={{ padding:'12px 14px', textAlign:'center' }}>
        {score != null
          ? <ScoreRing score={score} size={40}/>
          : <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>—</span>}
      </td>
      <td data-label="Energy"   style={{ padding:'12px 14px', textAlign:'center' }}><MetricCell value={energyV}  lowIsBetter={false}/></td>
      <td data-label="Soreness" style={{ padding:'12px 14px', textAlign:'center' }}><MetricCell value={sorV}     lowIsBetter={true}/></td>
      <td data-label="Sleep"    style={{ padding:'12px 14px', textAlign:'center' }}><MetricCell value={sleepV}   lowIsBetter={false}/></td>
      <td data-label="Status"   style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:cfg.color, boxShadow:`0 0 0 3px ${cfg.color}22` }}/>
          <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'3px 9px', borderRadius:99, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CoachHealthPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [alerts,  setAlerts]  = useState<HealthEntry[]>([]);
  const [players, setPlayers] = useState<PlayerHealth[]>([]);
  const [allLogs, setAllLogs] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch(() => [] as HealthEntry[]),
      coachApi.getPlayers().catch(() => []),
      healthApi.getHealthLogs().catch(() => [] as HealthEntry[]),
    ]).then(([alts, pls, logs]: [any, any, any]) => {
      setAlerts(Array.isArray(alts)  ? alts  : (alts?.alerts  ?? []));
      setPlayers(Array.isArray(pls)  ? pls   : (pls?.players  ?? []));
      setAllLogs(Array.isArray(logs) ? logs  : (logs?.logs    ?? []));
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const flaggedCount   = players.filter(p => healthLevel(p.latest_health) === 'flagged').length;
  const moderateCount  = players.filter(p => { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }).length;
  const goodCount      = players.filter(p => healthLevel(p.latest_health) === 'good').length;
  const noDataCount    = players.filter(p => !p.latest_health).length;

  const filtered = players.filter(p => {
    if (statusFilter === 'all')      return true;
    if (statusFilter === 'flagged')  return healthLevel(p.latest_health) === 'flagged';
    if (statusFilter === 'no-data')  return !p.latest_health;
    if (statusFilter === 'good')     return healthLevel(p.latest_health) === 'good';
    if (statusFilter === 'moderate') { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }
    return true;
  });

  const kpis = [
    { label:'Total Players',   count:players.length,  color:'#7C3AED', iconBg:'rgba(124,58,237,.12)', icon:'👥', filter:'all',      total:null,           description:'Active roster members'   },
    { label:'Flagged / Low',   count:flaggedCount,    color:'#DC2626', iconBg:'rgba(220,38,38,.12)',  icon:'🚨', filter:'flagged',  total:players.length, description:'Wellness score ≤ 40'      },
    { label:'Needs Attention', count:moderateCount,   color:'#D97706', iconBg:'rgba(217,119,6,.12)',  icon:'⚡', filter:'moderate', total:players.length, description:'Moderate concern'          },
    { label:'Optimal',         count:goodCount,       color:'#059669', iconBg:'rgba(5,150,105,.12)',  icon:'✅', filter:'good',     total:players.length, description:'Healthy & ready to train' },
    { label:'No Data',         count:noDataCount,     color:'#94A3B8', iconBg:'rgba(148,163,184,.12)',icon:'📊', filter:'no-data',  total:players.length, description:'Awaiting check-in'        },
  ];

  return (
    <div style={{ animation:'fadeUp .3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      {/* ── Cliniva Hero ─────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#7C3AED,#EC4899)', borderRadius:20, padding:'28px 32px', marginBottom:28, position:'relative', overflow:'hidden', boxShadow:'0 8px 32px rgba(124,58,237,0.30)' }}>
        <div style={{ position:'absolute', right:-40, top:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:100, bottom:-60, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Coach</div>
            <h1 style={{ fontSize:'clamp(1.4rem,4vw,1.8rem)', fontWeight:900, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.03em', lineHeight:1.1 }}>Health Monitor</h1>
            <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.6)', margin:0 }}>Wellness intelligence across {players.length} player{players.length !== 1 ? 's' : ''}</p>
          </div>
          {flaggedCount > 0 && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.75rem', fontWeight:800, padding:'7px 16px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', backdropFilter:'blur(4px)', animation:'scaleIn .3s ease', flexShrink:0 }}>
              ⚠️ {flaggedCount} flagged
            </span>
          )}
        </div>
      </div>

      {/* ── KPI Cards (TOP) ────────────────────────────────────── */}
      <div className="hg5" style={{ marginBottom:20 }}>
        {kpis.map(k => (
          <KpiCard key={k.filter} label={k.label} count={k.count} total={k.total} color={k.color}
            iconBg={k.iconBg} icon={k.icon} description={k.description}
            isActive={statusFilter === k.filter} onClick={() => setStatusFilter(k.filter)}/>
        ))}
      </div>

      {/* ── Chart Row ──────────────────────────────────────────── */}
      {!loading && (
        <div className="hg2" style={{ marginBottom:20 }}>
          <StatusBreakdown counts={{ flagged:flaggedCount, moderate:moderateCount, good:goodCount, nodata:noDataCount }} total={players.length}/>
          <WellnessTrend logs={allLogs}/>
        </div>
      )}

      {/* ── Health Alerts ───────────────────────────────────────── */}
      {!loading && alerts.length > 0 && (
        <div style={{ marginBottom:20, borderRadius:18, background:'rgba(255,251,235,.7)', backdropFilter:'blur(8px)', border:'1px solid rgba(217,119,6,.14)', borderLeft:'4px solid #F59E0B', boxShadow:'0 4px 24px rgba(245,158,11,.07)', overflow:'hidden' }}>
          <div style={{ padding:'12px 20px', background:'linear-gradient(90deg,rgba(245,158,11,.08),transparent)', borderBottom:'1px solid rgba(217,119,6,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem' }}>⚠️</div>
              <div>
                <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#78350F' }}>Health Alerts</div>
                <div style={{ fontSize:'0.7rem', color:'#A16207', marginTop:1 }}>{alerts.length} player{alerts.length !== 1 ? 's' : ''} require attention</div>
              </div>
            </div>
            <span style={{ fontSize:'0.63rem', fontWeight:800, padding:'3px 10px', borderRadius:99, background:'rgba(220,38,38,.08)', color:'#DC2626', border:'1px solid rgba(220,38,38,.16)' }}>
              {alerts.length} ALERT{alerts.length !== 1 ? 'S' : ''}
            </span>
          </div>
          <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:9 }}>
            {alerts.slice(0, 5).map(a => <AlertCard key={a.id} alert={a}/>)}
            {alerts.length > 5 && (
              <div style={{ textAlign:'center', fontSize:'0.76rem', color:'#A16207', paddingTop:4, fontWeight:600 }}>
                +{alerts.length - 5} more alerts visible in the table below
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Player Table ─────────────────────────────────────────── */}
      <div className="hc" style={{ marginBottom:16 }}>
        <div style={{ padding:'14px 20px', background:'linear-gradient(90deg,rgba(99,102,241,.03),transparent)', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:'0.93rem', color:'var(--text-primary)', letterSpacing:'-0.015em' }}>Player Wellness</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>Latest check-in per player · {filtered.length} of {players.length} shown</div>
          </div>
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')} style={{ fontSize:'0.7rem', fontWeight:600, padding:'4px 12px', borderRadius:99, background:'var(--bg-elevated)', color:'var(--text-secondary)', border:'1px solid var(--border-default)', cursor:'pointer' }}>
              Clear filter ✕
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:56, borderRadius:12 }}/>)}
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ margin:16 }}>{error}</div>
        ) : !filtered.length ? (
          <div style={{ padding:'44px 24px', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📊</div>
            <div style={{ fontWeight:600, fontSize:'0.93rem', color:'var(--text-secondary)' }}>
              {statusFilter !== 'all' ? 'No players match this filter' : 'No players found'}
            </div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:6 }}>
              {statusFilter !== 'all' ? 'Try clearing the filter.' : 'No players rostered on your teams yet.'}
            </div>
          </div>
        ) : (
          <div className="h-tbl-wrap">
            <table className="h-table" style={{ minWidth:640 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft:20 }}>Player</th>
                  <th>Teams</th>
                  <th>Last Check-in</th>
                  <th style={{ textAlign:'center' }}>Score</th>
                  <th style={{ textAlign:'center' }}>Energy</th>
                  <th style={{ textAlign:'center' }}>Soreness</th>
                  <th style={{ textAlign:'center' }}>Sleep</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => <PlayerRow key={p.id} player={p}/>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Score legend ─────────────────────────────────────────── */}
      <div style={{ padding:'12px 16px', borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.14)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', flexShrink:0 }}>ℹ️</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'center', flex:1 }}>
          <div><div style={{ fontWeight:700, fontSize:'0.68rem', color:'var(--text-secondary)', marginBottom:1 }}>Energy &amp; Sleep</div><div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>1 = poor · 5 = excellent</div></div>
          <div style={{ width:1, height:24, background:'var(--border-subtle)' }}/>
          <div><div style={{ fontWeight:700, fontSize:'0.68rem', color:'var(--text-secondary)', marginBottom:1 }}>Soreness</div><div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>1 = none · 5 = very sore</div></div>
          <div style={{ width:1, height:24, background:'var(--border-subtle)' }}/>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            {[{ color:'#059669', label:'Healthy' }, { color:'#D97706', label:'Moderate concern' }, { color:'#DC2626', label:'High risk' }].map(({ color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:20, height:4, borderRadius:99, background:`linear-gradient(90deg,${color}80,${color})` }}/>
                <span style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
