'use client';

// Shared read-only fee ledger view for Player and Player-linked Parent accounts.
// Both roles hit the same role-scoped GET /api/fees endpoint (the backend does
// the filtering — Player sees only their own records, Parent sees all of their
// linked children's) and render an (almost) identical list with a "Pay Now"
// link for any record that still has a balance and a live Paystack payment_url.
//
// Kept as one shared component (rather than two independent page files, cf.
// the workouts pages) because — unlike workouts — the two views differ only in
// copy and in whether the child's name is shown on each row; duplicating the
// list/row/stat markup wholesale wasn't worth it here.

import { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, Clock3, ExternalLink } from 'lucide-react';
import { feesApi } from '@sams/api';
import type { FeeLedgerEntry } from '@sams/api';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(pesewas: number) {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const METHOD_CFG: Record<string, { color: string; bg: string; label: string }> = {
  Cash:   { color: '#059669', bg: 'rgba(5,150,105,0.12)',  label: 'Cash'   },
  MoMo:   { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', label: 'MoMo'   },
  Bank:   { color: '#2563EB', bg: 'rgba(37,99,235,0.12)',  label: 'Bank'   },
  Online: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)',  label: 'Online' },
  Other:  { color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'Other' },
};

type FilterKey = 'all' | 'outstanding' | 'paid';

// ─── Fee Row ────────────────────────────────────────────────────────────────
function FeeRow({ fee, showPlayerName }: { fee: FeeLedgerEntry; showPlayerName: boolean }) {
  const balance  = fee.amount_owed - fee.amount_paid;
  const paid     = balance <= 0;
  const partial  = fee.amount_paid > 0 && balance > 0;
  const methCfg  = fee.payment_method ? METHOD_CFG[fee.payment_method] : null;
  const statusColor = paid ? '#10B981' : partial ? '#F59E0B' : '#EF4444';
  const statusLabel = paid ? 'Paid' : partial ? 'Partially Paid' : 'Outstanding';

  return (
    <div className="sfee-row" style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 14, borderLeft: `4px solid ${statusColor}`, boxShadow: 'var(--shadow-sm)',
      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div className="sfee-row__info" style={{ flex: '1 1 200px', minWidth: 0 }}>
        {showPlayerName && fee.player && (
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7C3AED', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', background: '#F5F3FF',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.55rem', fontWeight: 800, flexShrink: 0,
            }}>
              {fee.player.first_name[0]}{fee.player.last_name[0]}
            </span>
            {fee.player.first_name} {fee.player.last_name}
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{fee.description}</div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
          {fmt(fee.amount_paid)} of {fmt(fee.amount_owed)} paid
          {fee.payment_date ? ` · ${fmtDate(fee.payment_date)}` : ''}
        </div>
        {fee.notes && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>
            {fee.notes}
          </div>
        )}
        {methCfg && (
          <span style={{
            display: 'inline-block', marginTop: 7, fontSize: '0.63rem', fontWeight: 700,
            padding: '2px 9px', borderRadius: 99, background: methCfg.bg, color: methCfg.color,
          }}>
            {methCfg.label}
          </span>
        )}
      </div>

      <div className="sfee-row__amount" style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{
          display: 'inline-block', fontSize: '0.66rem', fontWeight: 800, padding: '3px 10px',
          borderRadius: 99, background: `${statusColor}1f`, color: statusColor, marginBottom: 6,
        }}>
          {statusLabel}
        </span>
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: paid ? '#10B981' : 'var(--text-primary)' }}>
          {paid ? fmt(fee.amount_owed) : fmt(balance)}
        </div>
        {!paid && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>balance due</div>}
      </div>

      {!paid && (
        fee.payment_url ? (
          <a
            href={fee.payment_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10,
              background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700,
              fontSize: '0.8rem', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            Pay Now <ExternalLink size={14} />
          </a>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0, maxWidth: 160 }}>
            Online payment unavailable — contact your academy
          </span>
        )
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────
export interface FeesViewProps {
  role: 'Player' | 'Parent';
}

const COPY: Record<FeesViewProps['role'], {
  title: string; subtitle: string; gradient: string; shadow: string;
  showPlayerName: boolean; emptyTitle: string; emptyBody: string;
}> = {
  Player: {
    title: 'My Fees',
    subtitle: 'Your academy fees and payment history',
    gradient: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
    shadow: 'rgba(79,70,229,0.30)',
    showPlayerName: false,
    emptyTitle: 'No fees on record',
    emptyBody: "Your academy hasn't billed you for anything yet. Check back later.",
  },
  Parent: {
    title: 'Fee Payments',
    subtitle: "Outstanding balances and payment history for your child's academy fees",
    gradient: 'linear-gradient(135deg,#4338CA,#DB2777)',
    shadow: 'rgba(67,56,202,0.30)',
    showPlayerName: true,
    emptyTitle: 'No fees on record',
    emptyBody: "Your child's academy hasn't billed any fees yet. Check back later.",
  },
};

export default function FeesView({ role }: FeesViewProps) {
  const [fees,    setFees]    = useState<FeeLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>('all');

  const copy = COPY[role];

  useEffect(() => {
    // GET /api/fees is already role-scoped server-side (Player → own records,
    // Parent → linked children's records) — no client-side filtering needed.
    feesApi.getFees()
      .then(setFees)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalOwed        = fees.reduce((s, f) => s + f.amount_owed, 0);
  const totalPaid        = fees.reduce((s, f) => s + f.amount_paid, 0);
  const totalOutstanding = totalOwed - totalPaid;

  const filtered = fees.filter(f => {
    const balance = f.amount_owed - f.amount_paid;
    if (filter === 'outstanding') return balance > 0;
    if (filter === 'paid')        return balance <= 0;
    return true;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: copy.gradient, borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        position: 'relative', overflow: 'hidden', boxShadow: `0 8px 32px ${copy.shadow}`,
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 100, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            {role}
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem,4vw,1.8rem)', fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {copy.title}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{copy.subtitle}</p>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      {!loading && fees.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
          {([
            { label: 'Total Owed',   value: fmt(totalOwed),        grad: 'linear-gradient(135deg,#6366F1,#818CF8)', shadow: 'rgba(99,102,241,0.28)', Icon: Wallet     },
            { label: 'Paid',         value: fmt(totalPaid),        grad: 'linear-gradient(135deg,#059669,#10B981)', shadow: 'rgba(5,150,105,0.28)',  Icon: CheckCircle2 },
            { label: 'Outstanding',  value: fmt(totalOutstanding), grad: totalOutstanding > 0 ? 'linear-gradient(135deg,#DC2626,#EF4444)' : 'linear-gradient(135deg,#059669,#10B981)', shadow: totalOutstanding > 0 ? 'rgba(220,38,38,0.28)' : 'rgba(5,150,105,0.28)', Icon: Clock3 },
          ]).map(({ label, value, grad, shadow, Icon }) => (
            <div key={label} style={{ background: grad, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden', boxShadow: `0 6px 20px ${shadow}` }}>
              <div style={{ position: 'absolute', right: -14, top: -14, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  <Icon size={13} strokeWidth={2} /> {label}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter tabs ──────────────────────────────────────────────────── */}
      {!loading && fees.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', 'outstanding', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${filter === f ? '#6366F1' : 'var(--border-default)'}`,
                background: filter === f ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface)',
                color: filter === f ? '#6366F1' : 'var(--text-secondary)',
                fontWeight: filter === f ? 700 : 500, fontSize: '0.78rem', textTransform: 'capitalize',
              }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && fees.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px', background: 'var(--bg-surface)',
          borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text-muted)' }}>
            <Wallet size={40} strokeWidth={1.5} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>{copy.emptyTitle}</div>
          <p style={{ color: 'var(--text-muted)', maxWidth: 340, margin: '0 auto', fontSize: '0.875rem' }}>{copy.emptyBody}</p>
        </div>
      )}

      {/* ── No results for current filter ───────────────────────────────── */}
      {!loading && fees.length > 0 && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 24px', background: 'var(--bg-surface)',
          borderRadius: 14, border: '1px dashed var(--border-default)',
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No {filter} fees to show.</div>
        </div>
      )}

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(f => <FeeRow key={f.id} fee={f} showPlayerName={copy.showPlayerName} />)}
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .sfee-row { align-items: flex-start !important; }
          .sfee-row__amount {
            width: 100% !important; text-align: left !important;
            border-top: 1px solid var(--border-subtle); margin-top: 4px; padding-top: 8px;
          }
        }
      `}</style>
    </div>
  );
}
