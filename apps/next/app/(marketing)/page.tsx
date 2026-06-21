'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, CalendarDays, LayoutDashboard } from 'lucide-react';

// ── Static data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    gradient:    'linear-gradient(135deg, #7C3AED, #4F46E5)',
    glow:        'rgba(124,58,237,0.35)',
    glowBorder:  'rgba(124,58,237,0.32)',
    icon:        <Layers size={22} strokeWidth={1.6} />,
    title: 'Automated Multi-Tenant Provisioning',
    desc:  'Each academy gets a fully isolated, dedicated workspace automatically provisioned. Zero manual setup — from enrollment request to live platform in under 60 seconds.',
    tags:  ['Instant setup', 'Isolated data', 'Zero config'],
  },
  {
    gradient:    'linear-gradient(135deg, #2563EB, #1D4ED8)',
    glow:        'rgba(37,99,235,0.35)',
    glowBorder:  'rgba(37,99,235,0.32)',
    icon:        <CalendarDays size={22} strokeWidth={1.6} />,
    title: 'Smart Scheduling & Attendance',
    desc:  'Training sessions, fixtures, and recovery windows coordinated across your entire roster. Log attendance in one tap and get instant visibility on who showed up.',
    tags:  ['Calendar sync', 'One-tap attendance', 'Multi-team'],
  },
  {
    gradient:    'linear-gradient(135deg, #059669, #047857)',
    glow:        'rgba(5,150,105,0.35)',
    glowBorder:  'rgba(5,150,105,0.32)',
    icon:        <LayoutDashboard size={22} strokeWidth={1.6} />,
    title: 'Centralized Operational Command',
    desc:  'Admin, coach, player, and parent dashboards unified under one platform. Every role sees exactly what they need — purpose-built, nothing bloated.',
    tags:  ['4 role dashboards', 'Real-time data', 'RBAC'],
  },
];

