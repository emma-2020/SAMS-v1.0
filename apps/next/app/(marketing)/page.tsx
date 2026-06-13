'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, CalendarDays, LayoutDashboard } from 'lucide-react';

// ── Static data ──────────────────────────────────────────────────────

const FEATURES = [
  {
    gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
    glow:     'rgba(124,58,237,0.35)',
    glowBorder: 'rgba(124,58,237,0.32)',
    icon:     <Layers size={22} strokeWidth={1.6} />,
    title: 'Automated Multi-Tenant Provisioning',
    desc:  'Each academy gets a fully isolated, dedicated workspace automatically provisioned. Zero manual setup — from enrollment request to live platform in under 60 seconds.',
    tags:  ['Instant setup', 'Isolated data', 'Zero config'],
  },
  {
    gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    glow:     'rgba(37,99,235,0.35)',
    glowBorder: 'rgba(37,99,235,0.32)',
    icon:     <CalendarDays size={22} strokeWidth={1.6} />,
    title: 'Smart Scheduling Sync',
    desc:  'Training sessions, fixtures, and recovery windows coordinated seamlessly across your entire roster. Conflicts detected and resolved automatically in real time.',
    tags:  ['Calendar sync', 'Conflict detection', 'Multi-team'],
  },
  {
    gradient: 'linear-gradient(135deg, #059669, #047857)',
    glow:     'rgba(5,150,105,0.35)',
    glowBorder: 'rgba(5,150,105,0.32)',
    icon:     <LayoutDashboard size={22} strokeWidth={1.6} />,
    title: 'Centralized Operational Command',
    desc:  'Admin, coach, player, and parent dashboards unified under one platform. Every role sees exactly what they need — purpose-built, nothing bloated.',
    tags:  ['4 role dashboards', 'Real-time data', 'RBAC'],
  },
];

const ROLES = [
  {
    key:          'admin',
    label:        'Admin',
    color:        '#7C3AED',
    bg:           'rgba(124,58,237,0.12)',
    border:       'rgba(124,58,237,0.32)',
    badge:        'Super-Admin Control Plane',
    headline:     'Total Academy Oversight',
    desc:         'The command centre for academy directors. Provision new academies, manage the full roster, control invitations, and view cross-team performance analytics — all from a single elevated dashboard.',
    capabilities: [
      'Multi-team creation & management',
      'Role-based invitation system with email delivery',
      'Academy enrollment request pipeline',
      'Advanced analytics & registration funnels',
      'Full member lifecycle management',
    ],
  },
  {
    key:          'coach',
    label:        'Coach',
    color:        '#2563EB',
    bg:           'rgba(37,99,235,0.12)',
    border:       'rgba(37,99,235,0.32)',
    badge:        'Active Roster & Attendance',
    headline:     'Run Elite Training Operations',
    desc:         "Coach-level tools built for the touchline. View your full squad's health status, log attendance in seconds, build customized training plans, and assign targeted workouts to individual players.",
    capabilities: [
      'Live roster table with health status overlays',
      'One-tap attendance logging per session',
      'Custom workout plan builder with exercises',
      'Player profile deep-dives (health, history)',
      'Team event & session scheduling',
    ],
  },
  {
    key:          'player',
    label:        'Player',
    color:        '#059669',
    bg:           'rgba(5,150,105,0.12)',
    border:       'rgba(5,150,105,0.32)',
    badge:        'Workouts & Daily Wellness',
    headline:     'Own Your Performance Journey',
    desc:         'A personal performance hub for every athlete. Check your training schedule, complete daily wellness check-ins, track assigned workouts, and stay connected with your team through real-time chat.',
    capabilities: [
      'Personal schedule & fixture calendar',
      'Daily wellness & health check-in flow',
      'Assigned workout tracker with completion',
      'Team chat & group communications',
      'Performance history & trend visibility',
    ],
  },
  {
    key:          'parent',
    label:        'Parent',
    color:        '#D97706',
    bg:           'rgba(217,119,6,0.12)',
    border:       'rgba(217,119,6,0.32)',
    badge:        'Multi-child Performance Streams',
    headline:     'Stay Close to Your Athlete',
    desc:         "A dedicated parent portal that keeps you informed without overwhelming you. Monitor your child's schedule, health summaries, and training loads — always transparent, always up-to-date.",
    capabilities: [
      'Child schedule & upcoming fixture view',
      'Health & wellness summary dashboard',
      'Training load & attendance history',
      'Multi-child support under one account',
      'Direct communication with coaching staff',
    ],
  },
];

