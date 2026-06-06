import { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps, type PressableProps } from '../primitives';

// ─── StyledInput ──────────────────────────────────────────────────────────────
interface StyledInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  onChangeText?: (text: string) => void;
}

export function StyledInput({ label, error, icon, ...props }: StyledInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center rounded-xl border bg-white dark:bg-slate-800 px-3"
        style={{
          borderColor: error ? '#EF4444' : focused ? '#6366F1' : '#E2E8F0',
          height: 48,
        }}
      >
        {icon && <View className="mr-2.5 opacity-50">{icon}</View>}
        <TextInput
          className="flex-1 text-sm text-slate-900 dark:text-white"
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {error && (
        <Text className="text-xs font-medium text-red-500">{error}</Text>
      )}
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: '#6366F1', text: '#FFFFFF' },
  secondary: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
  ghost:     { bg: 'transparent', text: '#6366F1', border: '#E2E8F0' },
  danger:    { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
};

export function Button({ children, variant = 'primary', loading = false, fullWidth = false, size = 'md', disabled, ...props }: ButtonProps) {
  const vs = VARIANT_STYLES[variant];
  const height = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;
  const px = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => ({
        height,
        paddingHorizontal: px,
        borderRadius: 12,
        backgroundColor: vs.bg,
        borderWidth: vs.border ? 1 : 0,
        borderColor: vs.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: (disabled || loading) ? 0.55 : pressed ? 0.85 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        gap: 8,
      })}
      {...props}
    >
      {loading ? (
        <Text style={{ fontSize, fontWeight: '700', color: vs.text }}>Loading…</Text>
      ) : (
        <Text style={{ fontSize, fontWeight: '700', color: vs.text }}>{children}</Text>
      )}
    </Pressable>
  );
}
