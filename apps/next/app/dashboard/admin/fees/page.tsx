'use client';

import { useState, useEffect } from 'react';
import { feesApi, adminApi } from '@sams/api';
import type { FeeLedgerEntry, UserProfile } from '@sams/api';

// ─── Helpers ────────────────────────────────────────────────────────────
function fmt(pesewas: number) { return `GHS ${(pesewas / 100).toFixed(2)}`; }
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const METHOD_CFG: Record<string, { color: string; bg: string; label: string }> = {
  Cash:   { color: '#059669', bg: '#ECFDF5', label: 'Cash'   },
  MoMo:   { color: '#7C3AED', bg: '#F5F3FF', label: 'MoMo'   },
  Bank:   { color: '#2563EB', bg: '#EFF6FF', label: 'Bank'   },
  Online: { color: '#0891B2', bg: '#ECFEFF', label: 'Online' },
  Other:  { color: '#64748B', bg: '#F8FAFC', label: 'Other'  },
};

// ─── Icons ──────────────────────────────────────────────────────────────
const Ico = {
  Plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Pencil: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  X:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Wallet: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h14v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
};

// ─── Label ──────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{children}</label>;
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
      onFocus={e => e.target.style.borderColor = '#6366F1'}
      onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
  );
}

// ─── Fee Form Modal ──────────────────────────────────────────────────────
function FeeModal({ players, editFee, onSave, onClose }: {
  players: UserProfile[];
  editFee: FeeLedgerEntry | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [playerId,    setPlayerId]    = useState(editFee?.player?.id ?? '');
  const [description, setDescription] = useState(editFee?.description ?? '');
  const [amountOwed,  setAmountOwed]  = useState(editFee ? String(editFee.amount_owed / 100) : '');
  const [amountPaid,  setAmountPaid]  = useState(editFee ? String(editFee.amount_paid / 100) : '');
  const [method,      setMethod]      = useState(editFee?.payment_method ?? '');
  const [payDate,     setPayDate]     = useState(editFee?.payment_date ?? '');
  const [notes,       setNotes]       = useState(editFee?.notes ?? '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSave() {
    if (!description.trim()) { setError('Description is required.'); return; }
    const owed = Math.round(parseFloat(amountOwed) * 100);
    const paid = Math.round(parseFloat(amountPaid || '0') * 100);
    if (isNaN(owed) || owed < 0) { setError('Amount owed must be a positive number.'); return; }
    if (paid > owed) { setError('Amount paid cannot exceed amount owed.'); return; }
    if (!editFee && !playerId) { setError('Please select a player.'); return; }

    setSaving(true); setError('');
    try {
      if (editFee) {
        await feesApi.updateFee(editFee.id, {
          description: description.trim(),
          amount_owed: owed,
          amount_paid: paid,
          payment_method: method || undefined,
          payment_date: payDate || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await feesApi.createFee({
          player_id: playerId,
          description: description.trim(),
          amount_owed: owed,
          payment_method: method || undefined,
          payment_date: payDate || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save fee record.');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(15,23,42,0.18)', display: 'flex', flexDirection: 'column', gap: 16 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            {editFee ? 'Update Payment' : 'Add Fee Record'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}><Ico.X /></button>
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem' }}>{error}</div>}

        {!editFee && (
          <div>
            <Label>Player</Label>
            <select value={playerId} onChange={e => setPlayerId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', color: '#0F172A', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">Select player…</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
        )}

        <div>
          <Label>Description</Label>
          <Input value={description} onChange={setDescription} placeholder="e.g. Monthly academy fee – July" />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Label>Amount Owed (GHS)</Label>
            <Input type="number" value={amountOwed} onChange={setAmountOwed} placeholder="0.00" />
          </div>
          <div style={{ flex: 1 }}>
            <Label>Amount Paid (GHS)</Label>
            <Input type="number" value={amountPaid} onChange={setAmountPaid} placeholder="0.00" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Label>Payment Method</Label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', color: '#0F172A', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">Not paid yet</option>
              {Object.entries(METHOD_CFG).filter(([k]) => k !== 'Online').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <Label>Payment Date</Label>
            <Input type="date" value={payDate} onChange={setPayDate} />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note…" rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', color: '#0F172A', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#6366F1'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid #E2E8F0', borderRadius: 11, background: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 11, background: saving ? '#94A3B8' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : editFee ? 'Update Payment' : 'Add Fee Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fee Row ────────────────────────────────────────────────────────────
function FeeRow({ fee, onEdit, onDelete }: { fee: FeeLedgerEntry; onEdit: () => void; onDelete: () => void }) {
  const balance  = fee.amount_owed - fee.amount_paid;
  const paid     = balance <= 0;
  const partial  = fee.amount_paid > 0 && balance > 0;
  const methCfg  = fee.payment_method ? METHOD_CFG[fee.payment_method] : null;

  return (
    <div className="fee-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: '#fff', border: `1.5px solid ${paid ? '#A7F3D0' : partial ? '#FDE68A' : '#E2E8F0'}`, borderLeft: `4px solid ${paid ? '#059669' : partial ? '#F59E0B' : '#6366F1'}`, boxShadow: '0 1px 4px rgba(15,23,42,0.04)', flexWrap: 'wrap' }}>
      {/* Player avatar */}
      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#F5F3FF', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.72rem', color: '#7C3AED' }}>
        {fee.player ? `${fee.player.first_name[0]}${fee.player.last_name[0]}`.toUpperCase() : '?'}
      </div>
      {/* Player name + description */}
      <div className="fee-row__info" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fee.player ? `${fee.player.first_name} ${fee.player.last_name}` : '—'}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fee.description}</div>
        {fee.notes && <div style={{ fontSize: '0.67rem', color: '#94A3B8', marginTop: 2, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Note: {fee.notes}</div>}
      </div>
      {/* Amounts */}
      <div className="fee-row__amounts" style={{ textAlign: 'right', flexShrink: 0, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: paid ? '#059669' : partial ? '#F59E0B' : '#6366F1', whiteSpace: 'nowrap' }}>
          {paid ? 'PAID' : `Balance: ${fmt(balance)}`}
        </div>
        <div style={{ fontSize: '0.67rem', color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap' }}>
          {fmt(fee.amount_paid)} / {fmt(fee.amount_owed)}
        </div>
        {methCfg && (
          <span style={{ display: 'inline-block', marginTop: 4, fontSize: '0.61rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: methCfg.bg, color: methCfg.color, whiteSpace: 'nowrap' }}>
            {methCfg.label}{fee.payment_date ? ` · ${fmtDate(fee.payment_date)}` : ''}
          </span>
        )}
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {fee.payment_url && (
          <a href={fee.payment_url} target="_blank" rel="noreferrer"
            title="Copy payment link"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #A5F3FC', background: '#ECFEFF', color: '#0891B2', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.62rem', fontWeight: 700, textDecoration: 'none', gap: 4 }}>
            💳 Pay
          </a>
        )}
        <button onClick={onEdit} style={{ padding: '7px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#6366F1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Ico.Pencil /></button>
        <button onClick={onDelete} style={{ padding: '7px', borderRadius: 8, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Ico.Trash /></button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────
export default function FeesPage() {
  const [fees,     setFees]     = useState<FeeLedgerEntry[]>([]);
  const [players,  setPlayers]  = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editFee,  setEditFee]  = useState<FeeLedgerEntry | null>(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<'all' | 'outstanding' | 'paid'>('all');

  async function load() {
    setLoading(true);
    try {
      const [f, m] = await Promise.all([feesApi.getFees(), adminApi.getMembers()]);
      setFees(f);
      setPlayers(m.filter(p => p.role === 'Player'));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this fee record?')) return;
    try { await feesApi.deleteFee(id); load(); } catch { /* silent */ }
  }

  const filtered = fees.filter(f => {
    const name = f.player ? `${f.player.first_name} ${f.player.last_name}`.toLowerCase() : '';
    const desc = f.description.toLowerCase();
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !desc.includes(q)) return false;
    const balance = f.amount_owed - f.amount_paid;
    if (filter === 'outstanding') return balance > 0;
    if (filter === 'paid')        return balance <= 0;
    return true;
  });

  const totalOwed       = fees.reduce((s, f) => s + f.amount_owed, 0);
  const totalCollected  = fees.reduce((s, f) => s + f.amount_paid, 0);
  const totalOutstanding = totalOwed - totalCollected;
  const collectionRate  = totalOwed > 0 ? Math.round((totalCollected / totalOwed) * 100) : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>Fee Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>Track and manage academy fees and payments</p>
        </div>
        <button onClick={() => { setEditFee(null); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0 }}>
          <Ico.Plus /> Add Fee
        </button>
      </div>

      {/* KPI row */}
      <div className="kpi-grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Owed',    value: fmt(totalOwed),        color: '#6366F1', sub: `${fees.length} records` },
          { label: 'Collected',     value: fmt(totalCollected),   color: '#059669', sub: `${collectionRate}% rate` },
          { label: 'Outstanding',   value: fmt(totalOutstanding), color: totalOutstanding > 0 ? '#DC2626' : '#059669', sub: 'balance due' },
          { label: 'Players',       value: String(new Set(fees.map(f => f.player?.id)).size), color: '#7C3AED', sub: 'with records' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.63rem', color: '#94A3B8', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fee-filters" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 160px', minWidth: 140, display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 11, background: '#fff', padding: '0 12px', gap: 6 }}>
          <span style={{ color: '#94A3B8', pointerEvents: 'none', fontSize: '0.82rem', flexShrink: 0, lineHeight: 1 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player or description…"
            style={{ flex: 1, padding: '9px 0', border: 'none', fontSize: '0.82rem', color: '#0F172A', outline: 'none', background: 'transparent', minWidth: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {(['all', 'outstanding', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '9px 13px', borderRadius: 10, border: `1.5px solid ${filter === f ? '#6366F1' : '#E2E8F0'}`, background: filter === f ? '#EEF2FF' : '#fff', color: filter === f ? '#6366F1' : '#64748B', fontWeight: filter === f ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
              {f === 'all' ? 'All' : f === 'outstanding' ? 'Outstanding' : 'Paid'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#F8FAFC', borderRadius: 20, border: '1.5px dashed #CBD5E1' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}><Ico.Wallet /></div>
          <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6 }}>No fee records found</div>
          <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{search ? 'Try a different search.' : 'Click "Add Fee" to create the first record.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(f => (
            <FeeRow key={f.id} fee={f}
              onEdit={() => { setEditFee(f); setShowForm(true); }}
              onDelete={() => handleDelete(f.id)} />
          ))}
        </div>
      )}

      {showForm && (
        <FeeModal
          players={players}
          editFee={editFee}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)} />
      )}

      <style>{`
        @media (max-width: 600px) {
          .fee-row {
            align-items: flex-start !important;
          }
          .fee-row__info {
            min-width: 0;
            flex: 1 1 120px !important;
          }
          .fee-row__amounts {
            width: 100% !important;
            text-align: left !important;
            border-top: 1px solid #F1F5F9;
            margin-top: 6px;
            padding-top: 6px;
            flex: 1 1 100% !important;
          }
          .fee-filters {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .fee-filters > div:last-child {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