const PLANS = [
  {
    name:      'Development',
    tagline:   'For new academies getting started',
    price:     'Free',
    period:    'forever',
    color:     '#64748B',
    border:    'rgba(100,116,139,0.22)',
    glow:      'rgba(100,116,139,0.12)',
    highlight: false,
    cta:       'Get Started',
    features:  [
      'Up to 25 active players',
      '1 team',
      'Core scheduling & attendance',
      'Basic health monitoring',
      'Team chat',
      'Email support',
    ],
  },
  {
    name:      'Pro Academy',
    tagline:   'For growing academies with multiple teams',
    price:     '$99',
    period:    '/ month',
    color:     '#7C3AED',
    border:    'rgba(124,58,237,0.45)',
    glow:      'rgba(124,58,237,0.18)',
    highlight: true,
    cta:       'Get Started',
    features:  [
      'Up to 200 active players',
      'Unlimited teams',
      'Advanced scheduling & conflict detection',
      'Full health & wellness suite',
      'Workout plan builder',
      'Parent portal access',
      'Priority support',
    ],
  },
  {
    name:      'Elite Enterprise',
    tagline:   'Custom infrastructure for top-tier organizations',
    price:     'Custom',
    period:    'pricing',
    color:     '#D97706',
    border:    'rgba(217,119,6,0.28)',
    glow:      'rgba(217,119,6,0.1)',
    highlight: false,
    cta:       'Contact Sales',
    features:  [
      'Unlimited players & teams',
      'Multi-academy management',
      'Custom role configurations',
      'Dedicated infrastructure',
      'White-label options',
      'SLA guarantee',
      'Dedicated account manager',
    ],
  },
];

const STATS = [
  { value: '4',    label: 'Stakeholder Roles'  },
  { value: '100%', label: 'Tenant Isolation'   },
  { value: '∞',   label: 'Teams per Academy'  },
  { value: '<60s', label: 'Provisioning Time'  },
];

// ── Shared style constants ───────────────────────────────────────────

const SEC_LABEL = (bg: string, border: string, color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '5px 14px', borderRadius: 99, marginBottom: 18,
  background: bg, border: `1px solid ${border}`,
  fontSize: '0.63rem', fontWeight: 800,
  letterSpacing: '0.15em', textTransform: 'uppercase',
  color,
});

const SEC_TITLE: React.CSSProperties = {
  fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)',
  fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.12,
  color: '#F1F5F9', margin: '0 0 16px',
};

const SEC_SUB: React.CSSProperties = {
  fontSize: '0.975rem', lineHeight: 1.72,
  color: 'rgba(255,255,255,0.42)',
  maxWidth: 540, margin: '0 auto',
};

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 22,
};

