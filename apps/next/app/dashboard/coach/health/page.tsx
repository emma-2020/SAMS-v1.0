'use client';

import { useState, useEffect } from 'react';
import { coachApi, healthApi } from '@sams/api';

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp {
    from{ opacity:0; transform:translateY(12px); }
    to  { opacity:1; transform:translateY(0); }
  }
  .cc {
    background:var(--bg-surface);
    border:1px solid var(--border-subtle);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.04);
    transition:box-shadow .2s;
  }
  .cc:hover { box-shadow:0 4px 32px rgba(0,0,0,.08); }
  .ck {
    background:var(--bg-surface);
    border-radius:18px;
    padding:20px 18px;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03);
    transition:box-shadow .2s,transform .2s,border-color .15s;
    cursor:pointer;
    text-align:left;
    width:100%;
    border:1.5px solid var(--border-subtle);
  }
  .ck:hover { box-shadow:0 8px 28px rgba(0,0,0,.08); transform:translateY(-2px); }
  .cg5 { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
  .cg2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }

  @media(max-width:1100px){ .cg5 { grid-template-columns:repeat(3,1fr); } }
  @media(max-width:860px) {
    .cg5 { grid-template-columns:repeat(2,1fr); gap:10px; }
    .cg2 { grid-template-columns:1fr; }
  }
  @media(max-width:560px) {
    .cg5 { grid-template-columns:1fr 1fr; gap:8px; }
    .ck  { padding:14px 12px; }
  }

  /* Table */
  .c-table { width:100%; border-collapse:collapse; }
  .c-table thead tr { background:var(--bg-elevated); }
  .c-table th {
    padding:10px 16px; text-align:left; font-size:.68rem; font-weight:700;
    text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted);
    border-bottom:1px solid var(--border-subtle); white-space:nowrap;
  }
  .c-table td { padding:0; border-bottom:1px solid var(--border-subtle); }
  .c-table tbody tr:last-child td { border-bottom:none; }
  .c-table tbody tr { transition:background .15s; }
  .c-table tbody tr:hover { background:var(--bg-elevated); }

  /* Mobile: cards instead of table */
  .player-table-wrap { overflow-x:auto; }
  @media(max-width:700px){
    .player-table-wrap { overflow-x:visible; }
    .c-table, .c-table thead, .c-table tbody, .c-table tr, .c-table th, .c-table td { display:block; }
    .c-table thead { display:none; }
    .c-table tbody tr {
      padding:14px 16px; border-bottom:none;
      border:1px solid var(--border-subtle); border-radius:14px;
      margin:0 0 8px; background:var(--bg-elevated); transition:box-shadow .15s;
    }
    .c-table tbody tr:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); background:var(--bg-surface); }
    .c-table td { padding:0; border:none; }
    .c-table td[data-label]:before {
      content:attr(data-label);
      display:inline-block; width:90px;
      font-size:.65rem; font-weight:700; text-transform:uppercase;
      letter-spacing:.06em; color:var(--text-muted); margin-right:8px;
    }
    .c-table td[data-label] { display:flex; align-items:center; padding:4px 0; }
    .c-table td:first-child { padding-bottom:8px; margin-bottom:4px; border-bottom:1px solid var(--border-subtle); }
    .c-table td:first-child:before { display:none; }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlayerHealth {
  id: string; first_name: string; last_name: string; email: string;
  teams: Array<{ id: string; name: string }>;
  latest_health?: {
    id?: string; energy?: number; sleep?: number; muscle_soreness?: number; stress?: number;
    overall_score?: number; submitted_at?: string; logged_at?: string;
    fatigue?: number; soreness?: number; sleep_quality?: number;
    is_flagged?: boolean; notes?: string;
  } | null;
}

interface HealthAlert {
  id: string; player_id: string; overall_score?: number;
  submitted_at?: string; notes?: string;
  users?: { first_name: string; last_name: string };
  energy?: number; sleep?: number; muscle_soreness?: number; stress?: number;
  fatigue?: number; soreness?: number; sleep_quality?: number; is_flagged?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysAgo(iso?: string): string | null {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; return `${d}d ago`;
}
function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' });
}
function initials(fn?: string, ln?: string) { return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase(); }