const HOW_IT_WORKS = [
  {
    step:   '01',
    color:  '#7C3AED',
    bg:     'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.28)',
    title:  'Submit your enrollment request',
    desc:   'Fill in a 2-minute form with your academy name, sport, and contact details. No credit card, no commitment.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    step:   '02',
    color:  '#2563EB',
    bg:     'rgba(37,99,235,0.1)',
    border: 'rgba(37,99,235,0.28)',
    title:  'Get your workspace in seconds',
    desc:   'Once approved, your dedicated academy workspace is auto-provisioned and live in under 60 seconds — fully isolated from every other academy.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    step:   '03',
    color:  '#059669',
    bg:     'rgba(5,150,105,0.1)',
    border: 'rgba(5,150,105,0.28)',
    title:  'Invite your entire team instantly',
    desc:   'Send role-specific invitations to coaches, players, and parents by email. Everyone onboards with a single click — no IT setup required.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

const ROLES = [
  {
    key:   'admin',
    label: 'Admin',
    color: '#7C3AED',
    bg:    'rgba(124,58,237,0.12)',
    border:'rgba(124,58,237,0.32)',
    badge: 'Super-Admin Control Plane',
    headline: 'Total Academy Oversight',
    desc: 'The command centre for academy directors. Manage the full roster, control invitations, and view cross-team performance data — all from a single elevated dashboard.',
    capabilities: [
      'Multi-team creation & management',
      'Role-based invitation system with email delivery',
      'Academy enrollment request pipeline',
      'Advanced analytics & member lifecycle management',
      'Full member status & access control',
    ],
  },
  {
    key:   'coach',
    label: 'Coach',
    color: '#2563EB',
    bg:    'rgba(37,99,235,0.12)',
    border:'rgba(37,99,235,0.32)',
    badge: 'Active Roster & Attendance',
    headline: 'Run Elite Training Operations',
    desc: "Coach-level tools built for the touchline. View your squad's health status, log attendance in seconds, build customized training plans, and assign targeted workouts.",
    capabilities: [
      'Live roster table with health status overlays',
      'One-tap attendance logging per session',
      'Custom workout plan builder with exercises',
      'Player profile deep-dives (health, history)',
      'Team event & session scheduling',
    ],
  },
  {
    key:   'player',
    label: 'Player',
    color: '#059669',
    bg:    'rgba(5,150,105,0.12)',
    border:'rgba(5,150,105,0.32)',
    badge: 'Workouts & Daily Wellness',
    headline: 'Own Your Performance Journey',
    desc: 'A personal performance hub for every athlete. Check your training schedule, complete daily wellness check-ins, track assigned workouts, and stay connected with your team.',
    capabilities: [
      'Personal schedule & fixture calendar',
      'Daily wellness & health check-in flow',
      'Assigned workout tracker with completion',
      'Team chat & group communications',
      'Performance history & trend visibility',
    ],
  },
  {
    key:   'parent',
    label: 'Parent',
    color: '#D97706',
    bg:    'rgba(217,119,6,0.12)',
    border:'rgba(217,119,6,0.32)',
    badge: 'Multi-child Performance Streams',
    headline: 'Stay Close to Your Athlete',
    desc: "A dedicated parent portal that keeps you informed without overwhelming you. Monitor your child's schedule, health summaries, and training loads — always transparent.",
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
    ctaHref:   '/enroll',
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
    ctaHref:   '/enroll',
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
    ctaHref:   'mailto:hello@playsams.com',
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

const FAQS = [
  {
    q: 'How quickly can our academy get started?',
    a: 'Once your enrollment request is approved, your dedicated workspace is provisioned in under 60 seconds. You can start inviting your team within minutes of approval.',
  },
  {
    q: 'Is our academy\'s data isolated from other academies?',
    a: 'Yes — completely. Every academy operates in its own isolated tenant. Your data, members, and communications are never shared with or visible to any other academy on the platform.',
  },
  {
    q: 'Can we start for free and upgrade later?',
    a: 'Absolutely. The Development plan is free forever, with no credit card required. When you outgrow 25 players or need multiple teams, upgrading to Pro Academy takes one click.',
  },
  {
    q: 'What sports does SAMS support?',
    a: 'All of them. SAMS is sport-agnostic — football, basketball, swimming, rugby, gymnastics, and more. The platform adapts to your sport\'s terminology and session structure.',
  },
  {
    q: 'How do parents and players access the platform?',
    a: 'Admins send role-specific invitation emails. Parents and players click the link, set their password, and land directly in their own purpose-built dashboard — no app download required.',
  },
  {
    q: 'Can coaches manage multiple teams?',
    a: 'Yes. A coach can be assigned to multiple teams and sees all their sessions, rosters, and attendance records across every team from a single dashboard.',
  },
];

const STATS = [
  { value: 'Free',  label: 'to start'           },
  { value: '<60s',  label: 'provisioning time'   },
  { value: '4',     label: 'role dashboards'     },
  { value: '100%',  label: 'tenant isolation'    },
];

// ── Shared style constants ─────────────────────────────────────────────

const SEC_LABEL = (bg: string, border: string, color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '5px 14px', borderRadius: 99, marginBottom: 18,
  background: bg, border: `1px solid ${border}`,
  fontSize: '0.63rem', fontWeight: 800,
  letterSpacing: '0.15em', textTransform: 'uppercase', color,
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

// ── Dashboard mockup component ────────────────────────────────────────

function DashboardMockup() {
  return (
    <div style={{ position: 'relative' }}>
      {/* Glow bloom behind the mockup */}
      <div style={{
        position: 'absolute', inset: '-10% -5%', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 55% 45%, rgba(124,58,237,0.28) 0%, transparent 70%)',
        filter: 'blur(32px)',
      }} />

      {/* Browser frame */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(8,12,28,0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        transform: 'perspective(1400px) rotateY(-5deg) rotateX(2deg)',
      }}>

        {/* Browser chrome */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '9px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {['#FF5F57','#FFBD2E','#28C840'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            borderRadius: 5, padding: '3px 10px',
            fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.02em', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            app.playsams.com/dashboard/admin
          </div>
        </div>

        {/* App layout */}
        <div style={{ display: 'flex', height: 292 }}>

          {/* Sidebar */}
          <div style={{
            width: 48, background: 'rgba(124,58,237,0.05)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, paddingTop: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              marginBottom: 10,
            }} />
            {[true, false, false, false, false].map((active, i) => (
              <div key={i} style={{
                width: 30, height: 28, borderRadius: 7, marginBottom: 1,
                background: active ? 'rgba(124,58,237,0.22)' : 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3,
              }}>
                <div style={{ width: active ? 14 : 12, height: 1.5, background: active ? '#8B5CF6' : 'rgba(255,255,255,0.18)', borderRadius: 1 }} />
                <div style={{ width: active ? 10 : 8, height: 1.5, background: active ? '#8B5CF6' : 'rgba(255,255,255,0.12)', borderRadius: 1 }} />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden', minWidth: 0 }}>

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' }}>Admin Dashboard</div>
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>My Academy · Sat 21 Jun 2026</div>
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.25)' }} />
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }} />
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 11 }}>
              {[
                { value: '32', label: 'Athletes',  color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
                { value: '4',  label: 'Teams',     color: '#2563EB', bg: 'rgba(37,99,235,0.12)'  },
                { value: '2',  label: 'Today',     color: '#059669', bg: 'rgba(5,150,105,0.12)'  },
              ].map(s => (
                <div key={s.label} style={{
                  background: s.bg, border: `1px solid ${s.color}30`,
                  borderRadius: 8, padding: '7px 9px',
                }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#F1F5F9', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.38)', marginTop: 3, letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Section label */}
            <div style={{ fontSize: '0.52rem', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Today's Sessions
            </div>

            {/* Session cards */}
            {[
              { title: 'U16 Tactical Training',  time: '09:00 – 11:00', badge: 'Training', color: '#7C3AED' },
              { title: 'U18 vs Riverside FC',     time: '15:00 – 17:00', badge: 'Match',    color: '#DC2626' },
            ].map(ev => (
              <div key={ev.title} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 9px', borderRadius: 7, marginBottom: 5,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ width: 3, height: 26, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{ev.time}</div>
                </div>
                <div style={{
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                  background: `${ev.color}20`, border: `1px solid ${ev.color}40`,
                  fontSize: '0.5rem', fontWeight: 700, color: ev.color,
                }}>
                  {ev.badge}
                </div>
              </div>
            ))}

            {/* Wellness bar */}
            <div style={{
              marginTop: 7, padding: '6px 9px', borderRadius: 7,
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
              <div style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.38)' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>28/32</span> athletes completed wellness check-in
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeRole, setActiveRole] = useState('admin');
  const [openFaq, setOpenFaq]       = useState<number | null>(null);
  const role = ROLES.find(r => r.key === activeRole)!;

  return (
    <>
      {/* ══════════════════════════════════════════════ */}
      {/*  HERO  — 2-col: text left, mockup right        */}
      {/* ══════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: 'clamp(80px, 12vh, 120px) clamp(20px, 5vw, 80px) clamp(60px, 8vh, 100px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background texture */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.026) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 20%, transparent 100%)',
          maskImage:       'radial-gradient(ellipse 90% 80% at 50% 50%, black 20%, transparent 100%)',
        }} />

        {/* Ambient orbs */}
        <div style={{ position: 'absolute', top: '8%', right: '3%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(56px)', pointerEvents: 'none', animation: 'orb-a 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '2%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', filter: 'blur(56px)', pointerEvents: 'none', animation: 'orb-b 13s ease-in-out infinite 2s' }} />

        {/* 2-column grid */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 1200, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 'clamp(40px, 6vw, 80px)',
          alignItems: 'center',
        }}>

          {/* ── Left: text ── */}
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 16px', borderRadius: 99, marginBottom: 28,
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
              fontSize: 'clamp(2.1rem, 4.8vw, 3.8rem)',
              fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08,
              color: '#F1F5F9', margin: '0 0 22px',
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
              fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)', lineHeight: 1.76,
              color: 'rgba(255,255,255,0.46)', margin: '0 0 38px',
              maxWidth: 500,
            }}>
              Unified scheduling, attendance tracking, health monitoring, and team communications — purpose-built for the performance academy of tomorrow.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link
                href="/enroll"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9,
                  padding: '14px 30px', borderRadius: 99,
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  color: '#fff', fontSize: '0.93rem', fontWeight: 800,
                  textDecoration: 'none', letterSpacing: '-0.01em',
                  boxShadow: '0 12px 36px rgba(109,40,217,0.55)',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'scale(1.04)'; el.style.boxShadow = '0 20px 52px rgba(109,40,217,0.72)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'scale(1)';    el.style.boxShadow = '0 12px 36px rgba(109,40,217,0.55)'; }}
              >
                Launch Your Workspace
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>

              <a
                href="#how-it-works"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9,
                  padding: '14px 30px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#F1F5F9', fontSize: '0.93rem', fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '-0.01em',
                  transition: 'background 0.18s, border-color 0.18s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(255,255,255,0.09)'; el.style.borderColor = 'rgba(255,255,255,0.24)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(255,255,255,0.05)'; el.style.borderColor = 'rgba(255,255,255,0.14)'; }}
              >
                See How It Works
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </a>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '16px 20px',
              borderRadius: 16, gap: 0,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'nowrap',
            }}>
              {STATS.flatMap(({ value, label }, i) => {
                const stat = (
                  <div key={label} style={{ textAlign: 'center', padding: '0 16px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.32)', marginTop: 5, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                      {label}
                    </div>
                  </div>
                );
                if (i < STATS.length - 1) {
                  return [stat, <div key={`d${i}`} style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />];
                }
                return [stat];
              })}
            </div>
          </div>

          {/* ── Right: Dashboard mockup ── */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 520 }}>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  HOW IT WORKS  (id="how-it-works")            */}
      {/* ══════════════════════════════════════════════ */}
      <section id="how-it-works" style={{
        padding: '100px clamp(20px, 5vw, 80px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.012)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={SEC_LABEL('rgba(5,150,105,0.1)', 'rgba(5,150,105,0.24)', '#6EE7B7')}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Simple Onboarding
            </div>
            <h2 style={SEC_TITLE}>
              Up and Running in Three Steps
            </h2>
            <p style={SEC_SUB}>
              No IT department. No long setup calls. Your whole academy can be live and operational in the time it takes to make coffee.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24, position: 'relative',
          }}>

            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                style={{
                  ...GLASS,
                  padding: '32px 28px',
                  position: 'relative',
                  transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = `0 28px 64px ${step.bg.replace('0.1', '0.3')}`; el.style.borderColor = step.border; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                {/* Step number + icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: step.bg, border: `1px solid ${step.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: step.color,
                  }}>
                    {step.icon}
                  </div>
                  <div style={{
                    fontSize: '2rem', fontWeight: 900,
                    color: 'rgba(255,255,255,0.06)',
                    letterSpacing: '-0.04em', lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {step.step}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 10px', letterSpacing: '-0.015em', lineHeight: 1.3 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.43)', lineHeight: 1.72, margin: 0 }}>
                  {step.desc}
                </p>

                {/* Step indicator dot */}
                <div style={{
                  position: 'absolute', top: -1, right: 24,
                  width: 8, height: 8, borderRadius: '50%',
                  background: step.color,
                  boxShadow: `0 0 12px ${step.color}`,
                  border: '2px solid #060B14',
                }} />
              </div>
            ))}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22 }}>
            {FEATURES.map(f => (
              <div
                key={f.title}
                style={{ ...GLASS, padding: '32px 28px', transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = `0 32px 72px ${f.glow}`; el.style.borderColor = f.glowBorder; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14, marginBottom: 22,
                  background: f.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
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
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
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
            <p style={SEC_SUB}>One platform, four distinct experiences — each role gets exactly the tools and visibility they need.</p>
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
                    cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em',
                    background: active ? r.bg : 'rgba(255,255,255,0.04)',
                    color:      active ? r.color : 'rgba(255,255,255,0.38)',
                    boxShadow:  active ? `0 0 20px ${r.bg}` : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Role detail panel */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {role.capabilities.map(cap => (
                <div key={cap} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1,
                    background: role.bg, border: `1px solid ${role.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: role.color,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>{cap}</span>
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
        padding: '100px clamp(20px, 5vw, 80px)',
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
            <p style={SEC_SUB}>Start free, scale when you're ready. Every plan includes full access to the core platform — no feature paywalls on essential tools.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, alignItems: 'start' }}>
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
                  transition: 'transform 0.25s, box-shadow 0.25s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = `0 32px 72px ${plan.glow}`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 18px', borderRadius: 99,
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    color: '#fff', fontSize: '0.63rem', fontWeight: 800,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    boxShadow: '0 4px 16px rgba(109,40,217,0.55)', whiteSpace: 'nowrap',
                  }}>
                    Most Popular
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 99, marginBottom: 12,
                    background: `${plan.color}1A`, border: `1px solid ${plan.color}40`,
                    fontSize: '0.63rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: plan.color,
                  }}>
                    {plan.name}
                  </span>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>{plan.tagline}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingBottom: 22, marginBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.04em', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{plan.period}</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {plan.features.map(feat => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaHref}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 20px', borderRadius: 12,
                    background: plan.highlight ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'rgba(255,255,255,0.06)',
                    border: plan.highlight ? 'none' : `1px solid ${plan.border}`,
                    color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontSize: '0.88rem', fontWeight: 700,
                    textDecoration: 'none', letterSpacing: '0.01em',
                    boxShadow: plan.highlight ? '0 8px 26px rgba(109,40,217,0.42)' : 'none',
                    transition: 'all 0.18s', boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    if (plan.highlight) { el.style.boxShadow = '0 14px 40px rgba(109,40,217,0.64)'; el.style.transform = 'scale(1.02)'; }
                    else { el.style.background = 'rgba(255,255,255,0.1)'; }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    if (plan.highlight) { el.style.boxShadow = '0 8px 26px rgba(109,40,217,0.42)'; el.style.transform = 'scale(1)'; }
                    else { el.style.background = 'rgba(255,255,255,0.06)'; }
                  }}
                >
                  {plan.cta}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  FAQ  (id="faq")                              */}
      {/* ══════════════════════════════════════════════ */}
      <section id="faq" style={{
        padding: '100px clamp(20px, 5vw, 80px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.012)',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 54 }}>
            <div style={SEC_LABEL('rgba(124,58,237,0.1)', 'rgba(124,58,237,0.24)', '#A78BFA')}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block' }} />
              Common Questions
            </div>
            <h2 style={SEC_TITLE}>Frequently Asked Questions</h2>
            <p style={SEC_SUB}>Everything you need to know before getting started.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  style={{
                    background: isOpen ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isOpen ? 'rgba(124,58,237,0.28)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    style={{
                      width: '100%', padding: '20px 24px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isOpen ? '#C4B5FD' : '#F1F5F9', lineHeight: 1.4, flex: 1 }}>
                      {faq.q}
                    </span>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isOpen ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isOpen ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isOpen ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.2s',
                    }}>
                      <svg
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 24px 20px' }}>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.74, color: 'rgba(255,255,255,0.52)', margin: 0 }}>
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  CLOSING CTA                                   */}
      {/* ══════════════════════════════════════════════ */}
      <section style={{
        padding: '100px clamp(20px, 5vw, 80px) 110px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(56px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)', filter: 'blur(56px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 16px', borderRadius: 99, marginBottom: 28,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.26)',
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A78BFA',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block', boxShadow: '0 0 8px #8B5CF6' }} />
            Applications Open
          </div>

          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1,
            color: '#F1F5F9', margin: '0 0 20px',
          }}>
            Ready to run your academy<br />
            <span style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 55%, #EC4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              at elite level?
            </span>
          </h2>

          <p style={{ fontSize: '1rem', lineHeight: 1.74, color: 'rgba(255,255,255,0.44)', margin: '0 auto 44px', maxWidth: 480 }}>
            Join the growing number of academies using SAMS to unify scheduling, health monitoring, and team communications under one platform.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              href="/enroll"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '16px 36px', borderRadius: 99,
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                color: '#fff', fontSize: '1rem', fontWeight: 800,
                textDecoration: 'none', letterSpacing: '-0.01em',
                boxShadow: '0 16px 48px rgba(109,40,217,0.6)',
                transition: 'transform 0.18s, box-shadow 0.18s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'scale(1.04) translateY(-2px)'; el.style.boxShadow = '0 24px 64px rgba(109,40,217,0.75)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'scale(1) translateY(0)';       el.style.boxShadow = '0 16px 48px rgba(109,40,217,0.6)';  }}
            >
              Request Access — It&apos;s Free
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>

            <a
              href="mailto:hello@playsams.com"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '16px 32px', borderRadius: 99,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.65)', fontSize: '1rem', fontWeight: 700,
                textDecoration: 'none', letterSpacing: '-0.01em',
                transition: 'background 0.18s, border-color 0.18s, color 0.18s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(255,255,255,0.08)'; el.style.borderColor = 'rgba(255,255,255,0.2)'; el.style.color = '#F1F5F9'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.borderColor = 'rgba(255,255,255,0.12)'; el.style.color = 'rgba(255,255,255,0.65)'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
              </svg>
              Talk to Sales
            </a>
          </div>

          {/* Trust line */}
          <p style={{ marginTop: 28, fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
            No credit card required · Setup in under 60 seconds · Cancel anytime
          </p>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <a
            href="mailto:hello@playsams.com"
            style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', textDecoration: 'none', transition: 'color 0.15s', letterSpacing: '0.03em' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.22)'; }}
          >
            hello@playsams.com
          </a>
          <Link
            href="/platform/login"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)',
              textDecoration: 'none', letterSpacing: '0.04em',
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.22)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Platform Admin
          </Link>
        </div>
      </footer>
    </>
  );
}