// ── Page ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeRole, setActiveRole] = useState('admin');
  const role = ROLES.find(r => r.key === activeRole)!;

  return (
    <>
      {/* ══════════════════════════════════════════════ */}
      {/*  HERO                                          */}
      {/* ══════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: 'clamp(80px, 12vh, 120px) clamp(20px, 5vw, 80px) clamp(60px, 8vh, 100px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot-grid texture — ultra-faint, edge-vignette masked */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 50%, black 25%, transparent 100%)',
          maskImage:       'radial-gradient(ellipse 85% 75% at 50% 50%, black 25%, transparent 100%)',
        }} />

        {/* Ambient orbs — slow-pulsing */}
        <div style={{ position: 'absolute', top: '8%', right: '6%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)', filter: 'blur(48px)', pointerEvents: 'none', animation: 'orb-a 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '4%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', filter: 'blur(56px)', pointerEvents: 'none', animation: 'orb-b 13s ease-in-out infinite 2s' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 760, height: 760, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)', filter: 'blur(64px)', pointerEvents: 'none', transform: 'translate(-50%,-50%)', animation: 'orb-c 11s ease-in-out infinite 4s' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 840 }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 16px', borderRadius: 99, marginBottom: 30,
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.26)',
            fontSize: '0.65rem', fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#A78BFA',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block', boxShadow: '0 0 8px #8B5CF6' }} />
            Platform v1.0 — Now Accepting Applications
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 4.2rem)',
            fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.07,
            color: '#F1F5F9', margin: '0 0 26px',
          }}>
            The Operating System<br />for{' '}
            <span style={{
              background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 55%, #6D28D9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Elite Sports Academies
            </span>
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: 1.74,
            color: 'rgba(255,255,255,0.46)', margin: '0 auto 48px',
            maxWidth: 620,
          }}>
            Unified scheduling, attendance tracking, health monitoring, and team communications — purpose-built for the performance academy of tomorrow.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 72 }}>
            <Link
              href="/enroll"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '14px 32px', borderRadius: 99,
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                color: '#fff', fontSize: '0.95rem', fontWeight: 800,
                textDecoration: 'none', letterSpacing: '-0.01em',
                boxShadow: '0 12px 36px rgba(109,40,217,0.55)',
                transition: 'transform 0.18s, box-shadow 0.18s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 20px 52px rgba(109,40,217,0.72)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 36px rgba(109,40,217,0.55)';
              }}
            >
              Launch Your Workspace
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>

            <a
              href="#features"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '14px 32px', borderRadius: 99,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#F1F5F9', fontSize: '0.95rem', fontWeight: 700,
                textDecoration: 'none', letterSpacing: '-0.01em',
                transition: 'background 0.18s, border-color 0.18s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.09)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.24)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.14)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: 0,
            padding: '22px clamp(20px, 4vw, 48px)',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {STATS.flatMap(({ value, label }, i) => {
              const stat = (
                <div key={label} style={{ textAlign: 'center', padding: '0 clamp(16px, 3vw, 36px)' }}>
                  <div style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 5, letterSpacing: '0.04em' }}>
                    {label}
                  </div>
                </div>
              );
              if (i < STATS.length - 1) {
                return [stat, <div key={`d${i}`} style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />];
              }
              return [stat];
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  FEATURES  (id="features")                    */}
      {/* ══════════════════════════════════════════════ */}
      <section id="features" style={{
        padding: '100px clamp(20px, 5vw, 80px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 54 }}>
            <div style={SEC_LABEL('rgba(37,99,235,0.1)', 'rgba(37,99,235,0.24)', '#93C5FD')}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
              Platform Capabilities
            </div>
            <h2 style={SEC_TITLE}>
              Enterprise-Grade Infrastructure<br />
              <span style={{ background: 'linear-gradient(135deg, #93C5FD, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Built for the Modern Academy
              </span>
            </h2>
            <p style={SEC_SUB}>
              Everything your academy needs to operate at peak efficiency — from day-one provisioning to multi-team performance analytics.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 22,
          }}>
            {FEATURES.map(f => (
              <div
                key={f.title}
                style={{
                  ...GLASS,
                  padding: '32px 28px',
                  transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-6px)';
                  el.style.boxShadow = `0 32px 72px ${f.glow}`;
                  el.style.borderColor = f.glowBorder;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                  el.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                {/* Lucide icon inside gradient + glass container */}
                <div style={{
                  width: 52, height: 52, borderRadius: 14, marginBottom: 22,
                  background: f.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  boxShadow: `0 8px 28px ${f.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}>
                  {f.icon}
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 10px', letterSpacing: '-0.015em', lineHeight: 1.3 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.43)', lineHeight: 1.7, margin: '0 0 20px' }}>
                  {f.desc}
                </p>

                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {f.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '4px 10px', borderRadius: 99,
                      fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.48)',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  ROLES  (id="roles")                          */}
      {/* ══════════════════════════════════════════════ */}
      <section id="roles" style={{
        padding: '100px clamp(20px, 5vw, 80px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.012)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={SEC_LABEL('rgba(124,58,237,0.1)', 'rgba(124,58,237,0.24)', '#A78BFA')}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block' }} />
              4-Role Value Matrix
            </div>
            <h2 style={SEC_TITLE}>
              Built for Every Stakeholder<br />
              <span style={{ background: 'linear-gradient(135deg, #C4B5FD, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                in Your Academy
              </span>
            </h2>
            <p style={SEC_SUB}>
              One platform, four distinct experiences — each role gets exactly the tools and visibility they need.
            </p>
          </div>

          {/* Role tabs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
            {ROLES.map(r => {
              const active = activeRole === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setActiveRole(r.key)}
                  style={{
                    padding: '10px 24px', borderRadius: 99,
                    border: active ? `1px solid ${r.border}` : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700,
                    letterSpacing: '0.01em',
                    background: active ? r.bg : 'rgba(255,255,255,0.04)',
                    color: active ? r.color : 'rgba(255,255,255,0.38)',
                    boxShadow: active ? `0 0 20px ${r.bg}` : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Role detail panel — key remounts on change so role-in fires every time */}
          <div key={activeRole} style={{
            ...GLASS,
            border: `1px solid ${role.border}`,
            borderRadius: 24,
            padding: 'clamp(28px, 4vw, 44px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 44, alignItems: 'center',
            boxShadow: `0 24px 64px ${role.bg}`,
            animation: 'role-in 0.28s ease both',
          }}>
            {/* Left: role description */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '4px 13px', borderRadius: 99, marginBottom: 18,
                background: role.bg, border: `1px solid ${role.border}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: role.color, display: 'inline-block', boxShadow: `0 0 8px ${role.color}` }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: role.color }}>
                  {role.badge}
                </span>
              </div>
              <h3 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#F1F5F9', margin: '0 0 14px', letterSpacing: '-0.025em' }}>
                {role.headline}
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.74, color: 'rgba(255,255,255,0.44)', margin: 0 }}>
                {role.desc}
              </p>
            </div>

            {/* Right: capabilities list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {role.capabilities.map(cap => (
                <div key={cap} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1,
                    background: role.bg, border: `1px solid ${role.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: role.color,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
                    {cap}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  PRICING  (id="pricing")                      */}
      {/* ══════════════════════════════════════════════ */}
      <section id="pricing" style={{
        padding: '100px clamp(20px, 5vw, 80px) 120px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 54 }}>
            <div style={SEC_LABEL('rgba(217,119,6,0.1)', 'rgba(217,119,6,0.24)', '#FCD34D')}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
              Transparent Pricing
            </div>
            <h2 style={SEC_TITLE}>
              Plans Built for Every<br />
              <span style={{ background: 'linear-gradient(135deg, #FCD34D, #D97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Stage of Growth
              </span>
            </h2>
            <p style={SEC_SUB}>
              Start free, scale when you're ready. Every plan includes full access to the core platform — no feature paywalls.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 20, alignItems: 'start',
          }}>
            {PLANS.map(plan => (
              <div
                key={plan.name}
                style={{
                  ...GLASS,
                  border: `1px solid ${plan.border}`,
                  background: plan.highlight ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.025)',
                  borderRadius: 24,
                  padding: `${plan.highlight ? 40 : 32}px 28px 28px`,
                  position: 'relative',
                  transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-6px)';
                  el.style.boxShadow = `0 32px 72px ${plan.glow}`;
                  if (!plan.highlight) el.style.borderColor = plan.border;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                  el.style.borderColor = plan.border;
                }}
              >
                {/* Most Popular badge */}
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 18px', borderRadius: 99,
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    color: '#fff', fontSize: '0.63rem', fontWeight: 800,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    boxShadow: '0 4px 16px rgba(109,40,217,0.55)',
                    whiteSpace: 'nowrap',
                  }}>
                    Most Popular
                  </div>
                )}

                {/* Tier label + tagline */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px', borderRadius: 99, marginBottom: 12,
                    background: `${plan.color}1A`,
                    border: `1px solid ${plan.color}40`,
                    fontSize: '0.63rem', fontWeight: 800,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: plan.color,
                  }}>
                    {plan.name}
                  </span>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>
                    {plan.tagline}
                  </p>
                </div>

                {/* Price */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 6,
                  paddingBottom: 22, marginBottom: 22,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                    {plan.period}
                  </span>
                </div>

                {/* Feature list */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {plan.features.map(feat => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Link
                  href="/enroll"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 20px', borderRadius: 12,
                    background: plan.highlight
                      ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
                      : 'rgba(255,255,255,0.06)',
                    border: plan.highlight ? 'none' : `1px solid ${plan.border}`,
                    color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontSize: '0.88rem', fontWeight: 700,
                    textDecoration: 'none', letterSpacing: '0.01em',
                    boxShadow: plan.highlight ? '0 8px 26px rgba(109,40,217,0.42)' : 'none',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 14px 40px rgba(109,40,217,0.64)';
                      (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.02)';
                    } else {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 26px rgba(109,40,217,0.42)';
                      (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                    } else {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
                    }
                  }}
                >
                  {plan.cta}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes orb-a {
          0%,100% { transform: scale(1);    opacity: .80; }
          50%      { transform: scale(1.14); opacity: 1;   }
        }
        @keyframes orb-b {
          0%,100% { transform: scale(1.04); opacity: .58; }
          50%      { transform: scale(.91);  opacity: .88; }
        }
        @keyframes orb-c {
          0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: .48; }
          50%      { transform: translate(-50%,-50%) scale(1.09); opacity: .72; }
        }
        @keyframes role-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '32px clamp(20px, 5vw, 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontWeight: 900, fontSize: '0.7rem', color: '#fff' }}>S</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
            SAMS v1.0 · Sports Academy Management System
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em' }}>
          Built for elite athletic performance
        </span>
      </footer>
    </>
  );
}
