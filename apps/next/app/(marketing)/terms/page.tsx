import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · PlaySAMS',
  description: 'Terms of Service for PlaySAMS — draft pending legal review.',
};

const LAST_UPDATED = 'August 11, 2026';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Acceptance of These Terms',
    body: [
      'By creating an account or otherwise using PlaySAMS ("PlaySAMS", "we", "us"), you agree to these Terms of Service. If you are creating or approving an account on behalf of a minor — for example, as the parent or guardian of a Player — you are also agreeing to these Terms on that minor’s behalf, and you confirm you have the authority to do so.',
    ],
  },
  {
    title: '2. What PlaySAMS Is',
    body: [
      'PlaySAMS is a software platform that sports academies use to manage their day-to-day operations: team rosters, scheduling, attendance, training plans, wellness check-ins, internal messaging, document storage, and fee collection.',
      'PlaySAMS is a technology provider to academies. We are not a sports academy, a coaching service, a healthcare provider, or a payment processor in our own right (payments are handled by our payment partner, described below).',
    ],
  },
  {
    title: '3. Accounts and Roles',
    body: [
      'Every PlaySAMS account belongs to a single Academy and has one role: Admin, Coach, Player, or Parent/Guardian. Admins and Coaches are typically academy staff. Players are the young athletes an academy trains. Parents/Guardians are linked to one or more Players.',
      'You are responsible for keeping your login credentials confidential and for all activity under your account. Tell your Academy Administrator immediately if you believe your account has been accessed without your permission.',
    ],
  },
  {
    title: '4. Accounts for Minors — Parent/Guardian Responsibility',
    body: [
      'Many Players on PlaySAMS are under 18. If you are a parent or guardian, you are responsible for the accuracy of any information provided for your child’s account, for reviewing and approving your child’s use of the platform, and for supervising how your child interacts with coaches, teammates, and platform features such as messaging.',
      'If you believe a minor has an account on PlaySAMS without appropriate parental or guardian knowledge and consent, please contact us using the details at the end of this page so we can look into it.',
    ],
  },
  {
    title: '5. The Academy’s Responsibilities',
    body: [
      'Each Academy using PlaySAMS — not PlaySAMS itself — is responsible for its coaching decisions, on-field and off-field supervision of Players, safeguarding and child-protection practices, and compliance with any sport-specific or regulatory requirements that apply to it (for example, requirements set by the Ghana Football Association or other governing bodies, where applicable).',
      'PlaySAMS provides the tools an Academy uses to run itself more smoothly; it does not direct or control how an Academy trains, selects, disciplines, or cares for its Players.',
    ],
  },
  {
    title: '6. Acceptable Use',
    body: [
      'You agree not to use PlaySAMS to harass, threaten, or abuse another user; to upload content you do not have the right to share; to impersonate another person; to attempt to access another Academy’s data; or to use the platform for any unlawful purpose.',
      'Academy Admins and Coaches are expected to use the messaging, health-tracking, and roster features appropriately and in the best interests of the Players in their care.',
    ],
  },
  {
    title: '7. Health and Wellness Information — Important Disclaimer',
    body: [
      'PlaySAMS lets Coaches and Players log wellness check-ins (fatigue, soreness, sleep quality) and lets Academies store administrative health-related information (such as medical conditions, allergies, and blood group) as part of a Player’s registration.',
      'This information is self-reported or coach-reported and is provided for coaching and administrative awareness only. PlaySAMS is not a medical device, a diagnostic tool, or a substitute for professional medical advice, diagnosis, or treatment. In a medical emergency, contact emergency services or a qualified medical professional directly — do not rely on PlaySAMS.',
    ],
  },
  {
    title: '8. Fees and Payments',
    body: [
      'Where an Academy uses PlaySAMS to collect fees, payments are processed through our payment partner, Paystack. PlaySAMS does not store your full card or payment account details.',
      'The Academy you belong to sets its own fees, due dates, and refund or cancellation terms. Questions about a specific charge, refund, or fee amount should go to your Academy Administrator in the first instance.',
    ],
  },
  {
    title: '9. Content You Provide',
    body: [
      'You keep ownership of documents, photos, and messages you upload to PlaySAMS. By uploading them, you give PlaySAMS and your Academy permission to store, display, and share that content as needed to operate the platform for your Academy — for example, showing a chat attachment to other members of the same conversation, or a Coach viewing a Player’s uploaded medical clearance document.',
    ],
  },
  {
    title: '10. Suspension and Termination',
    body: [
      'An Academy Admin may deactivate or remove accounts within their own Academy. PlaySAMS may suspend or terminate access to the platform for violations of these Terms, unlawful use, or to protect the security or integrity of the service.',
    ],
  },
  {
    title: '11. Disclaimers and Limitation of Liability',
    body: [
      'PlaySAMS is provided "as is" and "as available." We work to keep the platform reliable and secure, but we do not guarantee it will be uninterrupted or error-free.',
      'To the fullest extent permitted by applicable law, PlaySAMS and its operators are not liable for indirect, incidental, or consequential damages arising from use of the platform. Nothing in these Terms is intended to limit liability in ways not permitted under the laws of Ghana.',
    ],
  },
  {
    title: '12. Governing Law',
    body: [
      'These Terms are governed by the laws of the Republic of Ghana. Any dispute arising from these Terms or your use of PlaySAMS will be subject to the jurisdiction of the courts of Ghana, unless otherwise required by law where you or your Academy are located.',
    ],
  },
  {
    title: '13. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. If we make a material change, we will update the "Last updated" date above and, where appropriate, notify Academy Admins.',
    ],
  },
  {
    title: '14. Contact',
    body: [
      'Questions about these Terms can be sent to hello@playsams.com.',
    ],
  },
  {
    title: 'What Still Needs Formal Legal Review',
    body: [
      'This document was drafted with general awareness of Ghana’s Data Protection Act, 2012 (Act 843) and common international practice for platforms serving minors, but it has not been reviewed by a licensed lawyer. Before this is treated as binding, a qualified professional should specifically confirm: the liability allocation between PlaySAMS and each Academy (Section 5); whether any Academy-specific or sport-specific safeguarding/child-protection certifications should be referenced or required; a formal refund and cancellation policy for Paystack-processed fees (Section 8); and whether the limitation-of-liability language (Section 11) is enforceable as written under Ghanaian contract law.',
    ],
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
            <strong>DRAFT</strong> — this is a substantive working draft, not final legal text. It has not been reviewed by a licensed lawyer. See "What Still Needs Formal Legal Review" below.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                {s.title}
              </h2>
              {s.body.map((p, i) => (
                <p key={i} style={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.5)', margin: i === 0 ? 0 : '10px 0 0' }}>
                  {p}
                </p>
              ))}
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
