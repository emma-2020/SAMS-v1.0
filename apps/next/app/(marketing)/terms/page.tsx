import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · PlaySAMS',
  description: 'Placeholder Terms of Service for PlaySAMS — draft pending legal review.',
};

const LAST_UPDATED = 'August 3, 2026';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'This section will describe the categories of information PlaySAMS collects from academies, coaches, players, and parents — such as account details, roster and health data, attendance records, and messages — once finalized by legal review.',
  },
  {
    title: 'How We Use It',
    body: 'This section will describe how collected information is used to operate the platform, including scheduling, attendance tracking, health monitoring, communication between roles, and fee management, once finalized by legal review.',
  },
  {
    title: 'Your Rights',
    body: 'This section will describe the rights available to users regarding their data — including access, correction, export, and deletion requests — once finalized by legal review.',
  },
  {
    title: 'Contact',
    body: 'This section will describe how to reach PlaySAMS with questions or requests regarding these Terms, once finalized by legal review. In the meantime, reach us at hello@playsams.com.',
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '100px clamp(16px, 4vw, 40px) 80px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 99, marginBottom: 18,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.22)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block', boxShadow: '0 0 7px #8B5CF6' }} />
            <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#A78BFA' }}>
              Legal
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)', fontWeight: 900,
            letterSpacing: '-0.03em', lineHeight: 1.15,
            color: '#F1F5F9', margin: '0 0 10px',
          }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Draft banner */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '16px 18px', borderRadius: 14, marginBottom: 36,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#FBBF24', flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: '#FDE68A', margin: 0 }}>
            <strong>DRAFT</strong> — this page is a placeholder pending legal review. Do not treat this as binding legal text yet.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                {s.title}
              </h2>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A78BFA', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
