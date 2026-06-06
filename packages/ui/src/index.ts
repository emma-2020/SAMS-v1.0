// Primitives
export { View, Text, ScrollView, Pressable, TextInput } from './primitives';

// Cards & layout
export { StatCard, KpiCard, SectionCard, StatusPill, ScoreChip } from './cards';

// Forms
export { StyledInput, Button } from './forms';

// Avatar
export { Avatar } from './avatar';

// Charts (platform-split)
export { MiniAreaChart, ProgressRing } from './charts/index';

// Wellness
export { HealthMeter, WellnessSlider } from './wellness/ProgressRing';

// Athlete cards
export { AthletePhotoCard, AthleteGrid } from './athlete/PhotoCard';

// Attendance
export { SplitPaneAttendance } from './attendance/SplitPane';

// Navigation
export { Link, TextLink, useRouter, useParams } from './navigation/Link';

// Theme tokens
export { ROLE_COLOR, ROLE_GRADIENT, ACCENT, DANGER, SUCCESS } from './theme/colors';
export { sharedTheme } from './theme/tailwind';
