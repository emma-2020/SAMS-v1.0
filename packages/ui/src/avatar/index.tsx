import { View, Text } from '../primitives';
import { ROLE_COLOR } from '../theme/colors';
import type { UserProfile } from '@sams/api';

interface AvatarProps {
  user: (Partial<Pick<UserProfile, 'role'>> & Pick<UserProfile, 'first_name' | 'last_name' | 'email'>) | null;
  size?: number;
}

/** DiceBear initials avatar — identical seed logic to existing AppShell */
export function Avatar({ user, size = 34 }: AvatarProps) {
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  const color = ROLE_COLOR[user?.role as keyof typeof ROLE_COLOR] ?? '#7C3AED';
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  const fontSize = Math.round(size * 0.35);
  const radius = Math.round(size / 2);

  return (
    <View
      className="items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: `${color}18`,
        borderWidth: 2,
        borderColor: `${color}35`,
      }}
    >
      <Text
        style={{ fontSize, fontWeight: '800', color }}
        aria-label={name || 'User avatar'}
      >
        {initials}
      </Text>
    </View>
  );
}
