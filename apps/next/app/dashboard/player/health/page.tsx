'use client';

import { useEffect, useState, useMemo } from 'react';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes injuryPulse {
    0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,.4); }
    50%    { box-shadow:0 0 0 14px rgba(239,68,68,0); }
  }
  @keyframes warnPulse {
    0%,100%{ box-shadow:0 0 0 0 rgba(245,158,11,.35); }
    50%    { box-shadow:0 0 0 10px rgba(245,158,11,0); }
  }
  @keyframes slideUp {
    from{ opacity:0; transform:translateY(14px); }
    to  { opacity:1; transform:translateY(0); }
  }
  @keyframes critPulse {
    0%,100%{ opacity:1; }
    50%{ opacity:.5; }
  }

  /* Card system */
  .hc {
    background:var(--bg-surface);
    border:1px solid var(--border-subtle);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.04);
    transition:box-shadow .2s,transform .2s;
  }
  .hc:hover { box-shadow:0 4px 32px rgba(0,0,0,.08); }

  .hk {
    background:var(--bg-surface);
    border:1px solid var(--border-subtle);
    border-radius:18px;
    padding:20px 18px;
    box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03);
    transition:box-shadow .2s,transform .2s;
  }
  .hk:hover { box-shadow:0 8px 32px rgba(0,0,0,.08); transform:translateY(-2px); }

  /* Tabs */
  .htab {
    position:relative; padding:11px 18px; background:none; border:none;
    cursor:pointer; font-size:.875rem; font-weight:500; white-space:nowrap;
    color:var(--text-muted); transition:color .15s; margin-bottom:-1px;
  }
  .htab.on { font-weight:700; color:#6D28D9; }
  .htab.on::after {
    content:''; position:absolute; bottom:0; left:14px; right:14px;
    height:2.5px; background:linear-gradient(90deg,#7C3AED,#6D28D9);
    border-radius:2px 2px 0 0;
  }
  .htab:not(.on):hover { color:var(--text-secondary); }

  /* Grids */
  .hg4  { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .hg2  { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
  .hg21 { display:grid; grid-template-columns:2fr 1.3fr; gap:20px; align-items:start; }

  @media(max-width:1100px){ .hg21 { grid-template-columns:1fr; } }
  @media(max-width:860px){
    .hg4 { grid-template-columns:repeat(2,1fr); gap:12px; }
    .hg2 { grid-template-columns:1fr; }
  }
  @media(max-width:600px){
    .hg4 { grid-template-columns:repeat(2,1fr); gap:10px; }
    .hk  { padding:14px 12px; }
    .htab{ padding:9px 10px; font-size:.76rem; }
  }

  /* Log modal */
  .log-modal-overlay {
    position:fixed; inset:0; z-index:300;
    background:rgba(0,0,0,.55); backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .log-modal-box {
    width:100%; max-width:480px;
    background:var(--bg-surface); border:1px solid var(--border-default);
    border-radius:22px; overflow:hidden;
    box-shadow:0 24px 60px rgba(0,0,0,.3);
    animation:slideUp .25s ease;
  }
  @media(max-width:520px){
    .log-modal-box { border-radius:18px; max-height:92vh; overflow-y:auto; }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function sc(p: number) { return p >= 70 ? '#059669' : p >= 40 ? '#D97706' : '#DC2626'; }
function sl(p: number) { return p >= 70 ? 'Optimal' : p >= 40 ? 'Moderate' : 'Low'; }
function hexRgb(h: string) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)].join(',');
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, pct, color, icon, raw, max = 5 }: {
  label: string; pct: number; color: string; icon: string; raw?: number; max?: number;
}) {
  const trend = pct >= 60 ? '↑' : pct >= 40 ? '→' : '↓';
  const tc    = pct >= 60 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626';
  return (
    <div className="hk">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:`${color}12`, border:`1px solid ${color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>{icon}</div>
        <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.04em', color:tc, background:`${tc}10`, padding:'2px 7px', borderRadius:99 }}>{trend} {pct}%</span>
      </div>
      <div style={{ fontSize:'2.2rem', fontWeight:900, letterSpacing:'-0.04em', color:'var(--text-primary)', lineHeight:1, marginBottom:4 }}>
        {raw != null ? raw : pct}<span style={{ fontSize:'0.85rem', fontWeight:400, color:'var(--text-muted)', marginLeft:2 }}>{raw != null ? `/${max}` : '%'}</span>
      </div>
      <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:10 }}>{label}</div>
      <div style={{ height:4, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background:`linear-gradient(90deg,${color}70,${color})`, transition:'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

// ── Score Gauge ────────────────────────────────────────────────────────────────
function ScoreGauge({ score, sub }: { score: number; sub: string }) {
  const c = sc(score);
  const r = 64, circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 20px 20px', textAlign:'center' }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ display:'block', marginBottom:14 }}>
        <defs>
          <linearGradient id="sgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c} stopOpacity="0.7"/>
            <stop offset="100%" stopColor={c}/>
          </linearGradient>
          <filter id="sgGlow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={80} cy={80} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={10}/>
        <circle cx={80} cy={80} r={r} fill="none" stroke="url(#sgGrad)" strokeWidth={10}
          strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 80 80)" filter="url(#sgGlow)"
          style={{ transition:'stroke-dasharray 1.6s cubic-bezier(.4,0,.2,1)' }}/>
        <text x={80} y={72} textAnchor="middle" fontSize={34} fontWeight={900} fill="var(--text-primary)" fontFamily="system-ui">{score}</text>
        <text x={80} y={89} textAnchor="middle" fontSize={11} fill="var(--text-muted)">/100</text>
      </svg>
      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 14px', borderRadius:99, background:`${c}12`, border:`1px solid ${c}22`, fontSize:'0.78rem', fontWeight:700, color:c, marginBottom:6 }}>
        {sl(score)}
      </span>
      <div style={{ fontSize:'0.67rem', color:'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

// ── Premium progress bar ───────────────────────────────────────────────────────
function PBar({ label, pct, color, sub }: { label: string; pct: number; color: string; sub: string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <div>
          <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize:'0.67rem', color:'var(--text-muted)', marginLeft:6 }}>{sub}</span>
        </div>
        <span style={{ fontSize:'0.78rem', fontWeight:800, color, padding:'1px 9px', borderRadius:99, background:`${color}12`, border:`1px solid ${color}20` }}>{pct}%</span>
      </div>
      <div style={{ height:6, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background:`linear-gradient(90deg,${color}70,${color})`, boxShadow:`0 0 8px ${color}40`, transition:'width 1.3s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────────
function TrendLine({ values, color, label, badge }: { values: number[]; color: string; label: string; badge: string }) {
  if (values.length < 2) return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:color }} />
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize:'0.75rem', fontWeight:700, color }}>—</span>
      </div>
      <div style={{ height:36, background:'var(--bg-elevated)', borderRadius:8 }} />
    </div>
  );
  const W = 400, H = 40;
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * W, y: 6 + ((5 - v) / 4) * (H - 12) }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = `${line} L${W},${H} L0,${H} Z`;
  const uid  = `tl-${label.replace(/\W/g, '')}`;
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 5px ${color}` }} />
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize:'0.75rem', fontWeight:800, color, padding:'2px 9px', borderRadius:99, background:`${color}12` }}>{badge}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display:'block' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#${uid})`}/>
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.5 : 2.5}
            fill="var(--bg-surface)" stroke={color} strokeWidth="2"
            style={i === pts.length - 1 ? { filter:`drop-shadow(0 0 4px ${color})` } : {}}/>
        ))}
      </svg>
    </div>
  );
}

