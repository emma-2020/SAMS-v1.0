'use client';

import { useEffect, useState, useMemo } from 'react';
import { healthApi } from '@sams/api';
import type { HealthEntry } from '@sams/api';

// ─── CSS animations ───────────────────────────────────────────────────────────
const CSS = `
  @keyframes injuryPulse {
    0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.55); }
    70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0   rgba(239,68,68,0); }
  }
  @keyframes warnPulse {
    0%   { box-shadow: 0 0 0 0   rgba(245,158,11,0.45); }
    70%  { box-shadow: 0 0 0 14px rgba(245,158,11,0); }
    100% { box-shadow: 0 0 0 0   rgba(245,158,11,0); }
  }
  @keyframes tabSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── Design tokens ────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: 'var(--shadow-sm)',
};
const cardHdr: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px',
  background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
  borderBottom: '1px solid var(--border-subtle)',
};
const cardT: React.CSSProperties = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' };
const cardS: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 };

function scoreColor(pct: number) {
  if (pct >= 70) return '#10B981';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}
function hexToRgb(hex: string) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(',');
}

// ─── Neon meter row ───────────────────────────────────────────────────────────
function NeonMeter({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sub}</span>
        </div>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, color,
          padding: '1px 9px', borderRadius: 99, background: `${color}14`,
          border: `1px solid ${color}28`,
        }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          boxShadow: `0 0 8px ${color}55`,
          transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

// ─── Sparkline trend ──────────────────────────────────────────────────────────
function TrendLine({ values, color, label, badge }: { values: number[]; color: string; label: string; badge: string }) {
  if (values.length < 2) return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>—</span>
      </div>
      <div style={{ height: 28, background: 'var(--bg-elevated)', borderRadius: 6 }} />
    </div>
  );
  const W = 400, H = 32;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: 4 + ((5 - v) / 4) * (H - 8),
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = `${line} L${W},${H} L0,${H} Z`;
  const uid  = `tl-${label.replace(/\W/g,'')}`;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color, padding: '1px 8px', borderRadius: 99, background: `${color}14` }}>{badge}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#${uid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5}
            fill={color} opacity={i === pts.length - 1 ? 1 : 0.7}
            style={i === pts.length - 1 ? { filter: `drop-shadow(0 0 3px ${color})` } : {}}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Injury risk widget ───────────────────────────────────────────────────────
function InjuryRiskWidget({ risk }: { risk: 'High' | 'Medium' | 'Low' | 'Unknown' }) {
  const color = risk === 'High' ? '#EF4444' : risk === 'Medium' ? '#F59E0B' : risk === 'Low' ? '#10B981' : '#94A3B8';
  const icon  = risk === 'High' ? '⚠️' : risk === 'Medium' ? '⚡' : risk === 'Low' ? '🛡️' : '❓';
  const pulse = risk === 'High' ? 'injuryPulse 2s infinite' : risk === 'Medium' ? 'warnPulse 2.5s infinite' : 'none';
  return (
    <div style={{ ...card, padding: '18px 14px', textAlign: 'center', flex: 1 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px',
        background: `radial-gradient(circle, ${color}18, transparent 72%)`,
        border: `2px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem',
        animation: pulse,
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 5 }}>Injury Risk</div>
      <span style={{
        display: 'inline-block', padding: '3px 12px', borderRadius: 99,
        fontSize: '0.72rem', fontWeight: 800,
        background: `${color}16`, color, border: `1px solid ${color}32`,
      }}>{risk === 'Unknown' ? 'No Data' : risk}</span>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        AI Prediction
      </div>
    </div>
  );
}

