'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { registrationApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ClipboardList, ArrowRight, Clock, Loader2 } from 'lucide-react';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  const pathname = usePathname();
  const router = useRouter();

  const [status, setStatus] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const isRegistrationPage = pathname?.startsWith('/dashboard/player/registration');

  useEffect(() => {
    if (!user) return;
    registrationApi.getMyRegistration()
      .then(reg => setStatus(reg?.status ?? 'none'))
      .catch(() => setStatus('none'))
      .finally(() => setChecked(true));
  }, [user]);

  // While checking, show a minimal loader (avoids flash)
  if (!checked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} style={{ color: '#7C3AED', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Registration page always accessible
  if (isRegistrationPage) return <>{children}</>;

  // Full access — registration approved
  if (status === 'approved') return <>{children}</>;

  // Gate — not yet approved
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Gate banner */}
      <div style={{
        background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#EC4899 100%)',
        borderRadius: 18, padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(236,72,153,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
            Registration Required
          </div>
          <h1 style={{ fontWeight: 900, fontSize: '1.5rem', color: 'white', margin: '0 0 8px' }}>
            Complete Your Registration
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 20px', fontSize: '0.875rem', maxWidth: 520 }}>
            {status === 'submitted'
              ? 'Your registration is under review. You\'ll have full access once the admin approves it.'
              : status === 'rejected'
              ? 'Your registration needs to be updated. Please review the feedback and resubmit.'
              : 'You need to complete your player registration before accessing the platform.'}
          </p>
          <button
            onClick={() => router.push('/dashboard/player/registration')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            {status === 'submitted' ? <><Clock size={15} /> View Registration Status</>
              : <><ClipboardList size={15} /> {status === 'rejected' ? 'Update Registration' : 'Start Registration'} <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>

      {/* Locked content overlay */}
      <div style={{ position: 'relative' }}>
        <div style={{
          pointerEvents: 'none', userSelect: 'none', opacity: 0.25,
          filter: 'blur(2px)',
        }}>
          {children}
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(248,250,252,0.6)',
        }}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#475569' }}>
              {status === 'submitted' ? 'Access unlocked after approval' : 'Complete registration to unlock'}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