function healthLevel(h: PlayerHealth['latest_health']) {
  if (!h) return 'unknown';
  if (h.is_flagged) return 'flagged';
  const score = h.overall_score ?? 0;
  if (score > 0) { if (score >= 70) return 'good'; if (score >= 50) return 'moderate'; return 'poor'; }
  const energy   = h.energy ?? h.fatigue ?? 3;
  const sleep    = h.sleep  ?? h.sleep_quality ?? 3;
  const soreness = h.muscle_soreness ?? h.soreness ?? 3;
  const stress   = h.stress ?? 3;
  const avg = (energy + sleep + (6 - soreness) + (6 - stress)) / 4;
  if (avg >= 4) return 'good'; if (avg >= 3) return 'moderate'; return 'poor';
}

const LEVEL: Record<string,{ label:string; color:string; bg:string; border:string }> = {
  flagged:  { label:'Flagged',    color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  poor:     { label:'Needs Rest', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  moderate: { label:'Moderate',   color:'#6366F1', bg:'#EEF2FF', border:'#C7D2FE' },
  good:     { label:'Optimal',    color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  unknown:  { label:'No Data',    color:'#94A3B8', bg:'#F8FAFC', border:'#E2E8F0' },
};

// ── Player Avatar ──────────────────────────────────────────────────────────────
function Avatar({ first, last, level, size = 38 }: { first?: string; last?: string; level: string; size?: number }) {
  const cfg = LEVEL[level] ?? LEVEL.unknown;
  const ins  = initials(first, last);
  const hue  = ((first?.charCodeAt(0) ?? 0) + (last?.charCodeAt(0) ?? 0)) % 4;
  const palettes = ['#7C3AED','#0891B2','#0D9488','#D97706'];
  const bg = palettes[hue];
  return (
    <div style={{ width:size+6, height:size+6, borderRadius:'50%', flexShrink:0, padding:3, background:cfg.color, boxShadow:`0 0 0 2px ${cfg.color}28`, transition:'box-shadow .2s' }}>
      <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:`${bg}18`, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:900, color:bg }}>
        {ins}
      </div>
    </div>
  );
}

// ── Score bar ──────────────────────────────────────────────────────────────────
function ScoreBar({ value, lowIsBetter = false }: { value?: number | null; lowIsBetter?: boolean }) {
  if (value == null) return <span style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>—</span>;
  const hp    = lowIsBetter ? (1 - (value - 1) / 4) * 100 : ((value - 1) / 4) * 100;
  const color = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#DC2626';
  const fill  = (value / 5) * 100;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <span style={{ fontSize:'0.85rem', fontWeight:800, color, fontFamily:'var(--font-mono)', letterSpacing:'-0.02em' }}>
        {value}<span style={{ fontSize:'0.58rem', fontWeight:600, opacity:.65 }}>/5</span>
      </span>
      <div style={{ width:52, height:5, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ width:`${fill}%`, height:'100%', borderRadius:99, background:`linear-gradient(90deg,${color}88,${color})`, transition:'width .7s ease' }}/>
      </div>
    </div>
  );
}

// ── Alert row ──────────────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: HealthAlert }) {
  const [hov, setHov] = useState(false);
  const name    = `${alert.users?.first_name ?? ''} ${alert.users?.last_name ?? ''}`.trim() || `Player #${alert.player_id.slice(0,8)}`;
  const date    = alert.submitted_at;
  const metrics = [
    { label:'Energy',   v:alert.energy ?? alert.fatigue,               low:false },
    { label:'Soreness', v:alert.muscle_soreness ?? alert.soreness,     low:true  },
    { label:'Sleep',    v:alert.sleep ?? alert.sleep_quality,          low:false },
  ].filter(s => s.v != null);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderRadius:14,
        background:hov ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.04)',
        border:'1px solid rgba(217,119,6,.12)', borderLeft:'4px solid #F59E0B', transition:'all .2s' }}>
      <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:'linear-gradient(135deg,#EF444428,#F9731638)', border:'2px solid rgba(239,68,68,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:900, color:'#EF4444' }}>
        {initials(alert.users?.first_name, alert.users?.last_name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontWeight:800, fontSize:'0.9rem', color:'#78350F' }}>{name}</span>
          <span style={{ fontSize:'0.6rem', fontWeight:800, padding:'2px 7px', borderRadius:99, background:'rgba(239,68,68,.1)', color:'#DC2626', border:'1px solid rgba(239,68,68,.16)' }}>ALERT</span>
        </div>
        <div style={{ fontSize:'0.72rem', color:'#A16207', marginBottom:7 }}>Low wellness score · {daysAgo(date)}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {metrics.map(s => {
            const hp = s.low ? (1 - ((s.v as number) - 1) / 4) * 100 : (((s.v as number) - 1) / 4) * 100;
            const c  = hp >= 65 ? '#059669' : hp >= 35 ? '#D97706' : '#DC2626';
            return (
              <span key={s.label} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:99, fontSize:'0.7rem', background:`${c}10`, border:`1px solid ${c}20` }}>
                <span style={{ color:'#64748B' }}>{s.label}</span>
                <span style={{ fontWeight:800, color:c, fontFamily:'var(--font-mono)' }}>{s.v}/5</span>
              </span>
            );
          })}
          {alert.notes && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:'0.7rem', fontStyle:'italic', background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.14)', color:'#4338CA', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              &ldquo;{alert.notes}&rdquo;
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#92400E' }}>{fmtDate(date)}</div>
        <div style={{ fontSize:'0.65rem', color:'#A16207', marginTop:2 }}>Score: {alert.overall_score ?? '?'}</div>
      </div>
    </div>
  );
}

