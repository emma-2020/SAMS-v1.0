/**
 * Native chart implementations.
 * react-native-svg provides the ProgressRing; bar/area charts are simplified
 * native versions. Install react-native-svg in apps/expo when ready.
 */
import { View, Text } from '../primitives';

// ─── MiniAreaChart native placeholder ────────────────────────────────────────
interface MiniAreaChartProps {
  data: Array<{ v: number }>;
  color?: string;
  height?: number;
}

export function MiniAreaChart({ data, color = '#6366F1', height = 48 }: MiniAreaChartProps) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {data.map((d, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(4, (d.v / max) * (height - 4)),
            borderRadius: 3,
            backgroundColor: color,
            opacity: 0.15 + (i / data.length) * 0.85,
          }}
        />
      ))}
    </View>
  );
}

// ─── ProgressRing native (pure RN, no SVG dep required) ──────────────────────
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({ value, max = 100, size = 80, color = '#6366F1', label }: ProgressRingProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: color + '30', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: (pct / 100) * size, borderRadius: size / 2, backgroundColor: color + '20' }} />
      {label && (
        <Text style={{ fontSize: size * 0.22, fontWeight: '800', color }}>{label}</Text>
      )}
    </View>
  );
}

// Re-export stubs so imports don't break on native
export const AreaChart = () => null;
export const Area     = () => null;
export const BarChart = () => null;
export const Bar      = () => null;
export const LineChart = () => null;
export const Line     = () => null;
export const PieChart = () => null;
export const Pie      = () => null;
export const Cell     = () => null;
export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Tooltip  = () => null;
export const XAxis    = () => null;
export const YAxis    = () => null;
export const Legend   = () => null;
