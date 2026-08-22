import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · PlaySAMS',
  description: 'Privacy Policy for PlaySAMS — draft pending legal review.',
};

const LAST_UPDATED = 'August 20, 2026';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Who This Policy Covers',
    body: [
      'This Privacy Policy explains how PlaySAMS handles personal information for everyone who uses the platform: Academy Admins, Coaches, Players, and Parents/Guardians.',
    ],
  },
  {
    title: '2. How PlaySAMS and Your Academy Share Responsibility',
    body: [
      'PlaySAMS operates the underlying platform. Each Academy that uses PlaySAMS is generally the party responsible for its own members’ information (in data-protection terms, the "data controller"), and PlaySAMS acts on the Academy’s behalf to store and process that information (a "data processor" or "service provider").',
      'In practice, this means your Academy decides what information it collects from you and why, and PlaySAMS is the technology that stores and moves that information securely. This split of responsibility should be formalized (for example, through a written agreement between PlaySAMS and each Academy) as part of legal review — it is described here in plain terms, not as a final legal determination.',
    ],
  },
  {
    title: '3. Information We Collect',
    body: [
      'Account information: name, email address, role (Admin, Coach, Player, or Parent/Guardian), and — optionally — date of birth.',
      'Wellness and health information: self-reported check-ins (fatigue, soreness, sleep quality) logged by Players or Coaches, and — where a Player completes registration with their Academy — medical conditions, allergies, blood group, and emergency contact details.',
      'Identity and eligibility documents: where requested by an Academy as part of registration, documents such as a birth certificate, national ID, passport photo, and parental/guardian consent form.',
      'Activity information: attendance records, training and workout plans, schedules, and academy announcements.',
      'Communications: messages and file attachments (images, PDFs) sent within an Academy’s chat channels.',
      'Payment information: when a fee is paid through PlaySAMS, payment is processed by our payment partner, Paystack. PlaySAMS does not receive or store your full card number or bank account details — only confirmation that a payment succeeded, and the amount and date.',
    ],
  },
  {
    title: '4. How We Use This Information',
    body: [
      'To operate the platform: scheduling, attendance tracking, wellness monitoring, team messaging, document storage, and fee collection.',
      'To communicate with you: for example, sending an invitation to join an Academy, a password reset, or a notification about a new message or fee due.',
      'To keep the platform secure and working correctly, including detecting misuse and maintaining the separation between different Academies’ data.',
    ],
  },
  {
    title: '5. Legal Basis for Processing',
    body: [
      'PlaySAMS operates primarily in Ghana, and under Ghana’s Data Protection Act, 2012 (Act 843), PlaySAMS and Academies rely on one or more of the following grounds to process personal information: your consent (for example, when you agree to these policies at signup, or when a Player or Parent/Guardian chooses to submit a wellness check-in or registration document); the necessity of processing to provide the service an Academy has signed up for; and the legitimate interest of the Academy in managing its teams, safety, and operations.',
      'Where an Academy or its members are located in another African country, other data protection laws may also apply — for example Nigeria’s Data Protection Act 2023, Kenya’s Data Protection Act 2019, South Africa’s Protection of Personal Information Act (POPIA), or a country’s law implementing the African Union’s Malabo Convention on Cyber Security and Personal Data Protection. These frameworks share broadly similar core principles to Act 843 (a lawful basis for processing, purpose limitation, data minimization, and rights of access, correction, and deletion), and PlaySAMS aims to operate consistently with them. This is a statement of intent, not confirmation that any specific country’s registration, notification, or other local compliance requirement has been independently met — see "What Still Needs Formal Legal Review" below.',
    ],
  },
  {
    title: '6. Children’s Information',
    body: [
      'Many Players on PlaySAMS are minors. Where an account is being created for a minor, we expect the account to be created or approved by a parent or guardian, who is responsible for the accuracy of the information provided. Parent/Guardian contact details are collected specifically to support this relationship.',
      'We do not knowingly allow a minor to create an account without a parent or guardian’s involvement. If you believe this has happened, please contact us using the details below.',
    ],
  },
  {
    title: '7. Who We Share Information With',
    body: [
      'We do not sell personal information to third parties, and we do not use it for third-party advertising.',
      'We share information with the service providers that make PlaySAMS work: Supabase (database hosting and file storage), Resend (sending account and notification emails), Daily.co (video and audio calls for meetings), and Paystack (processing fee payments). Each of these providers only receives the information needed to perform their specific function.',
      'Within an Academy, information is visible to the roles that need it to do their job — for example, a Coach can see the roster and wellness data for their own team; a Parent/Guardian can see information related to their own linked child.',
    ],
  },
  {
    title: '8. Where Information Is Stored',
    body: [
      'PlaySAMS’ database and file storage (via Supabase) are hosted in the European Union. This means personal information about users in Ghana and elsewhere in Africa is transferred to and stored outside the country, and outside the continent. Whether this requires additional safeguards — such as a specific cross-border transfer mechanism, an adequacy determination, or notice to a national Data Protection Authority — depends on which country’s law applies to a given Academy, and is one of the items flagged for legal review below. This applies under Ghana’s Data Protection Act, 2012 and would similarly need checking under the law of any other African country an Academy operates from.',
    ],
  },
  {
    title: '9. How We Protect Information',
    body: [
      'Access to information on PlaySAMS is restricted by role and by Academy — for example, one Academy cannot see another Academy’s data, and within an Academy, access is scoped to what each role needs. Data is encrypted in transit. We also apply database-level access rules as a second layer of protection, in addition to the controls built into the application itself.',
    ],
  },
  {
    title: '10. How Long We Keep Information',
    body: [
      'We retain information for as long as your account and your Academy remain active on PlaySAMS. If an Academy removes a member, that member’s core records are generally deleted from our primary systems; routine backups may retain a copy for a limited period afterward before they, too, are cycled out.',
    ],
  },
  {
    title: '11. Your Rights',
    body: [
      'Depending on applicable law, you may have the right to access, correct, or request deletion of your personal information. To exercise these rights, contact your Academy Administrator, or reach us directly using the details below and we will coordinate with your Academy.',
    ],
  },
  {
    title: '12. Cookies and Tracking',
    body: [
      'PlaySAMS does not currently use third-party advertising or analytics trackers. We use only what is necessary for you to stay signed in and for the platform to function, including offline support on the web and mobile app.',
    ],
  },
  {
    title: '13. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. If we make a material change, we will update the "Last updated" date above and, where appropriate, notify Academy Admins.',
    ],
  },
  {
    title: '14. Contact',
    body: [
      'Questions or requests about this Privacy Policy can be sent to hello@playsams.com.',
    ],
  },
  {
    title: 'What Still Needs Formal Legal Review',
    body: [
      'This document was drafted with general awareness of Ghana’s Data Protection Act, 2012 (Act 843), the other African data protection frameworks named in Section 5, and common international practice for platforms serving minors — but it has not been reviewed by a licensed lawyer or data-protection specialist in any jurisdiction. Stating an intent to align with multiple African frameworks (Section 5) makes real legal review more urgent, not less: it is a broader, harder claim to get right than a single-country one, and nothing here should be read as confirmed compliance outside Ghana.',
      'Before this is treated as binding, a qualified professional should specifically confirm: whether PlaySAMS or any Academy using it needs to register with Ghana’s Data Protection Commission, or with the equivalent authority in any other country an Academy operates from; the correct data-controller/data-processor allocation between PlaySAMS and each Academy, and whether a formal data processing agreement is needed (Section 2); whether the EU hosting arrangement (Section 8) requires a specific cross-border transfer safeguard under Ghanaian law and under the law of other applicable African countries; whether the Section 5 multi-country claim is accurate as written, or should be narrowed until each named framework is individually confirmed; and whether any sport-specific child-safeguarding data-handling requirements apply on top of general data-protection law.',
    ],
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
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
            <strong>DRAFT</strong> — this is a substantive working draft, not final legal text. It has not been reviewed by a licensed lawyer or data-protection specialist. See "What Still Needs Formal Legal Review" below.
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