// ── Metric / filter card ───────────────────────────────────────────────────────
function MetricCard({ label, count, total, color, icon, description, isActive, onClick }: {
  label: string; count: number; total: number | null; color: string; icon: string;
  description: string; isActive: boolean; onClick: () => void;
}) {
  const pct = total && total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button onClick={onClick} className="ck"
      style={{ border:`1.5px solid ${isActive ? color : 'var(--border-subtle)'}`, background:isActive ? `linear-gradient(145deg,${color}08,${color}04)` : 'var(--bg-surface)', boxShadow:isActive ? `0 6px 28px ${color}18` : undefined } as React.CSSProperties}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:isActive ? `${color}18` : `${color}0E`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>{icon}</div>
        {total != null && total > 0 && (
          <div style={{ fontSize:'0.62rem', fontWeight:800, padding:'2px 7px', borderRadius:7, background:isActive ? `${color}12` : 'var(--bg-elevated)', border:`1px solid ${isActive ? `${color}22` : 'var(--border-subtle)'}`, color:isActive ? color : 'var(--text-muted)' }}>{pct}%</div>
        )}
      </div>
      <div style={{ fontSize:'2rem', fontWeight:900, lineHeight:1, letterSpacing:'-0.04em', marginBottom:3, color:isActive ? color : count > 0 ? color : 'var(--text-muted)' }}>{count}</div>
      <div style={{ fontSize:'0.77rem', fontWeight:700, marginBottom:10, color:isActive ? color : 'var(--text-secondary)' }}>{label}</div>
      {total != null && total > 0 ? (
        <div style={{ height:4, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden', marginBottom:9 }}>
          <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background:`linear-gradient(90deg,${color}80,${color})`, transition:'width .9s' }}/>
        </div>
      ) : <div style={{ height:4, borderRadius:99, background:'var(--bg-elevated)', marginBottom:9 }}/>}
      <div style={{ fontSize:'0.67rem', color:'var(--text-muted)', lineHeight:1.45 }}>{description}</div>
    </button>
  );
}

