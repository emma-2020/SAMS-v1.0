/**
 * Web chart implementations using recharts.
 * Bundler resolves *.web.* on Next.js automatically.
 */
export {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Legend,
} from 'recharts';

// ─── MiniAreaChart ────────────────────────────────────────────────────────────
import { AreaChart as RC_AreaChart, Area as RC_Area, ResponsiveContainer as RC_RC, Tooltip as RC_Tooltip } from 'recharts';

interface MiniAreaChartProps {
  data: Array<{ v: number }>;
  color?: string;
  height?: number;
}

export function MiniAreaChart({ data, color = '#6366F1', height = 48 }: MiniAreaChartProps) {
  return (
    <RC_RC width="100%" height={height}>
      <RC_AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`mini-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <RC_Tooltip formatter={(v: number) => [v]} />
        <RC_Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
          fill={`url(#mini-${color.replace('#', '')})`} dot={false} />
      </RC_AreaChart>
    </RC_RC>
  );
}

// ─── ProgressRing (SVG) ───────────────────────────────────────────────────────
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({ value, max = 100, size = 80, strokeWidth = 8, color = '#6366F1', label }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / max) * circ;
  const cx = size / 2;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {label && (
        <span style={{ position: 'absolute', fontSize: size * 0.22, fontWeight: 800, color }}>{label}</span>
      )}
    </div>
  );
}
