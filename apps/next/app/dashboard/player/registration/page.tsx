'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Phone, MapPin, Globe, Zap, ArrowRight, ArrowLeft,
  AlertCircle, CheckCircle2, Clock, XCircle, Upload, FileText,
  X, Loader2, Heart, Users, Shield,
} from 'lucide-react';
import { registrationApi } from '@sams/api';
import type { PlayerRegistration } from '@sams/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  // Section 1 — Personal
  date_of_birth: string;
  phone: string;
  address: string;
  nationality: string;
  blood_group: string;
  // Section 2 — Sport
  position: string;
  preferred_foot: string;
  previous_club: string;
  years_of_experience: string;
  // Section 3 — Emergency contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  // Section 4 — Parent/guardian
  parent_guardian_name: string;
  parent_guardian_phone: string;
  parent_guardian_relationship: string;
  // Section 5 — Medical
  medical_conditions: string;
  allergies: string;
  // Document paths (from upload)
  birth_certificate_path: string;
  passport_photo_path: string;
  national_id_path: string;
  parent_consent_path: string;
}

const EMPTY: FormState = {
  date_of_birth: '', phone: '', address: '', nationality: '', blood_group: '',
  position: '', preferred_foot: '', previous_club: '', years_of_experience: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  parent_guardian_name: '', parent_guardian_phone: '', parent_guardian_relationship: '',
  medical_conditions: '', allergies: '',
  birth_certificate_path: '', passport_photo_path: '', national_id_path: '', parent_consent_path: '',
};

const STEPS = [
  { step: 1 as Step, label: 'Personal',    icon: User,   color: '#7C3AED' },
  { step: 2 as Step, label: 'Sport',       icon: Zap,    color: '#059669' },
  { step: 3 as Step, label: 'Emergency',   icon: Phone,  color: '#DC2626' },
  { step: 4 as Step, label: 'Guardian',    icon: Users,  color: '#D97706' },
  { step: 5 as Step, label: 'Documents',   icon: Shield, color: '#2563EB' },
];

const POSITIONS = [
  'Goalkeeper', 'Right Back', 'Centre Back', 'Left Back',
  'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
  'Right Winger', 'Left Winger', 'Striker', 'Centre Forward', 'Other',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em', marginBottom: 6, display: 'block' }}>
      {children}
      {required && <span style={{ color: '#EC4899', marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
      {error && <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

function Input({ error, ...props }: { error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', height: 42, padding: '0 12px',
        background: '#FFFFFF',
        border: `1.5px solid ${error ? '#FECACA' : focused ? '#8B5CF6' : '#E2E8F0'}`,
        borderRadius: 10, outline: 'none', color: '#1E293B', fontSize: '0.875rem',
        boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.09)' : focused ? '0 0 0 3px rgba(139,92,246,0.12)' : '0 1px 3px rgba(15,23,42,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
        ...props.style,
      }}
    />
  );
}

function Select({ error, children, ...props }: { error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', height: 42, padding: '0 12px',
        background: '#FFFFFF',
        border: `1.5px solid ${error ? '#FECACA' : focused ? '#8B5CF6' : '#E2E8F0'}`,
        borderRadius: 10, outline: 'none', color: '#1E293B', fontSize: '0.875rem',
        boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.12)' : '0 1px 3px rgba(15,23,42,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
        cursor: 'pointer',
      }}
    >
      {children}
    </select>
  );
}

function Textarea({ error, ...props }: { error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', padding: '10px 12px', minHeight: 80,
        background: '#FFFFFF',
        border: `1.5px solid ${error ? '#FECACA' : focused ? '#8B5CF6' : '#E2E8F0'}`,
        borderRadius: 10, outline: 'none', color: '#1E293B', fontSize: '0.875rem',
        boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.12)' : '0 1px 3px rgba(15,23,42,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
      }}
    />
  );
}

// ─── Document upload tile ─────────────────────────────────────────────────────

