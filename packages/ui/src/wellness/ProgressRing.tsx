/**
 * Cross-platform radial health indicator.
 * Uses the ProgressRing from the platform-specific chart bundle.
 */
import { View, Text } from '../primitives';

interface HealthMeterProps {
  score: number;
  size?: number;
}

function scoreToColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#FBBF24';
  if (score >= 25) return '#F97316';
  return '#EF4444';
}

export function HealthMeter({ score, size = 80 }: HealthMeterProps) {
  const color = scoreToColor(score);
  // Native-safe ring using border trick — works without SVG
  const borderWidth = Math.max(6, size * 0.09);
  const radius = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: radius,
        borderWidth, borderColor: '#F1F5F9',
        position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: radius,
        borderWidth, borderColor: color,
        position: 'absolute',
        opacity: score / 100,
      }} />
      <Text style={{ fontSize: size * 0.22, fontWeight: '900', color }}>{score}</Text>
      <Text style={{ fontSize: size * 0.14, color: '#94A3B8', fontWeight: '600' }}>/ 100</Text>
    </View>
  );
}

// ─── Wellness Slider (read-only display bar) ──────────────────────────────────
interface WellnessSliderProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export function WellnessSlider({ label, value, max = 5, color = '#6366F1' }: WellnessSliderProps) {
  const pct = (value / max) * 100;
  return (
    <View className="gap-1 mb-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color }}>{value}/{max}</Text>
      </View>
      <View className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: color }} />
      </View>
    </View>
  );
}
