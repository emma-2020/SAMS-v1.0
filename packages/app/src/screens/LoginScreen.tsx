'use client';

/**
 * Cross-platform Login screen.
 * Uses React Native primitives + NativeWind. The brand panel is hidden on mobile
 * via 'hidden md:flex' (NativeWind responsive modifier).
 */
import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@sams/ui';
import { StyledInput, Button } from '@sams/ui';
import { useAuthStore } from '@sams/store';
import { authApi } from '@sams/api';
import { useRouter } from 'solito/navigation';
import { ROLE_COLOR, ACCENT, NAVY_DARK } from '@sams/ui';
import { ROLE_DASHBOARD } from '../navigation/config';

const ROLES = [
  { role: 'Admin'  as const, desc: 'Manage the full academy'     },
  { role: 'Coach'  as const, desc: 'Run training & track rosters' },
  { role: 'Player' as const, desc: 'View schedule & log wellness'  },
  { role: 'Parent' as const, desc: 'Monitor your athlete'          },
];

interface FormState {
  email: string;
  password: string;
  academy_id: string;
}

export function LoginScreen() {
  const router = useRouter();
  const loginStore = useAuthStore((s) => s.login);

  const [form, setForm] = useState<FormState>({ email: '', password: '', academy_id: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    if (apiError) setApiError('');
  }

  function validate(): Partial<FormState> {
    const e: Partial<FormState> = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required.';
    if (!form.password) e.password = 'Password required.';
    if (!form.academy_id.trim()) e.academy_id = 'Academy ID required.';
    return e;
  }

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      const { session, profile } = await authApi.login({
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        academy_id: form.academy_id.trim(),
      });
      loginStore(session, profile);
      router.push(ROLE_DASHBOARD[profile.role] ?? '/dashboard');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, loginStore, router]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 md:flex-row">

        {/* ── Brand panel (hidden on mobile, shown on md+) ── */}
        <View
          className="hidden md:flex flex-col justify-center px-16 py-20 flex-none"
          style={{ width: '42%', backgroundColor: NAVY_DARK, position: 'relative', overflow: 'hidden' }}
        >
          {/* Decorative circles */}
          <View style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: `${ACCENT}14` }} />
          <View style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: `${ACCENT}0A` }} />

          {/* Logo */}
          <View className="flex-row items-center gap-3 mb-12">
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
              <Text style={{ fontWeight: '900', fontSize: 18, color: '#FFFFFF' }}>S</Text>
            </View>
            <View>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#FFFFFF', letterSpacing: 4 }}>SAMS</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>Sports Academy</Text>
            </View>
          </View>

          {/* Headline */}
          <Text style={{ fontWeight: '900', fontSize: 36, color: '#FFFFFF', lineHeight: 44, letterSpacing: -0.5, marginBottom: 16 }}>
            The Command{'\n'}Centre for{'\n'}
            <Text style={{ color: '#818CF8' }}>Elite Academies.</Text>
          </Text>

          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 22, maxWidth: 320, marginBottom: 40 }}>
            Unified scheduling, attendance tracking, health monitoring, and team communications.
          </Text>

          {/* Role list */}
          <View className="gap-3">
            {ROLES.map(({ role, desc }) => {
              const color = ROLE_COLOR[role];
              return (
                <View key={role} className="flex-row items-center gap-3">
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${color}25`, borderWidth: 1, borderColor: `${color}40`, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                  </View>
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 13, color, letterSpacing: 0.4 }}>{role}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={{ marginTop: 52, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
            SAMS v1.0 · Base Model MVP
          </Text>
        </View>

        {/* ── Form panel ── */}
        <View className="flex-1 items-center justify-center px-6 md:px-16 py-10">
          <View style={{ width: '100%', maxWidth: 420 }}>

            {/* Mobile logo */}
            <View className="flex md:hidden flex-row items-center gap-3 mb-8">
              <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '900', fontSize: 16, color: '#FFFFFF' }}>S</Text>
              </View>
              <Text style={{ fontWeight: '800', fontSize: 18, color: '#0F172A', letterSpacing: 1 }}>SAMS</Text>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 4, textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 6 }}>
              Sign in to your Academy
            </Text>
            <Text style={{ color: '#64748B', fontSize: 14, marginBottom: 28 }}>
              Enter your credentials and Academy ID to access your workspace.
            </Text>

            {apiError ? (
              <View className="flex-row items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <Text className="text-red-500 text-sm font-medium flex-1">{apiError}</Text>
              </View>
            ) : null}

            <View className="gap-4">
              <StyledInput
                label="Academy ID"
                placeholder="Your academy UUID"
                value={form.academy_id}
                onChangeText={(v: string) => update('academy_id', v)}
                error={errors.academy_id}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <StyledInput
                label="Email Address"
                placeholder="you@academy.com"
                value={form.email}
                onChangeText={(v: string) => update('email', v)}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <StyledInput
                label="Password"
                placeholder="••••••••"
                value={form.password}
                onChangeText={(v) => update('password', v)}
                error={errors.password}
                secureTextEntry={!showPw}
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleSubmit}
              >
                Access Academy →
              </Button>
            </View>

            <Text className="text-center text-slate-400 text-xs mt-7 pt-5 border-t border-slate-200">
              Contact your Academy Administrator if you need access.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