function DocUploadTile({
  label, description, docType, path, onUpload,
}: {
  label: string;
  description: string;
  docType: string;
  path: string;
  onUpload: (docType: string, path: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setErr('');
    try {
      const result = await registrationApi.uploadDocument(file, docType);
      onUpload(docType, result.storage_path);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const uploaded = Boolean(path);

  return (
    <div
      onClick={() => !uploading && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); }}
      onDrop={e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      style={{
        border: `2px dashed ${uploaded ? '#A7F3D0' : '#E2E8F0'}`,
        borderRadius: 12,
        padding: '16px 18px',
        cursor: uploading ? 'not-allowed' : 'pointer',
        background: uploaded ? '#F0FDF4' : '#FAFAFA',
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!uploaded && !uploading) (e.currentTarget as HTMLDivElement).style.borderColor = '#C4B5FD'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = uploaded ? '#A7F3D0' : '#E2E8F0'; }}
    >
      <input
        ref={ref}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: uploaded ? '#ECFDF5' : '#F1F5F9',
          border: `1px solid ${uploaded ? '#A7F3D0' : '#E2E8F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: uploaded ? '#059669' : '#94A3B8',
        }}>
          {uploading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
            : uploaded ? <CheckCircle2 size={16} />
            : <Upload size={16} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: uploaded ? '#065F46' : '#1E293B' }}>{label}</div>
          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
            {uploading ? 'Uploading…'
              : uploaded ? 'File uploaded ✓ — click to replace'
              : description}
          </div>
        </div>
        {uploaded && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onUpload(docType, ''); }}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 6 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {err && (
        <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} />{err}
        </div>
      )}
    </div>
  );
}

// ─── Status screens ───────────────────────────────────────────────────────────

function StatusScreen({ reg }: { reg: PlayerRegistration }) {
  const router = useRouter();

  if (reg.status === 'approved') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(5,150,105,0.08)', border: '2px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={36} style={{ color: '#059669' }} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.025em' }}>Registration Approved!</h2>
        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
          Your registration has been approved. You now have full access to the SAMS platform.
        </p>
        <button
          onClick={() => router.push('/dashboard/player')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
          }}
        >
          Go to My Dashboard <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (reg.status === 'submitted') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', border: '2px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Clock size={36} style={{ color: '#2563EB' }} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.025em' }}>Under Review</h2>
        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 8px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          Your registration has been submitted and is being reviewed by the academy admin.
        </p>
        <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: 0 }}>
          You&apos;ll receive an email once a decision has been made.
        </p>
        {reg.submitted_at && (
          <div style={{ marginTop: 20, display: 'inline-block', padding: '8px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 99, fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>
            Submitted {new Date(reg.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>
    );
  }

  if (reg.status === 'rejected') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: '2px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <XCircle size={36} style={{ color: '#DC2626' }} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.025em' }}>Registration Needs Update</h2>
        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 16px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          Your registration was reviewed but could not be approved. Please review the feedback below and resubmit.
        </p>
        {reg.rejection_reason && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left', maxWidth: 460, margin: '0 auto 24px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9A3412', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Feedback from admin</div>
            <div style={{ fontSize: '0.88rem', color: '#7C2D12', lineHeight: 1.65 }}>{reg.rejection_reason}</div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayerRegistrationPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [registration, setRegistration] = useState<PlayerRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [showForm, setShowForm] = useState(false); // for rejected state — show form to resubmit

  useEffect(() => {
    registrationApi.getMyRegistration()
      .then(reg => {
        setRegistration(reg);
        if (reg && reg.status !== 'draft' && reg.status !== 'rejected') {
          // Not editable
        } else if (reg) {
          // Pre-fill form from existing draft/rejected record
          setForm({
            date_of_birth: reg.date_of_birth ?? '',
            phone: reg.phone ?? '',
            address: reg.address ?? '',
            nationality: reg.nationality ?? '',
            blood_group: reg.blood_group ?? '',
            position: reg.position ?? '',
            preferred_foot: reg.preferred_foot ?? '',
            previous_club: reg.previous_club ?? '',
            years_of_experience: reg.years_of_experience?.toString() ?? '',
            emergency_contact_name: reg.emergency_contact_name ?? '',
            emergency_contact_phone: reg.emergency_contact_phone ?? '',
            emergency_contact_relationship: reg.emergency_contact_relationship ?? '',
            parent_guardian_name: reg.parent_guardian_name ?? '',
            parent_guardian_phone: reg.parent_guardian_phone ?? '',
            parent_guardian_relationship: reg.parent_guardian_relationship ?? '',
            medical_conditions: reg.medical_conditions ?? '',
            allergies: reg.allergies ?? '',
            birth_certificate_path: reg.birth_certificate_path ?? '',
            passport_photo_path: reg.passport_photo_path ?? '',
            national_id_path: reg.national_id_path ?? '',
            parent_consent_path: reg.parent_consent_path ?? '',
          });
          if (reg.status === 'rejected') setShowForm(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setField(k: keyof FormState, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
  }

  function handleDocUpload(docType: string, path: string) {
    const key = `${docType}_path` as keyof FormState;
    setForm(p => ({ ...p, [key]: path }));
  }

  function validateStep(s: Step): Partial<Record<keyof FormState, string>> {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (s === 1) {
      if (!form.date_of_birth) e.date_of_birth = 'Date of birth is required.';
      if (!form.phone.trim())  e.phone = 'Phone number is required.';
      if (!form.address.trim()) e.address = 'Address is required.';
    }
    if (s === 2) {
      if (!form.position) e.position = 'Position is required.';
    }
    if (s === 3) {
      if (!form.emergency_contact_name.trim()) e.emergency_contact_name = 'Name is required.';
      if (!form.emergency_contact_phone.trim()) e.emergency_contact_phone = 'Phone is required.';
      if (!form.emergency_contact_relationship.trim()) e.emergency_contact_relationship = 'Relationship is required.';
    }
    return e;
  }

  function nextStep() {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (step < 5) setStep((step + 1) as Step);
  }

  function prevStep() {
    if (step > 1) setStep((step - 1) as Step);
  }

  async function handleSubmit() {
    // Validate all steps before final submit
    const allErrors = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      setStep(1);
      return;
    }

    setSubmitting(true);
    setSubmitErr('');
    try {
      const payload = {
        ...form,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience, 10) : undefined,
        preferred_foot: (form.preferred_foot as 'Left' | 'Right' | 'Both') || undefined,
      };
      const result = await registrationApi.submitRegistration(payload as never);
      setRegistration(result);
      setShowForm(false);
    } catch (err: unknown) {
      setSubmitErr(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ color: '#7C3AED', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Loading registration…</p>
        </div>
      </div>
    );
  }

  const showStatusScreen = registration &&
    registration.status !== 'draft' &&
    !(registration.status === 'rejected' && showForm);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 760, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.2, margin: '0 0 6px' }}>
          Player Registration
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>
          Complete your registration to get full access to the SAMS platform
        </p>
      </div>

      {/* ── Status Card ─────────────────────────────────────────────────────── */}
      {showStatusScreen ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20, boxShadow: '0 4px 24px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ height: 4, background: registration.status === 'approved' ? 'linear-gradient(90deg,#059669,#10B981)' : registration.status === 'rejected' ? 'linear-gradient(90deg,#DC2626,#F87171)' : 'linear-gradient(90deg,#2563EB,#60A5FA)' }} />
          <div style={{ padding: '32px 28px' }}>
            <StatusScreen reg={registration} />
            {registration.status === 'rejected' && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '11px 24px', borderRadius: 10,
                    background: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
                    color: '#fff', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer',
                  }}
                >
                  Update & Resubmit <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: 20, boxShadow: '0 4px 24px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg,#EC4899,#8B5CF6)' }} />

          {/* ── Step progress bar ────────────────────────────────────────── */}
          <div style={{ padding: '20px 28px 0', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 480 }}>
              {STEPS.map(({ step: s, label, icon: Icon, color }, idx) => {
                const done = step > s;
                const active = step === s;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 'none' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: done ? '#059669' : active ? color : '#F1F5F9',
                        border: `2px solid ${done ? '#059669' : active ? color : '#E2E8F0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done || active ? '#fff' : '#CBD5E1',
                        transition: 'all 0.2s',
                        boxShadow: active ? `0 0 0 4px ${color}20` : 'none',
                      }}>
                        {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: done || active ? 700 : 500, color: done ? '#059669' : active ? color : '#94A3B8', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: done ? '#059669' : '#E2E8F0', margin: '0 4px', marginBottom: 20, transition: 'background 0.2s' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Form sections ─────────────────────────────────────────────── */}
          <div style={{ padding: '24px 28px 28px' }}>

            {/* STEP 1 — Personal Details */}
            {step === 1 && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>Personal Details</div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Your basic personal information</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Field label="Date of Birth" required error={errors.date_of_birth}>
                    <Input type="date" value={form.date_of_birth} error={errors.date_of_birth}
                      onChange={e => setField('date_of_birth', e.target.value)} />
                  </Field>
                  <Field label="Phone Number" required error={errors.phone}>
                    <Input type="tel" value={form.phone} placeholder="+233 XX XXX XXXX" error={errors.phone}
                      onChange={e => setField('phone', e.target.value)} />
                  </Field>
                  <Field label="Nationality">
                    <Input value={form.nationality} placeholder="e.g. Ghanaian"
                      onChange={e => setField('nationality', e.target.value)} />
                  </Field>
                  <Field label="Blood Group">
                    <Select value={form.blood_group} onChange={e => setField('blood_group', e.target.value)}>
                      <option value="">Select blood group</option>
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </Select>
                  </Field>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Field label="Home Address" required error={errors.address}>
                    <Textarea value={form.address} placeholder="Street address, city, region…" error={errors.address}
                      onChange={e => setField('address', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 2 — Sport Details */}
            {step === 2 && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>Sport Details</div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Your playing position and football background</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Field label="Playing Position" required error={errors.position}>
                    <Select value={form.position} error={errors.position} onChange={e => setField('position', e.target.value)}>
                      <option value="">Select position</option>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </Field>
                  <Field label="Preferred Foot">
                    <Select value={form.preferred_foot} onChange={e => setField('preferred_foot', e.target.value)}>
                      <option value="">Select foot</option>
                      <option value="Right">Right</option>
                      <option value="Left">Left</option>
                      <option value="Both">Both (Ambidextrous)</option>
                    </Select>
                  </Field>
                  <Field label="Previous Club">
                    <Input value={form.previous_club} placeholder="e.g. Accra Lions FC"
                      onChange={e => setField('previous_club', e.target.value)} />
                  </Field>
                  <Field label="Years of Experience">
                    <Input type="number" min="0" max="30" value={form.years_of_experience} placeholder="e.g. 3"
                      onChange={e => setField('years_of_experience', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 3 — Emergency Contact */}
            {step === 3 && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>Emergency Contact</div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Who should we contact in case of an emergency?</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Field label="Full Name" required error={errors.emergency_contact_name}>
                    <Input value={form.emergency_contact_name} placeholder="e.g. Kofi Mensah" error={errors.emergency_contact_name}
                      onChange={e => setField('emergency_contact_name', e.target.value)} />
                  </Field>
                  <Field label="Phone Number" required error={errors.emergency_contact_phone}>
                    <Input type="tel" value={form.emergency_contact_phone} placeholder="+233 XX XXX XXXX" error={errors.emergency_contact_phone}
                      onChange={e => setField('emergency_contact_phone', e.target.value)} />
                  </Field>
                  <Field label="Relationship" required error={errors.emergency_contact_relationship}>
                    <Input value={form.emergency_contact_relationship} placeholder="e.g. Father, Mother, Uncle…" error={errors.emergency_contact_relationship}
                      onChange={e => setField('emergency_contact_relationship', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 4 — Parent / Guardian */}
            {step === 4 && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>Parent / Guardian</div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Optional — required for players under 18</div>
                </div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: '0.8rem', color: '#92400E' }}>
                  This section is optional for adult players. If you are under 18, please fill it in.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Field label="Guardian Full Name">
                    <Input value={form.parent_guardian_name} placeholder="e.g. Ama Mensah"
                      onChange={e => setField('parent_guardian_name', e.target.value)} />
                  </Field>
                  <Field label="Guardian Phone">
                    <Input type="tel" value={form.parent_guardian_phone} placeholder="+233 XX XXX XXXX"
                      onChange={e => setField('parent_guardian_phone', e.target.value)} />
                  </Field>
                  <Field label="Relationship">
                    <Input value={form.parent_guardian_relationship} placeholder="e.g. Mother, Father, Guardian"
                      onChange={e => setField('parent_guardian_relationship', e.target.value)} />
                  </Field>
                </div>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Field label="Medical Conditions">
                    <Textarea value={form.medical_conditions} placeholder="Any known medical conditions… (optional)"
                      onChange={e => setField('medical_conditions', e.target.value)} />
                  </Field>
                  <Field label="Allergies">
                    <Textarea value={form.allergies} placeholder="Any known allergies… (optional)"
                      onChange={e => setField('allergies', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 5 — Documents */}
            {step === 5 && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>Supporting Documents</div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>All documents are optional — upload what you have (JPEG, PNG, or PDF, max 10 MB each)</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  <DocUploadTile
                    label="Birth Certificate"
                    description="Upload a scanned copy or clear photo"
                    docType="birth_certificate"
                    path={form.birth_certificate_path}
                    onUpload={handleDocUpload}
                  />
                  <DocUploadTile
                    label="Passport Photo"
                    description="Recent passport-size photograph"
                    docType="passport_photo"
                    path={form.passport_photo_path}
                    onUpload={handleDocUpload}
                  />
                  <DocUploadTile
                    label="National ID / GhanaCard"
                    description="National identification document"
                    docType="national_id"
                    path={form.national_id_path}
                    onUpload={handleDocUpload}
                  />
                  <DocUploadTile
                    label="Parent / Guardian Consent"
                    description="Required for players under 18"
                    docType="parent_consent"
                    path={form.parent_consent_path}
                    onUpload={handleDocUpload}
                  />
                </div>
              </div>
            )}

            {/* ── Error banner ──────────────────────────────────────────── */}
            {submitErr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginTop: 20 }}>
                <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.83rem', color: '#B91C1C' }}>{submitErr}</span>
              </div>
            )}

            {/* ── Navigation buttons ────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', borderRadius: 10,
                  background: step === 1 ? '#F1F5F9' : '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  color: step === 1 ? '#CBD5E1' : '#475569',
                  fontWeight: 600, fontSize: '0.875rem', cursor: step === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ArrowLeft size={15} /> Previous
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '11px 24px', borderRadius: 10,
                      background: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
                      border: 'none', color: '#fff',
                      fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(168,85,247,0.3)',
                    }}
                  >
                    Next <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '11px 28px', borderRadius: 10,
                      background: submitting ? '#E2E8F0' : 'linear-gradient(135deg,#EC4899,#8B5CF6)',
                      border: 'none', color: submitting ? '#94A3B8' : '#fff',
                      fontWeight: 700, fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: submitting ? 'none' : '0 4px 14px rgba(168,85,247,0.3)',
                    }}
                  >
                    {submitting ? <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Submitting…</> : <>Submit Registration <ArrowRight size={15} /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
