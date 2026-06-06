import { View, Text } from '../primitives';
import type { StyleProp, ViewStyle } from 'react-native';

interface CardBase {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps extends CardBase {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
}

export function StatCard({ title, value, subtitle, trend, trendValue, accentColor, className, style }: StatCardProps) {
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#94A3B8';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <View
      className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700${className ? ` ${className}` : ''}`}
      style={[{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, style]}
    >
      {accentColor && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: accentColor }} />
      )}
      <Text className="text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1">
        {title}
      </Text>
      <Text className="text-3xl font-black text-slate-900 dark:text-white" style={{ letterSpacing: -1 }}>
        {value}
      </Text>
      {subtitle && (
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</Text>
      )}
      {trend && trendValue && (
        <View className="flex-row items-center mt-2 gap-1">
          <Text style={{ fontSize: 12, fontWeight: '700', color: trendColor }}>
            {trendArrow} {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────
interface KpiCardProps extends CardBase {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  delta?: string;
}

export function KpiCard({ label, value, icon, delta, className }: KpiCardProps) {
  return (
    <View
      className={`bg-white dark:bg-slate-800 rounded-2xl p-5 flex-1 border border-slate-100 dark:border-slate-700${className ? ` ${className}` : ''}`}
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="w-10 h-10 rounded-xl items-center justify-center bg-indigo-50 dark:bg-indigo-900/30">
          {icon}
        </View>
        {delta && (
          <Text className="text-xs font-bold text-emerald-500">{delta}</Text>
        )}
      </View>
      <Text className="text-2xl font-black text-slate-900 dark:text-white" style={{ letterSpacing: -0.5 }}>
        {value}
      </Text>
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
        {label}
      </Text>
    </View>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
interface SectionCardProps extends CardBase {
  title?: string;
  subtitle?: string;
  accentColor?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function SectionCard({ title, subtitle, accentColor, children, headerRight, className, style }: SectionCardProps) {
  return (
    <View
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden${className ? ` ${className}` : ''}`}
      style={[{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, style]}
    >
      {accentColor && (
        <View style={{ height: 3, backgroundColor: accentColor }} />
      )}
      {(title || headerRight) && (
        <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
          <View>
            {title && (
              <Text className="text-base font-bold text-slate-900 dark:text-white">{title}</Text>
            )}
            {subtitle && (
              <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</Text>
            )}
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
export function StatusPill({ label, color = '#6366F1', size = 'md' }: { label: string; color?: string; size?: 'sm' | 'md' }) {
  const py = size === 'sm' ? 2 : 3;
  const px = size === 'sm' ? 6 : 10;
  const fs = size === 'sm' ? 9 : 11;
  return (
    <View style={{ paddingVertical: py, paddingHorizontal: px, borderRadius: 99, backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}30`, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: fs, fontWeight: '700', color, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

// ─── ScoreChip ────────────────────────────────────────────────────────────────
export function ScoreChip({ score }: { score: number }) {
  const color = score >= 4 ? '#10B981' : score >= 3 ? '#FBBF24' : '#EF4444';
  return (
    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}30`, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{score}/5</Text>
    </View>
  );
}