// ── Injury Risk ────────────────────────────────────────────────────────────────
function InjuryRisk({ risk }: { risk: 'High' | 'Medium' | 'Low' | 'Unknown' }) {
  const c     = risk === 'High' ? '#DC2626' : risk === 'Medium' ? '#D97706' : risk === 'Low' ? '#059669' : '#94A3B8';
  const icon  = risk === 'High' ? '⚠️' : risk === 'Medium' ? '⚡' : risk === 'Low' ? '🛡️' : '❓';
  const pulse = risk === 'High' ? 'injuryPulse 2s infinite' : risk === 'Medium' ? 'warnPulse 2.5s infinite' : 'none';
  return (
    <div className="hc" style={{ padding:'22px 16px', textAlign:'center' }}>
      <div style={{ width:60, height:60, borderRadius:'50%', margin:'0 auto 12px', background:`radial-gradient(circle,${c}18,transparent 70%)`, border:`2px solid ${c}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', animation:pulse }}>{icon}</div>
      <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:8 }}>Injury Risk</div>
      <span style={{ display:'inline-block', padding:'4px 14px', borderRadius:99, fontSize:'0.8rem', fontWeight:800, background:`${c}12`, color:c, border:`1px solid ${c}24` }}>{risk === 'Unknown' ? 'No Data' : risk}</span>
      <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', marginTop:6, textTransform:'uppercase', letterSpacing:'0.1em' }}>AI Prediction</div>
    </div>
  );
}

// ── AI Rec Card ────────────────────────────────────────────────────────────────
function AIRec({ type, color, icon, text }: { type: string; color: string; icon: string; text: string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderRadius:14,
      background:`rgba(${hexRgb(color)},.05)`, border:`1px solid rgba(${hexRgb(color)},.18)` } as React.CSSProperties}>
      <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:`${color}14`, border:`1px solid ${color}24`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>{icon}</div>
      <div style={{ flex:1, paddingTop:1 }}>
        <span style={{ display:'inline-block', marginBottom:5, padding:'2px 8px', borderRadius:99, fontSize:'0.58rem', fontWeight:800, background:`${color}16`, color, textTransform:'uppercase', letterSpacing:'0.1em' }}>{type}</span>
        <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.6 }}>{text}</div>
      </div>
    </div>
  );
}

// ── Injury Arc Gauge (AI Medical Insights tab) ────────────────────────────────
function InjuryArcGauge({ risk, m }: {
  risk: 'High' | 'Medium' | 'Low' | 'Unknown';
  m: { energy:number; sleep:number; recovery:number; stress:number };
}) {
  const rC = risk === 'High' ? '#DC2626' : risk === 'Medium' ? '#D97706' : risk === 'Low' ? '#059669' : '#94A3B8';
  const rA = risk === 'High' ? 150 : risk === 'Medium' ? 90 : 30;
  const toXY = (a: number) => ({
    x: 140 + 110 * Math.cos(Math.PI * (180 - a) / 180),
    y: 130 - 110 * Math.sin(Math.PI * (180 - a) / 180),
  });
  const seg = (a1: number, a2: number) => {
    const p1 = toXY(a1), p2 = toXY(a2);
    return `M ${p1.x.toFixed(1)},${p1.y.toFixed(1)} A 110,110 0 0,1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  };
  const np = toXY(rA);
  const factors = [
    { label:'Soreness', pct:m.recovery, bad: m.recovery < 50 },
    { label:'Stress',   pct:m.stress,   bad: m.stress   < 50 },
    { label:'Energy',   pct:m.energy,   bad: m.energy   < 50 },
  ];
  return (
    <div className="hc">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.92rem', color:'var(--text-primary)' }}>Injury Risk Assessment</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>AI prediction from your wellness data</div>
        </div>
        <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.6rem', fontWeight:800, background:'rgba(109,40,217,.1)', color:'#7C3AED', border:'1px solid rgba(109,40,217,.2)', letterSpacing:'0.08em' }}>AI</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', padding:'0 22px 22px' }}>
        <svg width={280} height={155} viewBox="0 0 280 155" style={{ flex:'0 0 auto', display:'block' }}>
          <path d={seg(0,180)} fill="none" stroke="var(--bg-elevated)" strokeWidth={16} strokeLinecap="round"/>
          <path d={seg(0,60)}  fill="none" stroke="#059669" strokeWidth={13} strokeLinecap="round" opacity={0.85}/>
          <path d={seg(60,120)} fill="none" stroke="#D97706" strokeWidth={13} strokeLinecap="round" opacity={0.85}/>
          <path d={seg(120,180)} fill="none" stroke="#DC2626" strokeWidth={13} strokeLinecap="round" opacity={0.85}/>
          {risk !== 'Unknown' && (
            <>
              <line x1={140} y1={130} x2={np.x.toFixed(1)} y2={np.y.toFixed(1)} stroke={rC} strokeWidth={2.5} strokeLinecap="round" opacity={0.75}/>
              <circle cx={np.x} cy={np.y} r={9} fill={rC} stroke="var(--bg-surface)" strokeWidth={3}/>
              <circle cx={140} cy={130} r={5} fill={rC} stroke="var(--bg-surface)" strokeWidth={2}/>
            </>
          )}
          <text x={140} y={104} textAnchor="middle" fontSize={26} fontWeight={900} fill={rC} fontFamily="system-ui,sans-serif">{risk === 'Unknown' ? '—' : risk.toUpperCase()}</text>
          <text x={140} y={120} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)" fontFamily="system-ui,sans-serif" letterSpacing={1.5} fontWeight={700}>RISK LEVEL</text>
          <text x={22}  y={150} textAnchor="middle" fontSize={9} fill="#059669" fontFamily="system-ui" fontWeight={700}>LOW</text>
          <text x={140} y={18}  textAnchor="middle" fontSize={9} fill="#D97706" fontFamily="system-ui" fontWeight={700}>MED</text>
          <text x={258} y={150} textAnchor="middle" fontSize={9} fill="#DC2626" fontFamily="system-ui" fontWeight={700}>HIGH</text>
        </svg>
        <div style={{ flex:1, minWidth:160, paddingLeft:20, paddingTop:22 }}>
          <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:12 }}>Contributing Factors</div>
          {factors.map(({ label, pct, bad }) => (
            <div key={label} style={{ marginBottom:11 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:'0.77rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize:'0.72rem', fontWeight:800, color: bad ? '#DC2626' : '#059669' }}>{pct}%</span>
              </div>
              <div style={{ height:5, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, width:`${Math.max(pct, pct===0 ? 0 : 3)}%`, background: bad ? 'linear-gradient(90deg,#DC262660,#DC2626)' : 'linear-gradient(90deg,#05966960,#059669)', transition:'width 1.2s ease' }}/>
              </div>
            </div>
          ))}
          <div style={{ marginTop:16, padding:'10px 14px', borderRadius:12, background:`${rC}08`, border:`1px solid ${rC}18` }}>
            <p style={{ margin:0, fontSize:'0.72rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
              {risk === 'Low'    ? '✓ Low risk indicators. Maintain current training load.' :
               risk === 'Medium' ? '⚡ Moderate risk. Consider reducing intensity for 24–48h.' :
               risk === 'High'   ? '⚠️ Multiple risk factors. Rest recommended before next session.' :
               'Log your wellness to generate an injury risk prediction.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assessment Card (for AI Medical Insights 2×2 grid) ────────────────────────
function AssessmentCard({ label, pct, raw, color, icon, desc }: {
  label:string; pct:number; raw:number; color:string; icon:string; desc:string;
}) {
  const critical = pct < 20;
  const low      = pct < 40;
  const dc       = critical ? '#DC2626' : low ? '#D97706' : color;
  const status   = pct >= 70 ? 'Optimal' : pct >= 40 ? 'Fair' : pct >= 20 ? 'Low' : 'Critical';
  return (
    <div style={{ padding:'16px', borderRadius:16, background: critical ? 'rgba(220,38,38,.03)' : `${color}03`, border:`1px solid ${critical ? 'rgba(220,38,38,.18)' : color+'16'}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:11 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${dc}12`, border:`1px solid ${dc}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.77rem', fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</div>
          <div style={{ fontSize:'0.63rem', color:'var(--text-muted)' }}>{desc}</div>
        </div>
        {critical && <span style={{ flexShrink:0, padding:'2px 7px', borderRadius:99, fontSize:'0.57rem', fontWeight:800, background:'rgba(220,38,38,.1)', color:'#DC2626', border:'1px solid rgba(220,38,38,.2)', textTransform:'uppercase', letterSpacing:'0.06em', animation:'critPulse 2s infinite' }}>Critical</span>}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:'1.9rem', fontWeight:900, letterSpacing:'-0.04em', color:dc, lineHeight:1 }}>{pct}%</span>
        <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{raw}/5</span>
      </div>
      <div style={{ height:6, borderRadius:99, background: pct===0 ? 'rgba(220,38,38,.07)' : 'var(--bg-elevated)', overflow:'hidden', position:'relative' }}>
        {pct === 0
          ? <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(45deg,rgba(220,38,38,.18) 0,rgba(220,38,38,.18) 4px,transparent 4px,transparent 8px)' }}/>
          : <div style={{ height:'100%', borderRadius:99, width:`${Math.max(pct,3)}%`, background:`linear-gradient(90deg,${dc}70,${dc})`, boxShadow:`0 0 6px ${dc}44`, transition:'width 1.2s cubic-bezier(.4,0,.2,1)' }}/>
        }
      </div>
      <div style={{ marginTop:7, display:'flex', justifyContent:'flex-end' }}>
        <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'0.62rem', fontWeight:700, background:`${dc}10`, color:dc, border:`1px solid ${dc}18` }}>{status}</span>
      </div>
    </div>
  );
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
function MiniCal({ dates }: { dates: string[] }) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const firstDay = new Date(y, m, 1).getDay(), daysCount = new Date(y, m + 1, 0).getDate(), today = now.getDate();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const logged = new Set(dates.map(d => { const dd = new Date(d); return dd.getMonth() === m && dd.getFullYear() === y ? dd.getDate() : null; }).filter(Boolean));
  const cells  = [...Array(firstDay).fill(null), ...Array.from({ length: daysCount }, (_, i) => i + 1)];
  return (
    <div>
      <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text-primary)', marginBottom:10 }}>{MONTHS[m]} {y}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:'0.6rem', fontWeight:700, color:'var(--text-muted)', paddingBottom:4 }}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>;
          const isToday = day === today, hasLog = logged.has(day as number);
          return (
            <div key={day} style={{ textAlign:'center', fontSize:'0.72rem', fontWeight:isToday ? 800 : hasLog ? 600 : 400, padding:'4px 2px', borderRadius:6,
              background:isToday ? '#6D28D9' : hasLog ? 'rgba(5,150,105,.12)' : 'transparent',
              color:isToday ? 'white' : hasLog ? '#059669' : day < today ? 'var(--text-secondary)' : 'var(--text-muted)',
              border:hasLog && !isToday ? '1px solid rgba(5,150,105,.2)' : '1px solid transparent' }}>
              {day}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:12, marginTop:10 }}>
        {[{ c:'#059669', l:'Logged' }, { c:'#6D28D9', l:'Today' }].map(({ c, l }) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:c }}/>
            <span style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Log Modal ──────────────────────────────────────────────────────────────────
function LogModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ energy: 3, sleep: 3, muscle_soreness: 3, stress: 3, notes: '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const FIELDS = [
    { key:'energy'          as const, label:'Energy Level',    desc:'1=Exhausted · 5=Energised', icon:'⚡', color:'#059669' },
    { key:'sleep'           as const, label:'Sleep Quality',   desc:'1=Terrible · 5=Excellent',   icon:'😴', color:'#6D28D9' },
    { key:'muscle_soreness' as const, label:'Muscle Soreness', desc:'1=None · 5=Very Sore',        icon:'💪', color:'#D97706' },
    { key:'stress'          as const, label:'Stress Level',    desc:'1=Calm · 5=Stressed',         icon:'🧠', color:'#DC2626' },
  ];
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await healthApi.submitHealth(form); onDone(); onClose(); }
    catch { setErr('Failed to submit. Please try again.'); }
    setBusy(false);
  }
  return (
    <div className="log-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="log-modal-box">
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-subtle)', background:'linear-gradient(135deg,rgba(109,40,217,.06),var(--bg-elevated))', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text-primary)' }}>Wellness Check-in</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>{new Date().toLocaleDateString('en-GB',{ weekday:'long', day:'numeric', month:'long' })}</div>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'1.1rem', fontWeight:700 }}>×</button>
        </div>
        <form onSubmit={submit} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          {FIELDS.map(({ key, label, desc, icon, color }) => (
            <div key={key}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${color}12`, border:`1px solid ${color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize:'0.67rem', color:'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.72rem', fontWeight:800, background:`${color}10`, color, border:`1px solid ${color}18` }}>{form[key]}/5</span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} type="button" onClick={() => setForm(p => ({ ...p, [key]: v }))}
                    style={{ flex:1, height:38, borderRadius:10, cursor:'pointer', border:`2px solid ${form[key] === v ? color : 'var(--border-default)'}`, background:form[key] === v ? `${color}10` : 'var(--bg-elevated)', color:form[key] === v ? color : 'var(--text-secondary)', fontWeight:700, fontSize:'0.9rem', transition:'all .12s' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border-default)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:'0.85rem', resize:'vertical', minHeight:60, outline:'none', fontFamily:'inherit' }}/>
          {err && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.18)', color:'#DC2626', fontSize:'0.82rem' }}>{err}</div>}
          <button type="submit" disabled={busy} style={{ padding:13, borderRadius:12, border:'none', cursor:busy ? 'not-allowed' : 'pointer', background:busy ? 'var(--bg-elevated)' : 'linear-gradient(135deg,#7C3AED,#6D28D9)', color:busy ? 'var(--text-muted)' : 'white', fontWeight:800, fontSize:'0.9rem', boxShadow:busy ? 'none' : '0 4px 18px rgba(109,40,217,.35)', transition:'all .15s' }}>
            {busy ? 'Submitting…' : 'Submit Check-in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── AI recs builder ────────────────────────────────────────────────────────────
function buildRecs(e: HealthEntry | null) {
  if (!e) return [{ type:'Info', color:'#7C3AED', icon:'💡', text:'Log your wellness to receive personalised AI health insights.' }];
  const recs: { type:string; color:string; icon:string; text:string }[] = [];
  if (e.muscle_soreness >= 4) recs.push({ type:'Alert',   color:'#DC2626', icon:'🦵', text:'Elevated soreness flagged — risk of muscle strain if pace continues.' });
  else if (e.muscle_soreness === 3) recs.push({ type:'Warning', color:'#D97706', icon:'🔄', text:'Moderate soreness detected. Schedule a recovery session to prevent fatigue spike.' });
  if (e.sleep < 2)       recs.push({ type:'Alert',   color:'#DC2626', icon:'😴', text:'Poor sleep quality. Prioritise 8h rest and hydration tonight.' });
  else if (e.sleep === 2) recs.push({ type:'Warning', color:'#D97706', icon:'🌙', text:'Below-average sleep. Aim for 7–9 hours to optimise athletic recovery.' });
  if (e.stress >= 4)     recs.push({ type:'Warning', color:'#D97706', icon:'⚡', text:'High stress detected. Consider light active recovery before next session.' });
  if (e.energy < 2)      recs.push({ type:'Warning', color:'#D97706', icon:'🔋', text:'Low energy logged. Reduce sprint drills by 20% and prioritise nutrition.' });
  if (!recs.length) recs.push(
    { type:'Good', color:'#059669', icon:'✅', text:'Great recovery scores! Maintain current training intensity.' },
    { type:'Info', color:'#7C3AED', icon:'💧', text:'Hydration on track. Keep up with pre-training fluid intake.' },
  );
  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Biometrics & Vitals', 'AI Medical Insights', 'Logs History'] as const;
type Tab = typeof TABS[number];

export default function PlayerHealthPage() {
  const [history,  setHistory]  = useState<HealthEntry[]>([]);
  const [tab,      setTab]      = useState<Tab>('Overview');
  const [showLog,  setShowLog]  = useState(false);

  const load = () => healthApi.getMyHealth().then(setHistory).catch(() => {});
  useEffect(() => { load(); }, []);

  const latest = history[0] ?? null;

  const m = useMemo(() => {
    if (!latest) return { energy:0, sleep:0, recovery:0, stress:0, overall:0, risk:'Unknown' as const };
    const energy   = Math.round(((latest.energy - 1) / 4) * 100);
    const sleep    = Math.round(((latest.sleep - 1) / 4) * 100);
    const recovery = Math.round(((5 - latest.muscle_soreness) / 4) * 100);
    const stress   = Math.round(((5 - latest.stress) / 4) * 100);
    const overall  = latest.overall_score ?? Math.round((energy + sleep + recovery) / 3);
    const risk: 'High'|'Medium'|'Low' =
      latest.muscle_soreness >= 4 || latest.stress >= 4 ? 'High' :
      latest.muscle_soreness === 3 || latest.stress === 3 ? 'Medium' : 'Low';
    return { energy, sleep, recovery, stress, overall, risk };
  }, [latest]);

  const recs  = useMemo(() => buildRecs(latest), [latest]);
  const trend = useMemo(() => [...history].reverse().slice(-6), [history]);
  const protocols = useMemo(() => {
    const base = [
      { icon:'💤', title:'Sleep Target',  duration:'8–9 hours',  color:'#6D28D9', note:'Deep sleep accelerates repair',       score: m.sleep    },
      { icon:'🧊', title:'Ice Bath',       duration:'12–15 min',  color:'#0891B2', note:'Reduces post-session inflammation',   score: m.recovery },
      { icon:'💧', title:'Hydration',      duration:'3.5 L/day',  color:'#059669', note:'Electrolytes after sprint drills',    score: m.energy   },
      { icon:'🧘', title:'Mental Reset',   duration:'20 min',     color:'#D97706', note:'Reduce cortisol and improve focus',   score: m.stress   },
    ];
    if (!latest) return base.map(p => ({ ...p, status:'Recommended' }));
    return base
      .map(p => ({ ...p, status: p.score < 40 ? 'Priority' : p.score < 70 ? 'Recommended' : 'On Track' }))
      .sort((a, b) => a.score - b.score);
  }, [m, latest]);
  const todayLogged = !!latest && new Date(latest.submitted_at).toDateString() === new Date().toDateString();
  const dates       = history.map(e => e.submitted_at);
  const avgScore    = history.length ? Math.round(history.reduce((a, e) => a + (e.overall_score ?? 0), 0) / history.length) : 0;

  // Shared card header
  function Hdr({ title, sub, badge }: { title: string; sub: string; badge?: React.ReactNode }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.92rem', color:'var(--text-primary)' }}>{title}</div>
          {sub && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
        </div>
        {badge}
      </div>
    );
  }

  const AiBadge = <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.6rem', fontWeight:800, background:'rgba(109,40,217,.1)', color:'#7C3AED', border:'1px solid rgba(109,40,217,.2)', letterSpacing:'0.08em' }}>AI</span>;

  return (
    <div style={{ animation:'slideUp .3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>
      {showLog && <LogModal onClose={() => setShowLog(false)} onDone={load}/>}

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header-row" style={{ marginBottom:24 }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:'1.45rem', color:'var(--text-primary)', margin:0, letterSpacing:'-0.02em' }}>Health & Wellness</h1>
          <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:3 }}>Medical-grade athlete tracking hub</div>
        </div>
        <button onClick={() => setShowLog(true)} style={{ padding:'10px 22px', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.875rem',
          background:todayLogged ? 'rgba(5,150,105,.08)' : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
          color:todayLogged ? '#059669' : 'white',
          border:`1px solid ${todayLogged ? 'rgba(5,150,105,.2)' : 'transparent'}`,
          boxShadow:todayLogged ? 'none' : '0 4px 18px rgba(109,40,217,.3)',
        } as React.CSSProperties}>
          {todayLogged ? '✓ Logged Today' : '+ Log Wellness'}
        </button>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border-subtle)', marginBottom:24, overflowX:'auto', scrollbarWidth:'none' } as React.CSSProperties}>
        {TABS.map(t => (
          <button key={t} className={`htab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
      {tab === 'Overview' && (
        <div style={{ animation:'slideUp .25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* KPI row */}
          <div className="hg4">
            <KpiCard label="Energy"   pct={m.energy}   color="#059669" icon="⚡" raw={latest?.energy}/>
            <KpiCard label="Recovery" pct={m.recovery} color="#7C3AED" icon="🔄" raw={latest?.muscle_soreness}/>
            <KpiCard label="Sleep"    pct={m.sleep}    color="#0891B2" icon="😴" raw={latest?.sleep}/>
            <KpiCard label="Stress"   pct={m.stress}   color="#D97706" icon="🧠" raw={latest?.stress}/>
          </div>

          {/* Hero: Score + AI */}
          <div className="hg2">
            {/* Score hero card */}
            <div className="hc">
              <Hdr title="Overall Wellness Score" sub={latest ? `From wellness log · ${new Date(latest.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : 'Log wellness to see your score'}/>
              <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap' }}>
                <ScoreGauge score={m.overall} sub={latest ? `Logged ${new Date(latest.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : ''}/>
                <div style={{ flex:1, padding:'20px 22px 20px 4px', minWidth:170 }}>
                  <PBar pct={m.overall}  color={sc(m.overall)} label="Overall Wellness" sub="Combined score"/>
                  <PBar pct={m.energy}   color="#059669"        label="Energy Level"    sub={latest ? `${latest.energy}/5` : '—'}/>
                  <PBar pct={m.recovery} color="#7C3AED"        label="Recovery"        sub={latest ? `Soreness ${latest.muscle_soreness}/5` : '—'}/>
                  <PBar pct={m.sleep}    color="#0891B2"        label="Sleep Quality"   sub={latest ? `${latest.sleep}/5` : '—'}/>
                </div>
              </div>
            </div>

            {/* AI Coach card */}
            <div className="hc">
              <Hdr title="AI Coach" sub="Based on your data" badge={AiBadge}/>
              <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
                {recs.map((r, i) => <AIRec key={i} {...r}/>)}
              </div>
            </div>
          </div>

          {/* Trend + widgets */}
          <div className="hg21">
            <div className="hc">
              <Hdr title="Wellness Trend" sub={`Last ${trend.length} entries`}/>
              <div style={{ padding:'18px 22px' }}>
                {trend.length > 0 ? (
                  <>
                    <TrendLine values={trend.map(e => e.energy)}            color="#059669" label="Energy"   badge={latest ? `${latest.energy}/5` : '—'}/>
                    <TrendLine values={trend.map(e => 6 - e.muscle_soreness)} color="#7C3AED" label="Recovery" badge={latest ? `${latest.muscle_soreness}/5` : '—'}/>
                    <TrendLine values={trend.map(e => e.sleep)}             color="#0891B2" label="Sleep"    badge={latest ? `${latest.sleep}/5` : '—'}/>
                  </>
                ) : (
                  <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-muted)' }}>
                    <div style={{ fontSize:'2rem', marginBottom:8 }}>📈</div>
                    <div style={{ fontSize:'0.82rem' }}>Log multiple entries to see wellness trends</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <InjuryRisk risk={latest ? m.risk : 'Unknown'}/>
              <div className="hc" style={{ padding:'20px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:6 }}>Season Logs</div>
                <div style={{ fontWeight:900, fontSize:'2.2rem', letterSpacing:'-0.04em', color:'var(--text-primary)', lineHeight:1 }}>
                  {history.length}<span style={{ fontSize:'0.9rem', fontWeight:400, color:'var(--text-muted)', marginLeft:2 }}>/30</span>
                </div>
                <div style={{ margin:'12px 0 4px', height:6, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(history.length/30)*100)}%`, borderRadius:99, background:'linear-gradient(90deg,#7C3AED,#6D28D9)', boxShadow:'0 0 8px rgba(109,40,217,.4)', transition:'width 1s ease' }}/>
                </div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{Math.round((history.length/30)*100)}% complete</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          {!todayLogged && (
            <div className="cta-banner-row" style={{ borderRadius:16, padding:'20px 24px', background:'linear-gradient(135deg,rgba(109,40,217,.06),rgba(124,58,237,.04))', border:'1px solid rgba(109,40,217,.14)' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>Log your wellness today</div>
                <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:3 }}>Track fatigue, soreness, and sleep to get personalised recommendations.</div>
              </div>
              <button onClick={() => setShowLog(true)} style={{ padding:'11px 24px', borderRadius:12, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7C3AED,#6D28D9)', color:'white', fontWeight:800, fontSize:'0.9rem', boxShadow:'0 4px 16px rgba(109,40,217,.35)' }}>
                Log Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ BIOMETRICS ════════════════════════════════════════════ */}
      {tab === 'Biometrics & Vitals' && (
        <div style={{ animation:'slideUp .25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* 4 vital cards */}
          <div className="hg4">
            {[
              { label:'Energy',   pct:m.energy,   color:'#059669', icon:'⚡', raw:latest?.energy,          desc:'1=Exhausted · 5=Energised' },
              { label:'Sleep',    pct:m.sleep,    color:'#6D28D9', icon:'😴', raw:latest?.sleep,           desc:'1=Terrible · 5=Excellent'  },
              { label:'Recovery', pct:m.recovery, color:'#D97706', icon:'🔄', raw:latest?.muscle_soreness, desc:'Soreness inverted'          },
              { label:'Stress',   pct:m.stress,   color:'#DC2626', icon:'🧠', raw:latest?.stress,          desc:'1=Calm · 5=Stressed (inv.)' },
            ].map(({ label, pct, color, icon, raw, desc }) => (
              <div key={label} className="hk" style={{ borderLeft:`3px solid ${color}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:`${color}12`, border:`1px solid ${color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>{icon}</div>
                  <span style={{ fontSize:'0.65rem', fontWeight:800, padding:'2px 8px', borderRadius:99, background:`${color}10`, color, border:`1px solid ${color}18` }}>{raw != null ? `${raw}/5` : '—'}</span>
                </div>
                <div style={{ fontSize:'2.1rem', fontWeight:900, letterSpacing:'-0.04em', color, lineHeight:1, marginBottom:4 }}>{pct}<span style={{ fontSize:'0.85rem', fontWeight:400, color:'var(--text-muted)' }}>%</span></div>
                <div style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:10 }}>{label}</div>
                <div style={{ height:5, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden', marginBottom:5 }}>
                  <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background:`linear-gradient(90deg,${color}70,${color})`, boxShadow:`0 0 6px ${color}44`, transition:'width 1.2s ease' }}/>
                </div>
                <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>

          <div className="hg2">
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Detail card */}
              <div className="hc">
                <Hdr title="Biometric Detail" sub="Raw values from latest wellness log"/>
                <div style={{ padding:'20px 22px' }}>
                  {[
                    { label:'Energy Level',    value:latest?.energy,          max:5, color:'#059669', note:'Higher = more energised' },
                    { label:'Sleep Quality',   value:latest?.sleep,           max:5, color:'#6D28D9', note:'Higher = better sleep' },
                    { label:'Muscle Soreness', value:latest?.muscle_soreness, max:5, color:'#D97706', note:'Higher = more sore (inverted for score)' },
                    { label:'Stress Level',    value:latest?.stress,          max:5, color:'#DC2626', note:'Higher = more stressed (inverted for score)' },
                  ].map(({ label, value, max, color, note }) => (
                    <div key={label} style={{ marginBottom:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:8 }}>
                        <div>
                          <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</div>
                          <div style={{ fontSize:'0.63rem', color:'var(--text-muted)', marginTop:1 }}>{note}</div>
                        </div>
                        <span style={{ fontSize:'0.95rem', fontWeight:800, color, fontFamily:'var(--font-mono)', letterSpacing:'-0.02em' }}>{value != null ? `${value}/${max}` : '—'}</span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, width:value != null ? `${(value/max)*100}%` : '0%', background:`linear-gradient(90deg,${color}60,${color})`, boxShadow:`0 0 6px ${color}40`, transition:'width 1.2s ease' }}/>
                      </div>
                    </div>
                  ))}
                  {latest?.notes && (
                    <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:'0.78rem', color:'var(--text-secondary)', fontStyle:'italic' }}>
                      &ldquo;{latest.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Recovery trend */}
              <div className="hc">
                <Hdr title="Recovery Trend" sub={`Last ${trend.length} logged entries`}/>
                <div style={{ padding:'18px 22px' }}>
                  {trend.length > 0 ? (
                    <>
                      <TrendLine values={trend.map(e => e.energy)}            color="#059669" label="Energy"          badge={latest ? `${latest.energy}/5` : '—'}/>
                      <TrendLine values={trend.map(e => 6 - e.muscle_soreness)} color="#D97706" label="Recovery (Sor.)" badge={latest ? `${latest.muscle_soreness}/5` : '—'}/>
                      <TrendLine values={trend.map(e => e.sleep)}             color="#6D28D9" label="Sleep Quality"   badge={latest ? `${latest.sleep}/5` : '—'}/>
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'24px 0', fontSize:'0.82rem', color:'var(--text-muted)' }}>Log multiple entries to see recovery trends.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right col */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="hc" style={{ textAlign:'center' }}>
                <Hdr title="Overall Score" sub="Composite wellness rating"/>
                <ScoreGauge score={m.overall} sub={latest ? `Logged: ${new Date(latest.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : 'No data yet'}/>
              </div>
              <div className="hc">
                <Hdr title="Log Calendar" sub=""/>
                <div style={{ padding:'14px 16px' }}><MiniCal dates={dates}/></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ AI INSIGHTS ═══════════════════════════════════════════ */}
      {tab === 'AI Medical Insights' && (
        <div style={{ animation:'slideUp .25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Injury Risk Arc Gauge – full width */}
          <InjuryArcGauge risk={latest ? m.risk : 'Unknown'} m={m}/>

          {/* AI Health Assessment – 2×2 metric cards */}
          <div className="hc">
            <Hdr title="AI Health Assessment" sub="Comprehensive wellness analysis" badge={AiBadge}/>
            {!latest ? (
              <div style={{ textAlign:'center', padding:'32px', color:'var(--text-muted)', fontSize:'0.85rem' }}>
                Log your wellness to receive AI-powered medical insights.
              </div>
            ) : (
              <div style={{ padding:'20px 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <AssessmentCard label="Energy Level"      pct={m.energy}   raw={latest.energy}           color="#059669" icon="⚡" desc="Vitality & stamina"/>
                <AssessmentCard label="Sleep Quality"     pct={m.sleep}    raw={latest.sleep}             color="#6D28D9" icon="😴" desc="Recovery sleep"/>
                <AssessmentCard label="Recovery Status"   pct={m.recovery} raw={latest.muscle_soreness}  color="#0891B2" icon="💪" desc="Muscle readiness"/>
                <AssessmentCard label="Stress Management" pct={m.stress}   raw={latest.stress}            color="#D97706" icon="🧠" desc="Mental load"/>
              </div>
            )}
          </div>

          {/* Diagnostic alerts */}
          <div className="hc">
            <Hdr title="Diagnostic Alerts & Recommendations" sub="Personalised insights from your wellness data"/>
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {recs.map((r, i) => <AIRec key={i} {...r}/>)}
            </div>
          </div>

          {/* Recovery protocols – sorted by urgency */}
          <div className="hc">
            <Hdr title="Recovery Protocols" sub="Prioritised based on your current metrics"/>
            <div style={{ padding:'18px 22px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:14 }}>
              {protocols.map(({ icon, title, duration, color, note, status }) => (
                <div key={title} style={{ padding:'16px', borderRadius:14,
                  background: status === 'Priority' ? 'rgba(220,38,38,.03)' : `${color}06`,
                  border:`1px solid ${status === 'Priority' ? 'rgba(220,38,38,.2)' : color+'18'}` }}>
                  <div style={{ fontSize:'1.5rem', marginBottom:10 }}>{icon}</div>
                  <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)', marginBottom:2 }}>{title}</div>
                  <div style={{ fontSize:'1.05rem', fontWeight:900, letterSpacing:'-0.02em', color, marginBottom:4 }}>{duration}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginBottom:8 }}>{note}</div>
                  <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:99, fontSize:'0.62rem', fontWeight:700,
                    background: status==='Priority' ? 'rgba(220,38,38,.1)' : status==='On Track' ? 'rgba(5,150,105,.1)' : `${color}14`,
                    color:      status==='Priority' ? '#DC2626'           : status==='On Track' ? '#059669'              : color,
                    border:`1px solid ${status==='Priority'?'rgba(220,38,38,.2)':status==='On Track'?'rgba(5,150,105,.2)':color+'20'}` }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Medical flags */}
          {latest && (latest.muscle_soreness >= 4 || latest.stress >= 4 || latest.sleep < 2) && (
            <div style={{ borderRadius:16, padding:'18px 22px', background:'rgba(220,38,38,.05)', border:'1px solid rgba(220,38,38,.18)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(220,38,38,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0, animation:'injuryPulse 2s infinite' }}>🚨</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'0.92rem', color:'#DC2626' }}>Medical Attention Flags</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:1 }}>One or more wellness metrics require immediate attention</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {latest.muscle_soreness >= 4 && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(220,38,38,.04)', border:'1px solid rgba(220,38,38,.1)' }}>
                    <span style={{ color:'#DC2626', flexShrink:0, fontWeight:800, marginTop:1 }}>•</span>
                    <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.55 }}>High soreness ({latest.muscle_soreness}/5) — consider active rest or physiotherapy before next session.</span>
                  </div>
                )}
                {latest.stress >= 4 && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(220,38,38,.04)', border:'1px solid rgba(220,38,38,.1)' }}>
                    <span style={{ color:'#DC2626', flexShrink:0, fontWeight:800, marginTop:1 }}>•</span>
                    <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.55 }}>Elevated stress ({latest.stress}/5) — mental performance coaching recommended.</span>
                  </div>
                )}
                {latest.sleep < 2 && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(220,38,38,.04)', border:'1px solid rgba(220,38,38,.1)' }}>
                    <span style={{ color:'#DC2626', flexShrink:0, fontWeight:800, marginTop:1 }}>•</span>
                    <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.55 }}>Critical sleep score ({latest.sleep}/5) — notify medical staff if persistent.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ LOGS HISTORY ══════════════════════════════════════════ */}
      {tab === 'Logs History' && (
        <div style={{ animation:'slideUp .25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Season hero */}
          <div className="cta-banner-row" style={{ background:'linear-gradient(135deg,#4C1D95,#6D28D9)', borderRadius:18, padding:'24px 28px' }}>
            <div>
              <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:6 }}>Season Progress</div>
              <div style={{ fontWeight:900, fontSize:'2.6rem', letterSpacing:'-0.04em', color:'white', lineHeight:1 }}>
                {history.length}<span style={{ fontSize:'1rem', fontWeight:400, color:'rgba(255,255,255,.3)', marginLeft:6 }}>/ 30 logs</span>
              </div>
              <div style={{ marginTop:12, width:260, height:5, borderRadius:99, background:'rgba(255,255,255,.1)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, width:`${Math.min(100,(history.length/30)*100)}%`, background:'linear-gradient(90deg,#A78BFA,#7C3AED)', boxShadow:'0 0 10px rgba(167,139,250,.5)', transition:'width 1s ease' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:24 }}>
              {[{ label:'Avg Score', value:avgScore ? `${avgScore}%` : '—', color:'#A78BFA' }, { label:'Entries', value:String(history.length), color:'#6EE7B7' }].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'1.8rem', fontWeight:900, letterSpacing:'-0.03em', color }}>{value}</div>
                  <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hg2">
            {/* Log list */}
            <div className="hc">
              <Hdr title="Wellness Log History" sub={`All ${history.length} recorded entries`}/>
              <div style={{ maxHeight:500, overflowY:'auto' }}>
                {history.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 24px', color:'var(--text-muted)' }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📋</div>
                    <div style={{ fontSize:'0.88rem', fontWeight:600, marginBottom:6 }}>No entries yet</div>
                    <div style={{ fontSize:'0.78rem', marginBottom:16 }}>Start logging to build your wellness history.</div>
                    <button onClick={() => setShowLog(true)} style={{ padding:'9px 22px', borderRadius:10, border:'none', cursor:'pointer', background:'rgba(109,40,217,.1)', color:'#7C3AED', fontWeight:700, fontSize:'0.82rem' }}>Log Now</button>
                  </div>
                ) : (
                  <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                    {history.map((e, i) => {
                      const ePct = Math.round(((e.energy - 1) / 4) * 100);
                      const rPct = Math.round(((5 - e.muscle_soreness) / 4) * 100);
                      const sPct = Math.round(((e.sleep - 1) / 4) * 100);
                      const score = e.overall_score ?? Math.round((ePct + rPct + sPct) / 3);
                      const col   = sc(score);
                      return (
                        <div key={e.id}
                          style={{ padding:'13px 15px', borderRadius:12, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:14, borderLeft:`3px solid ${col}`, transition:'background .15s', cursor:'default' }}
                          onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-surface)')}
                          onMouseLeave={ev => (ev.currentTarget.style.background = 'var(--bg-elevated)')}>
                          <div style={{ flexShrink:0, textAlign:'center', width:44 }}>
                            <div style={{ fontWeight:900, fontSize:'1.2rem', letterSpacing:'-0.02em', color:col }}>{score}</div>
                            <div style={{ fontSize:'0.52rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>score</div>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', marginBottom:5 }}>
                              {new Date(e.submitted_at).toLocaleDateString('en-GB',{ weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                            </div>
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {([['Energy', e.energy, '#059669'], ['Sleep', e.sleep, '#6D28D9'], ['Soreness', e.muscle_soreness, '#D97706'], ['Stress', e.stress, '#DC2626']] as [string,number,string][]).map(([l, v, c]) => (
                                <span key={l} style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:99, background:`${c}10`, color:c, border:`1px solid ${c}18` }}>{l}: {v}/5</span>
                              ))}
                            </div>
                            {e.notes && <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:5, fontStyle:'italic' }}>&ldquo;{e.notes}&rdquo;</div>}
                          </div>
                          {i === 0 && <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'0.6rem', fontWeight:700, background:'rgba(109,40,217,.1)', color:'#7C3AED', flexShrink:0 }}>Latest</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Calendar + Goals */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="hc">
                <Hdr title="Log Calendar" sub=""/>
                <div style={{ padding:'14px 16px' }}><MiniCal dates={dates}/></div>
              </div>
              <div className="hc">
                <Hdr title="Season Goals" sub=""/>
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { goal:'30+ wellness logs',    done:history.length >= 30,          color:'#6D28D9' },
                    { goal:'Zero injury flags',     done:true,                           color:'#059669' },
                    { goal:'Consistent Energy ≥ 3', done:!!latest && latest.energy >= 3, color:'#D97706' },
                    { goal:'Sleep Quality ≥ 3',      done:!!latest && latest.sleep >= 3,  color:'#7C3AED' },
                  ].map(({ goal, done, color }) => (
                    <div key={goal} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:done ? `${color}07` : 'var(--bg-elevated)', border:`1px solid ${done ? `${color}18` : 'var(--border-subtle)'}`, transition:'all .15s' }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, background:done ? color : 'transparent', border:`2px solid ${done ? color : 'var(--border-default)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize:'0.76rem', color:done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight:done ? 600 : 400, flex:1 }}>{goal}</span>
                      {done && <span style={{ fontSize:'0.6rem', color, fontWeight:700, flexShrink:0 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!todayLogged && (
            <div className="cta-banner-row" style={{ borderRadius:14, padding:'18px 22px', background:'linear-gradient(135deg,rgba(109,40,217,.07),rgba(5,150,105,.04))', border:'1px solid rgba(109,40,217,.14)' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)' }}>Keep your streak going!</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>Log today to grow your history and improve AI accuracy.</div>
              </div>
              <button onClick={() => setShowLog(true)} style={{ padding:'10px 22px', borderRadius:12, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7C3AED,#6D28D9)', color:'white', fontWeight:700, fontSize:'0.85rem', boxShadow:'0 4px 14px rgba(109,40,217,.3)' }}>
                Log Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