// ── Player row ─────────────────────────────────────────────────────────────────
function PlayerRow({ player }: { player: PlayerHealth }) {
  const h       = player.latest_health;
  const level   = healthLevel(h);
  const cfg     = LEVEL[level] ?? LEVEL.unknown;
  const date    = h?.logged_at ?? h?.submitted_at;
  const energyV = h?.energy ?? h?.fatigue ?? null;
  const sleepV  = h?.sleep  ?? h?.sleep_quality ?? null;
  const sorV    = h?.muscle_soreness ?? h?.soreness ?? null;

  return (
    <tr>
      <td data-label="" style={{ padding:'13px 16px 13px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Avatar first={player.first_name} last={player.last_name} level={level} size={34}/>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>{player.first_name} {player.last_name}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:1 }}>{player.email}</div>
          </div>
        </div>
      </td>
      <td data-label="Teams" style={{ padding:'13px 16px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {(player.teams ?? []).length ? (player.teams ?? []).map(t => (
            <span key={t.id} style={{ fontSize:'0.66rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#EEF2FF', color:'#4338CA', border:'1px solid #C7D2FE' }}>{t.name}</span>
          )) : <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>—</span>}
        </div>
      </td>
      <td data-label="Last Check-in" style={{ padding:'13px 16px' }}>
        {h ? (
          <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>{daysAgo(date)}</span>
        ) : <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>No data</span>}
      </td>
      <td data-label="Energy"   style={{ padding:'13px 16px', textAlign:'center' }}><ScoreBar value={energyV}  lowIsBetter={false}/></td>
      <td data-label="Soreness" style={{ padding:'13px 16px', textAlign:'center' }}><ScoreBar value={sorV}     lowIsBetter={true}/></td>
      <td data-label="Sleep"    style={{ padding:'13px 16px', textAlign:'center' }}><ScoreBar value={sleepV}   lowIsBetter={false}/></td>
      <td data-label="Status"   style={{ padding:'13px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:cfg.color, boxShadow:`0 0 0 3px ${cfg.color}22` }}/>
          <span style={{ fontSize:'0.73rem', fontWeight:700, padding:'3px 10px', borderRadius:99, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CoachHealthPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [alerts,  setAlerts]  = useState<HealthAlert[]>([]);
  const [players, setPlayers] = useState<PlayerHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      healthApi.getHealthAlerts().catch(() => [] as HealthAlert[]),
      coachApi.getPlayers().catch(() => []),
    ]).then(([alts, pls]: [any, any]) => {
      setAlerts(Array.isArray(alts) ? alts : (alts?.alerts ?? []));
      setPlayers(Array.isArray(pls) ? pls : (pls?.players ?? []));
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load')).finally(() => setLoading(false));
  }, []);

  const flaggedCount   = players.filter(p => p.latest_health?.is_flagged || (p.latest_health?.overall_score != null && p.latest_health.overall_score < 40)).length;
  const noDataCount    = players.filter(p => !p.latest_health).length;
  const goodCount      = players.filter(p => healthLevel(p.latest_health) === 'good').length;
  const attentionCount = players.filter(p => { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }).length;

  const filtered = players.filter(p => {
    if (statusFilter === 'all')             return true;
    if (statusFilter === 'flagged')         return p.latest_health?.is_flagged;
    if (statusFilter === 'no-data')         return !p.latest_health;
    if (statusFilter === 'good')            return healthLevel(p.latest_health) === 'good';
    if (statusFilter === 'needs-attention') { const lv = healthLevel(p.latest_health); return lv === 'poor' || lv === 'moderate'; }
    return true;
  });

  const cards = [
    { label:'Total Players',   count:players.length,  color:'#7C3AED', icon:'👥', filter:'all',             total:null,           description:'Active roster members'   },
    { label:'Flagged / Low',   count:flaggedCount,    color:'#DC2626', icon:'🚨', filter:'flagged',         total:players.length, description:'Low wellness score'       },
    { label:'Needs Attention', count:attentionCount,  color:'#D97706', icon:'⚡', filter:'needs-attention', total:players.length, description:'Moderate to high concern' },
    { label:'Good',            count:goodCount,       color:'#059669', icon:'✅', filter:'good',            total:players.length, description:'Healthy & ready to train' },
    { label:'No Data',         count:noDataCount,     color:'#94A3B8', icon:'📊', filter:'no-data',         total:players.length, description:'Awaiting check-in'        },
  ];

  return (
    <div style={{ animation:'fadeUp .3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header-row" style={{ marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:'clamp(1.2rem,4vw,1.55rem)', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.025em', lineHeight:1.2, margin:0 }}>Health Monitor</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginTop:6 }}>
            Wellness intelligence across {players.length} player{players.length !== 1 ? 's' : ''}
          </p>
        </div>
        {flaggedCount > 0 && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.72rem', fontWeight:700, padding:'5px 12px', borderRadius:99, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', boxShadow:'0 2px 8px rgba(220,38,38,.15)' }}>
            ⚠️ {flaggedCount} flagged
          </span>
        )}
      </div>

      {/* ── Alerts banner ───────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom:24, borderRadius:18, background:'rgba(255,251,235,.65)', backdropFilter:'blur(8px)', border:'1px solid rgba(217,119,6,.12)', borderLeft:'4px solid #F59E0B', boxShadow:'0 4px 24px rgba(245,158,11,.07)', overflow:'hidden' }}>
          <div style={{ padding:'13px 20px', background:'linear-gradient(90deg,rgba(245,158,11,.08),transparent)', borderBottom:'1px solid rgba(217,119,6,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem' }}>⚠️</div>
              <div>
                <div style={{ fontWeight:800, fontSize:'0.92rem', color:'#78350F' }}>Health Alerts</div>
                <div style={{ fontSize:'0.72rem', color:'#A16207', marginTop:1 }}>{alerts.length} player{alerts.length !== 1 ? 's' : ''} require attention</div>
              </div>
            </div>
            <span style={{ fontSize:'0.65rem', fontWeight:800, padding:'3px 10px', borderRadius:99, background:'rgba(220,38,38,.08)', color:'#DC2626', border:'1px solid rgba(220,38,38,.14)' }}>
              {alerts.length} ALERT{alerts.length !== 1 ? 'S' : ''}
            </span>
          </div>
          <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:9 }}>
            {alerts.slice(0, 5).map(a => <AlertRow key={a.id} alert={a}/>)}
            {alerts.length > 5 && (
              <div style={{ textAlign:'center', fontSize:'0.78rem', color:'#A16207', paddingTop:4, fontWeight:600 }}>
                +{alerts.length - 5} more alerts visible in the table below
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filter cards ────────────────────────────────────────── */}
      <div className="cg5" style={{ marginBottom:24 }}>
        {cards.map(c => (
          <MetricCard key={c.filter} label={c.label} count={c.count} total={c.total} color={c.color} icon={c.icon} description={c.description} isActive={statusFilter === c.filter} onClick={() => setStatusFilter(c.filter)}/>
        ))}
      </div>

      {/* ── Player Table ─────────────────────────────────────────── */}
      <div className="cc" style={{ marginBottom:16 }}>
        <div style={{ padding:'15px 20px', background:'linear-gradient(90deg,rgba(99,102,241,.03),transparent)', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:'0.95rem', color:'var(--text-primary)', letterSpacing:'-0.015em' }}>Player Wellness</div>
            <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:2 }}>Latest check-in per player · {filtered.length} of {players.length} shown</div>
          </div>
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')} style={{ fontSize:'0.72rem', fontWeight:600, padding:'4px 12px', borderRadius:99, background:'var(--bg-elevated)', color:'var(--text-secondary)', border:'1px solid var(--border-default)', cursor:'pointer' }}>
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:58, borderRadius:12 }}/>)}
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ margin:16 }}>{error}</div>
        ) : !filtered.length ? (
          <div style={{ padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📊</div>
            <div style={{ fontWeight:600, fontSize:'0.95rem', color:'var(--text-secondary)' }}>
              {statusFilter !== 'all' ? 'No players match this filter' : 'No players found'}
            </div>
            <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:6 }}>
              {statusFilter !== 'all' ? 'Try clearing the filter.' : 'No players rostered on your teams yet.'}
            </div>
          </div>
        ) : (
          <div className="player-table-wrap">
            <table className="c-table" style={{ minWidth:620 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft:20 }}>Player</th>
                  <th>Teams</th>
                  <th>Last Check-in</th>
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
      <div style={{ padding:'13px 18px', borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div style={{ width:30, height:30, borderRadius:8, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.14)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0 }}>ℹ️</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:18, alignItems:'center', flex:1 }}>
          <div><div style={{ fontWeight:700, fontSize:'0.7rem', color:'var(--text-secondary)', marginBottom:1 }}>Energy &amp; Sleep</div><div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>1 = poor · 5 = excellent</div></div>
          <div style={{ width:1, height:28, background:'var(--border-subtle)' }}/>
          <div><div style={{ fontWeight:700, fontSize:'0.7rem', color:'var(--text-secondary)', marginBottom:1 }}>Soreness</div><div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>1 = none · 5 = very sore</div></div>
          <div style={{ width:1, height:28, background:'var(--border-subtle)' }}/>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            {[{ color:'#059669', label:'Healthy' }, { color:'#D97706', label:'Moderate concern' }, { color:'#DC2626', label:'High risk' }].map(({ color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:24, height:5, borderRadius:99, background:`linear-gradient(90deg,${color}80,${color})` }}/>
                <span style={{ fontSize:'0.64rem', color:'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