// ─── Glassmorphism AI rec card ────────────────────────────────────────────────
function AICard({ type, color, icon, text }: { type: string; color: string; icon: string; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', borderRadius: 12,
      background: `rgba(${hexToRgb(color)},0.06)`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: `1px solid rgba(${hexToRgb(color)},0.2)`,
    } as React.CSSProperties}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${color}16`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
      }}>{icon}</div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <span style={{
          display: 'inline-block', marginBottom: 4,
          padding: '1px 7px', borderRadius: 99, fontSize: '0.58rem', fontWeight: 800,
          background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>{type}</span>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{text}</div>
      </div>
    </div>
  );
}

// ─── Mini calendar ────────────────────────────────────────────────────────────
function MiniCal({ dates }: { dates: string[] }) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const firstDay  = new Date(y, m, 1).getDay();
  const daysCount = new Date(y, m + 1, 0).getDate();
  const today     = now.getDate();
  const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS      = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const logged    = new Set(dates.map(d => { const dd = new Date(d); return dd.getMonth()===m && dd.getFullYear()===y ? dd.getDate() : null; }).filter(Boolean));
  const cells     = [...Array(firstDay).fill(null), ...Array.from({length: daysCount}, (_,i) => i+1)];
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 8 }}>{MONTHS[m]} {y}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:'0.6rem', fontWeight:700, color:'var(--text-muted)', paddingBottom:3 }}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isToday = day === today;
          const hasLog  = logged.has(day as number);
          return (
            <div key={day} style={{
              textAlign:'center', fontSize:'0.7rem', fontWeight: isToday ? 800 : 500,
              padding:'3px 0', borderRadius: 5, position:'relative',
              background: isToday ? '#6366F1' : hasLog ? 'rgba(16,185,129,0.12)' : 'transparent',
              color: isToday ? 'white' : day < today ? 'var(--text-secondary)' : 'var(--text-muted)',
              border: hasLog && !isToday ? '1px solid rgba(16,185,129,0.22)' : '1px solid transparent',
            }}>{day}</div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        {[{c:'#10B981',l:'Logged'},{c:'#6366F1',l:'Today'}].map(({c,l}) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:c }} />
            <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Log modal ────────────────────────────────────────────────────────────────
function LogModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm]   = useState({ energy: 3, sleep: 3, muscle_soreness: 3, stress: 3, notes: '' });
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');
  const FIELDS = [
    { key: 'energy' as const,           label: 'Energy Level',   desc: '1 = Exhausted, 5 = Energised', icon: '⚡' },
    { key: 'sleep' as const,            label: 'Sleep Quality',  desc: '1 = Terrible, 5 = Excellent',  icon: '😴' },
    { key: 'muscle_soreness' as const,  label: 'Muscle Soreness',desc: '1 = None, 5 = Very Sore',      icon: '💪' },
    { key: 'stress' as const,           label: 'Stress Level',   desc: '1 = Calm, 5 = Stressed',       icon: '🧠' },
  ];
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await healthApi.submitHealth(form); onDone(); onClose(); }
    catch { setErr('Failed to submit. Please try again.'); }
    setBusy(false);
  }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ width:'100%', maxWidth:480, background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderRadius:18, overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.4)', animation:'tabSlideIn 0.25s ease' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border-subtle)', background:'linear-gradient(135deg,rgba(99,102,241,0.1),var(--bg-elevated))', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text-primary)' }}>Log Wellness Check-in</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>
              {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'1.1rem', fontWeight:700 }}>×</button>
        </div>
        <form onSubmit={submit} style={{ padding:24, display:'flex', flexDirection:'column', gap:18 }}>
          {FIELDS.map(({ key, label, desc, icon }) => (
            <div key={key}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span>{icon}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.72rem', fontWeight:800, background:'rgba(99,102,241,0.1)', color:'#6366F1' }}>{form[key]}/5</span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} type="button" onClick={() => setForm(p => ({...p, [key]: v}))}
                    style={{ flex:1, height:36, borderRadius:8, cursor:'pointer', border:`2px solid ${form[key]===v ? '#6366F1' : 'var(--border-default)'}`, background: form[key]===v ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)', color: form[key]===v ? '#6366F1' : 'var(--text-secondary)', fontWeight:700, fontSize:'0.9rem', transition:'all 0.12s' }}
                  >{v}</button>
                ))}
              </div>
            </div>
          ))}
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
            style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--border-default)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:'0.85rem', resize:'vertical', minHeight:56, outline:'none' }} />
          {err && <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.22)', color:'#EF4444', fontSize:'0.82rem' }}>{err}</div>}
          <button type="submit" disabled={busy} style={{ padding:12, borderRadius:10, border:'none', cursor: busy ? 'not-allowed' : 'pointer', background: busy ? 'var(--bg-elevated)' : 'linear-gradient(135deg,#6366F1,#4F46E5)', color: busy ? 'var(--text-muted)' : 'white', fontWeight:800, fontSize:'0.9rem', boxShadow: busy ? 'none' : '0 4px 16px rgba(99,102,241,0.35)' }}>
            {busy ? 'Submitting…' : 'Submit Check-in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── AI recommendations builder ───────────────────────────────────────────────
function buildRecs(e: HealthEntry | null) {
  if (!e) return [{ type:'Info', color:'#3B82F6', icon:'💡', text:'Log your wellness to receive personalised AI health insights.' }];
  const recs: {type:string; color:string; icon:string; text:string}[] = [];
  if (e.muscle_soreness >= 4) recs.push({ type:'Alert',   color:'#EF4444', icon:'🦵', text:'Elevated soreness flagged — risk of muscle strain if pace continues.' });
  else if (e.muscle_soreness === 3) recs.push({ type:'Warning', color:'#F59E0B', icon:'🔄', text:'Moderate soreness detected. Schedule a recovery session to prevent fatigue spike.' });
  if (e.sleep < 2)        recs.push({ type:'Alert',   color:'#EF4444', icon:'😴', text:'Poor sleep quality. Prioritise 8h rest and hydration tonight.' });
  else if (e.sleep === 2) recs.push({ type:'Warning', color:'#F59E0B', icon:'🌙', text:'Below-average sleep. Aim for 7–9 hours to optimise athletic recovery.' });
  if (e.stress >= 4)      recs.push({ type:'Warning', color:'#F59E0B', icon:'⚡', text:'High stress detected. Consider light active recovery before next session.' });
  if (e.energy < 2)       recs.push({ type:'Warning', color:'#F59E0B', icon:'🔋', text:'Low energy logged. Reduce sprint drills by 20% and prioritise nutrition.' });
  if (!recs.length) recs.push(
    { type:'Good', color:'#10B981', icon:'✅', text:'Great recovery scores! Maintain current training intensity.' },
    { type:'Info', color:'#3B82F6', icon:'💧', text:'Hydration on track. Keep up with pre-training fluid intake.' },
  );
  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Biometrics & Vitals', 'AI Medical Insights', 'Logs History'] as const;
type Tab = typeof TABS[number];

export default function PlayerHealthPage() {
  const [history, setHistory] = useState<HealthEntry[]>([]);
  const [tab,     setTab]     = useState<Tab>('Overview');
  const [showLog, setShowLog] = useState(false);

  const load = () => healthApi.getMyHealth().then(setHistory).catch(() => {});
  useEffect(() => { load(); }, []);

  const latest = history[0] ?? null;

  const m = useMemo(() => {
    if (!latest) return { energy:0, sleep:0, recovery:0, stress:0, overall:0, risk:'Unknown' as const };
    const energy   = Math.round(((latest.energy - 1) / 4) * 100);
    const sleep    = Math.round(((latest.sleep   - 1) / 4) * 100);
    const recovery = Math.round(((5 - latest.muscle_soreness) / 4) * 100);
    const stress   = Math.round(((5 - latest.stress) / 4) * 100);
    const overall  = latest.overall_score ?? Math.round((energy + sleep + recovery) / 3);
    const risk: 'High'|'Medium'|'Low' =
      latest.muscle_soreness >= 4 || latest.stress >= 4 ? 'High' :
      latest.muscle_soreness === 3 || latest.stress === 3 ? 'Medium' : 'Low';
    return { energy, sleep, recovery, stress, overall, risk };
  }, [latest]);

  const recs  = useMemo(() => buildRecs(latest), [latest]);
  const trend = useMemo(() => [...history].reverse().slice(-5), [history]);

  const todayLogged = !!latest && new Date(latest.submitted_at).toDateString() === new Date().toDateString();
  const dates = history.map(e => e.submitted_at);

  const avgScore = history.length
    ? Math.round(history.reduce((a,e) => a + (e.overall_score ?? 0), 0) / history.length)
    : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {showLog && <LogModal onClose={() => setShowLog(false)} onDone={load} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 style={{ fontWeight:900, fontSize:'1.4rem', color:'var(--text-primary)', margin:0 }}>Health & Wellness</h1>
          <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:3 }}>Medical-grade athlete tracking hub</div>
        </div>
        <button onClick={() => setShowLog(true)} style={{
          padding:'10px 20px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.85rem',
          background: todayLogged ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg,#6366F1,#4F46E5)',
          color: todayLogged ? '#10B981' : 'white',
          border: `1px solid ${todayLogged ? 'rgba(16,185,129,0.28)' : 'transparent'}`,
          boxShadow: todayLogged ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
        } as React.CSSProperties}>
          {todayLogged ? '✓ Logged Today' : '+ Log Wellness'}
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border-subtle)', marginBottom:24, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', background:'none', border:'none', cursor:'pointer',
            fontWeight: t === tab ? 700 : 500, fontSize:'0.875rem', whiteSpace:'nowrap',
            color: t === tab ? '#7C3AED' : 'var(--text-muted)',
            borderBottom: `2px solid ${t === tab ? '#7C3AED' : 'transparent'}`,
            marginBottom:-1, transition:'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          OVERVIEW
      ════════════════════════════════════════════════════════════ */}
      {tab === 'Overview' && (
        <div style={{ animation:'tabSlideIn 0.25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:18 }}>

            {/* Health Metrics */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Health Metrics</div>
                  <div style={cardS}>{latest ? `From wellness log · ${new Date(latest.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : "Log wellness to see metrics"}</div>
                </div>
                <svg viewBox="0 0 44 44" width={44} height={44}>
                  <circle cx={22} cy={22} r={18} fill="none" stroke="var(--bg-elevated)" strokeWidth={5}/>
                  <circle cx={22} cy={22} r={18} fill="none" stroke={scoreColor(m.overall)} strokeWidth={5}
                    strokeDasharray={`${(m.overall/100)*113} 113`} strokeLinecap="round" transform="rotate(-90 22 22)"
                    style={{ transition:'stroke-dasharray 1.4s ease', filter:`drop-shadow(0 0 3px ${scoreColor(m.overall)}80)` }}/>
                  <text x={22} y={26} textAnchor="middle" fontSize={10} fontWeight="800" fill={scoreColor(m.overall)}>{m.overall}%</text>
                </svg>
              </div>
              <div style={{ padding:'18px 20px' }}>
                <NeonMeter pct={m.overall}   color={scoreColor(m.overall)}   label="Overall Wellness"  sub="Combined score" />
                <NeonMeter pct={m.energy}    color={scoreColor(m.energy)}    label="Energy Level"      sub={latest ? `Energy logged: ${latest.energy}/5` : '—'} />
                <NeonMeter pct={m.recovery}  color={scoreColor(m.recovery)}  label="Recovery Status"   sub={latest ? `Soreness logged: ${latest.muscle_soreness}/5` : '—'} />
                <NeonMeter pct={m.sleep}     color={scoreColor(m.sleep)}     label="Sleep Quality"     sub={latest ? `Sleep logged: ${latest.sleep}/5` : '—'} />
              </div>
            </div>

            {/* AI Recommendations */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>AI Recommendations</div>
                  <div style={cardS}>Based on your data</div>
                </div>
                <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.62rem', fontWeight:800, background:'rgba(99,102,241,0.12)', color:'#7C3AED', border:'1px solid rgba(99,102,241,0.22)', letterSpacing:'0.1em' }}>AI</span>
              </div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                {recs.map((r,i) => <AICard key={i} {...r} />)}
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:18 }}>

            {/* Wellness Trend */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Wellness Trend</div>
                  <div style={cardS}>Last {trend.length} entries</div>
                </div>
              </div>
              <div style={{ padding:'16px 20px' }}>
                {trend.length > 0 ? (
                  <>
                    <TrendLine values={trend.map(e => e.energy)}            color="#10B981" label="Fatigue"  badge={latest ? `${latest.energy}/5` : '—'} />
                    <TrendLine values={trend.map(e => 6-e.muscle_soreness)} color="#F59E0B" label="Soreness" badge={latest ? `${latest.muscle_soreness}/5` : '—'} />
                    <TrendLine values={trend.map(e => e.sleep)}             color="#6366F1" label="Sleep"    badge={latest ? `${latest.sleep}/5` : '—'} />
                  </>
                ) : (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)' }}>
                    <div style={{ fontSize:'1.8rem', marginBottom:8 }}>📈</div>
                    <div style={{ fontSize:'0.82rem' }}>Log multiple entries to see your wellness trends</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right mini-column */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <InjuryRiskWidget risk={latest ? m.risk : 'Unknown'} />
              <div style={{ ...card, padding:'16px 14px', textAlign:'center' }}>
                <div style={{ fontSize:'1.2rem', marginBottom:5 }}>📅</div>
                <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text-primary)' }}>
                  {history.length} <span style={{ fontSize:'0.68rem', fontWeight:500, color:'var(--text-muted)' }}>/ 30</span>
                </div>
                <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>Season logs</div>
                <div style={{ marginTop:8, height:4, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(history.length/30)*100)}%`, borderRadius:99, background:'linear-gradient(90deg,#6366F1,#7C3AED)', boxShadow:'0 0 7px rgba(99,102,241,0.4)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          {!todayLogged && (
            <div style={{
              borderRadius:14, padding:'20px 24px',
              background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(124,58,237,0.05))',
              border:'1px solid rgba(99,102,241,0.18)',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              backdropFilter:'blur(8px)',
              WebkitBackdropFilter:'blur(8px)',
            } as React.CSSProperties}>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>Log your wellness today</div>
                <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:3 }}>Track fatigue, soreness, and sleep to get personalised recommendations.</div>
              </div>
              <button onClick={() => setShowLog(true)} style={{ padding:'11px 24px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366F1,#4F46E5)', color:'white', fontWeight:800, fontSize:'0.9rem', boxShadow:'0 4px 16px rgba(99,102,241,0.35)', transition:'all 0.15s' }}>
                Log Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          BIOMETRICS & VITALS
      ════════════════════════════════════════════════════════════ */}
      {tab === 'Biometrics & Vitals' && (
        <div style={{ animation:'tabSlideIn 0.25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Vital cards row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:14 }}>
            {[
              { label:'Energy',        pct:m.energy,   color:'#10B981', icon:'⚡', raw:latest?.energy,          desc:'1=Exhausted · 5=Energised' },
              { label:'Sleep Quality', pct:m.sleep,    color:'#6366F1', icon:'😴', raw:latest?.sleep,           desc:'1=Terrible · 5=Excellent'  },
              { label:'Recovery',      pct:m.recovery, color:'#F59E0B', icon:'🔄', raw:latest?.muscle_soreness, desc:'Soreness inverted'          },
              { label:'Stress Mgmt',   pct:m.stress,   color:'#EF4444', icon:'🧠', raw:latest?.stress,          desc:'1=Calm · 5=Stressed (inv.)' },
            ].map(({ label, pct, color, icon, raw, desc }) => (
              <div key={label} style={{ ...card, padding:'18px 16px', borderLeft:`3px solid ${color}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${color}14`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem' }}>{icon}</div>
                  <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'0.65rem', fontWeight:700, background:`${color}14`, color }}>{raw != null ? `${raw}/5` : '—'}</span>
                </div>
                <div style={{ fontSize:'2rem', fontWeight:900, color, lineHeight:1 }}>{pct}<span style={{ fontSize:'0.85rem', color:'var(--text-muted)', fontWeight:500 }}>%</span></div>
                <div style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
                <div style={{ marginTop:8, height:3, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99, boxShadow:`0 0 6px ${color}55`, transition:'width 1.2s ease' }} />
                </div>
                <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', marginTop:4 }}>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:18 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Detailed breakdown */}
              <div style={card}>
                <div style={cardHdr}>
                  <div>
                    <div style={cardT}>Biometric Detail</div>
                    <div style={cardS}>Raw values from latest wellness log</div>
                  </div>
                </div>
                <div style={{ padding:'18px 20px' }}>
                  {[
                    { label:'Energy Level',   value:latest?.energy,          max:5, color:'#10B981', note:'Higher = more energised' },
                    { label:'Sleep Quality',  value:latest?.sleep,           max:5, color:'#6366F1', note:'Higher = better sleep' },
                    { label:'Muscle Soreness',value:latest?.muscle_soreness, max:5, color:'#F59E0B', note:'Higher = more sore (inverted for score)' },
                    { label:'Stress Level',   value:latest?.stress,          max:5, color:'#EF4444', note:'Higher = more stressed (inverted for score)' },
                  ].map(({ label, value, max, color, note }) => (
                    <div key={label} style={{ marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <div>
                          <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</div>
                          <div style={{ fontSize:'0.63rem', color:'var(--text-muted)', marginTop:1 }}>{note}</div>
                        </div>
                        <span style={{ fontSize:'0.9rem', fontWeight:800, color, alignSelf:'flex-start' }}>{value != null ? `${value}/${max}` : '—'}</span>
                      </div>
                      <div style={{ height:5, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, width: value != null ? `${(value/max)*100}%` : '0%', background:`linear-gradient(90deg,${color}88,${color})`, boxShadow:`0 0 5px ${color}44`, transition:'width 1.2s ease' }} />
                      </div>
                    </div>
                  ))}
                  {latest?.notes && (
                    <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', fontSize:'0.78rem', color:'var(--text-secondary)', fontStyle:'italic' }}>
                      Note: &ldquo;{latest.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Recovery trend */}
              <div style={card}>
                <div style={cardHdr}>
                  <div>
                    <div style={cardT}>Recovery Trend</div>
                    <div style={cardS}>Last {trend.length} logged entries</div>
                  </div>
                </div>
                <div style={{ padding:'16px 20px' }}>
                  {trend.length > 0 ? (
                    <>
                      <TrendLine values={trend.map(e=>e.energy)}            color="#10B981" label="Energy"          badge={latest ? `${latest.energy}/5`           : '—'} />
                      <TrendLine values={trend.map(e=>6-e.muscle_soreness)} color="#F59E0B" label="Recovery (Sor.)" badge={latest ? `${latest.muscle_soreness}/5`   : '—'} />
                      <TrendLine values={trend.map(e=>e.sleep)}             color="#6366F1" label="Sleep Quality"   badge={latest ? `${latest.sleep}/5`             : '—'} />
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'20px 0', fontSize:'0.82rem', color:'var(--text-muted)' }}>Log multiple entries to see recovery trends.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Overall gauge */}
              <div style={{ ...card, padding:'20px 16px', textAlign:'center' }}>
                <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)', marginBottom:14 }}>Overall Score</div>
                <svg viewBox="0 0 100 100" width={100} height={100} style={{ margin:'0 auto', display:'block' }}>
                  <circle cx={50} cy={50} r={38} fill="none" stroke="var(--bg-elevated)" strokeWidth={9}/>
                  <circle cx={50} cy={50} r={38} fill="none" stroke={scoreColor(m.overall)} strokeWidth={9}
                    strokeDasharray={`${(m.overall/100)*239} 239`} strokeLinecap="round" transform="rotate(-90 50 50)"
                    style={{ transition:'stroke-dasharray 1.5s ease', filter:`drop-shadow(0 0 5px ${scoreColor(m.overall)}88)` }}/>
                  <text x={50} y={47} textAnchor="middle" fontSize={18} fontWeight="900" fill="var(--text-primary)">{m.overall}</text>
                  <text x={50} y={60} textAnchor="middle" fontSize={8} fill="var(--text-muted)">/ 100</text>
                </svg>
                <span style={{ marginTop:10, display:'inline-block', padding:'3px 12px', borderRadius:99, fontSize:'0.72rem', fontWeight:800, background:`${scoreColor(m.overall)}14`, color:scoreColor(m.overall), border:`1px solid ${scoreColor(m.overall)}28` }}>
                  {m.overall >= 70 ? 'Fully Fit' : m.overall >= 40 ? 'Moderate' : 'Needs Rest'}
                </span>
                <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginTop:8 }}>
                  {latest ? `Logged: ${new Date(latest.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : 'No data yet'}
                </div>
              </div>
              {/* Calendar */}
              <div style={card}>
                <div style={cardHdr}><div style={cardT}>Log Calendar</div></div>
                <div style={{ padding:'12px 14px' }}><MiniCal dates={dates} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          AI MEDICAL INSIGHTS
      ════════════════════════════════════════════════════════════ */}
      {tab === 'AI Medical Insights' && (
        <div style={{ animation:'tabSlideIn 0.25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Injury risk + assessment */}
          <div style={{ display:'grid', gridTemplateColumns:'196px 1fr', gap:18 }}>
            <InjuryRiskWidget risk={latest ? m.risk : 'Unknown'} />
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>AI Health Assessment</div>
                  <div style={cardS}>Comprehensive wellness analysis</div>
                </div>
                <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.62rem', fontWeight:800, background:'rgba(99,102,241,0.12)', color:'#7C3AED', border:'1px solid rgba(99,102,241,0.22)', letterSpacing:'0.1em' }}>AI</span>
              </div>
              <div style={{ padding:'14px 20px' }}>
                {!latest ? (
                  <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-muted)', fontSize:'0.85rem' }}>Log your wellness to receive AI-powered medical insights.</div>
                ) : (
                  <div>
                    {[
                      { label:'Energy Level',      pct:m.energy,   color:scoreColor(m.energy)   },
                      { label:'Sleep Quality',      pct:m.sleep,    color:scoreColor(m.sleep)    },
                      { label:'Recovery Status',    pct:m.recovery, color:scoreColor(m.recovery) },
                      { label:'Stress Management',  pct:m.stress,   color:scoreColor(m.stress)   },
                    ].map(({ label, pct, color }) => (
                      <div key={label} style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
                          <span style={{ fontSize:'0.78rem', fontWeight:800, color }}>{pct}%</span>
                        </div>
                        <div style={{ height:4, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:99, boxShadow:`0 0 6px ${color}44`, transition:'width 1.2s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic alerts */}
          <div style={card}>
            <div style={cardHdr}>
              <div>
                <div style={cardT}>Diagnostic Alerts & Recommendations</div>
                <div style={cardS}>Personalised insights from your wellness data</div>
              </div>
            </div>
            <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
              {recs.map((r,i) => <AICard key={i} {...r} />)}
            </div>
          </div>

          {/* Recovery protocols */}
          <div style={card}>
            <div style={cardHdr}>
              <div>
                <div style={cardT}>Recovery Protocols</div>
                <div style={cardS}>Recommended based on your current load</div>
              </div>
            </div>
            <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
              {[
                { icon:'🧊', title:'Ice Bath',     duration:'12–15 min', status:'Recommended', color:'#3B82F6', note:'Post high-intensity day' },
                { icon:'💤', title:'Sleep Target', duration:'8–9 hours', status:'Priority',    color:'#6366F1', note:'Deep sleep > REM ratio'   },
                { icon:'💧', title:'Hydration',    duration:'3.5 L/day', status:'On Track',    color:'#10B981', note:'Electrolytes after sprint' },
                { icon:'🧘', title:'Stretching',   duration:'20 min',    status:'Daily',       color:'#F59E0B', note:'Focus on hip flexors'      },
              ].map(({ icon, title, duration, status, color, note }) => (
                <div key={title} style={{ padding:'14px 16px', borderRadius:12, background:`${color}08`, border:`1px solid ${color}1E`, backdropFilter:'blur(4px)' }}>
                  <div style={{ fontSize:'1.5rem', marginBottom:8 }}>{icon}</div>
                  <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>{title}</div>
                  <div style={{ fontSize:'1rem', fontWeight:900, color, marginTop:2 }}>{duration}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:4 }}>{note}</div>
                  <span style={{ display:'inline-block', marginTop:8, padding:'2px 8px', borderRadius:99, fontSize:'0.62rem', fontWeight:700, background:`${color}18`, color }}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Medical flags */}
          {latest && (latest.muscle_soreness >= 4 || latest.stress >= 4 || latest.sleep < 2) && (
            <div style={{ borderRadius:14, padding:'18px 22px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', backdropFilter:'blur(8px)' } as React.CSSProperties}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🚨</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#EF4444' }}>Medical Attention Flags</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:1 }}>One or more wellness metrics require attention</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {latest.muscle_soreness >= 4 && <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', display:'flex', gap:8 }}><span style={{ color:'#EF4444' }}>•</span>High soreness ({latest.muscle_soreness}/5) — consider active rest or physiotherapy</div>}
                {latest.stress >= 4            && <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', display:'flex', gap:8 }}><span style={{ color:'#EF4444' }}>•</span>Elevated stress ({latest.stress}/5) — mental performance coaching recommended</div>}
                {latest.sleep < 2              && <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', display:'flex', gap:8 }}><span style={{ color:'#EF4444' }}>•</span>Critical sleep score ({latest.sleep}/5) — notify medical staff if persistent</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          LOGS HISTORY
      ════════════════════════════════════════════════════════════ */}
      {tab === 'Logs History' && (
        <div style={{ animation:'tabSlideIn 0.25s ease', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Season hero */}
          <div style={{ background:'linear-gradient(135deg,#0D1B3E,#1a2d5a)', borderRadius:16, padding:'22px 26px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Season Progress</div>
              <div style={{ fontWeight:900, fontSize:'2.5rem', color:'white', lineHeight:1 }}>
                {history.length}<span style={{ fontSize:'1rem', fontWeight:400, color:'rgba(255,255,255,0.3)', marginLeft:4 }}>/ 30 logs</span>
              </div>
              <div style={{ marginTop:10, width:260, height:5, borderRadius:99, background:'rgba(255,255,255,0.08)' }}>
                <div style={{ height:'100%', borderRadius:99, width:`${Math.min(100,(history.length/30)*100)}%`, background:'linear-gradient(90deg,#6366F1,#10B981)', boxShadow:'0 0 10px rgba(99,102,241,0.5)' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:20 }}>
              {[
                { label:'Avg Overall', value: avgScore ? `${avgScore}%` : '—', color:'#6366F1' },
                { label:'Total Entries', value: String(history.length), color:'#10B981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'1.6rem', fontWeight:900, color }}>{value}</div>
                  <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.32)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 256px', gap:18 }}>
            {/* Log list */}
            <div style={card}>
              <div style={cardHdr}>
                <div>
                  <div style={cardT}>Wellness Log History</div>
                  <div style={cardS}>All {history.length} recorded entries</div>
                </div>
              </div>
              <div style={{ maxHeight:480, overflowY:'auto' }}>
                {history.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 24px', color:'var(--text-muted)' }}>
                    <div style={{ fontSize:'2rem', marginBottom:10 }}>📋</div>
                    <div style={{ fontSize:'0.85rem' }}>No entries yet. Start logging to build your history.</div>
                    <button onClick={() => setShowLog(true)} style={{ marginTop:14, padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer', background:'rgba(99,102,241,0.1)', color:'#7C3AED', fontWeight:700, fontSize:'0.82rem' }}>Log Now</button>
                  </div>
                ) : (
                  <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                    {history.map((e, i) => {
                      const ePct = Math.round(((e.energy-1)/4)*100);
                      const rPct = Math.round(((5-e.muscle_soreness)/4)*100);
                      const sPct = Math.round(((e.sleep-1)/4)*100);
                      const sc   = e.overall_score ?? Math.round((ePct+rPct+sPct)/3);
                      const col  = scoreColor(sc);
                      return (
                        <div key={e.id} style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:14, borderLeft:`3px solid ${col}` }}>
                          <div style={{ flexShrink:0, textAlign:'center', width:42 }}>
                            <div style={{ fontWeight:800, fontSize:'1.1rem', color:col }}>{sc}</div>
                            <div style={{ fontSize:'0.55rem', color:'var(--text-muted)', textTransform:'uppercase' }}>score</div>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>
                              {new Date(e.submitted_at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                            </div>
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                              {([['Energy',e.energy,'#10B981'],['Sleep',e.sleep,'#6366F1'],['Soreness',e.muscle_soreness,'#F59E0B'],['Stress',e.stress,'#EF4444']] as [string,number,string][]).map(([l,v,c]) => (
                                <span key={l} style={{ fontSize:'0.62rem', fontWeight:700, padding:'1px 6px', borderRadius:99, background:`${c}12`, color:c }}>{l}: {v}/5</span>
                              ))}
                            </div>
                            {e.notes && <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>&ldquo;{e.notes}&rdquo;</div>}
                          </div>
                          {i === 0 && <span style={{ padding:'2px 7px', borderRadius:99, fontSize:'0.6rem', fontWeight:700, background:'rgba(99,102,241,0.12)', color:'#7C3AED' }}>Latest</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Calendar + goals */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={card}>
                <div style={cardHdr}><div style={cardT}>Log Calendar</div></div>
                <div style={{ padding:'12px 14px' }}><MiniCal dates={dates} /></div>
              </div>
              <div style={card}>
                <div style={cardHdr}><div style={cardT}>Season Goals</div></div>
                <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { goal:'30+ wellness logs',      done: history.length >= 30,              color:'#6366F1' },
                    { goal:'Zero injury flags',       done: true,                               color:'#10B981' },
                    { goal:'Consistent Energy ≥ 3',  done: !!latest && latest.energy >= 3,    color:'#F59E0B' },
                    { goal:'Sleep Quality ≥ 3',       done: !!latest && latest.sleep >= 3,     color:'#3B82F6' },
                  ].map(({ goal, done, color }) => (
                    <div key={goal} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8, background: done ? `${color}08` : 'var(--bg-elevated)', border:`1px solid ${done ? `${color}22` : 'var(--border-subtle)'}` }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, background: done ? color : 'transparent', border:`2px solid ${done ? color : 'var(--border-default)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize:'0.75rem', color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 600 : 400 }}>{goal}</span>
                      {done && <span style={{ marginLeft:'auto', fontSize:'0.6rem', color, fontWeight:700 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!todayLogged && (
            <div style={{ borderRadius:14, padding:'18px 22px', background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(16,185,129,0.04))', border:'1px solid rgba(99,102,241,0.16)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)' }}>Keep your streak going!</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>Log today to grow your history and improve AI accuracy.</div>
              </div>
              <button onClick={() => setShowLog(true)} style={{ padding:'10px 20px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366F1,#4F46E5)', color:'white', fontWeight:700, fontSize:'0.85rem', boxShadow:'0 4px 14px rgba(99,102,241,0.3)' }}>Log Today</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
