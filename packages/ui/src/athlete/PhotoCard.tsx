/**
 * PS5-inspired athletic photo card.
 * Grid layout handled by parent; each card is self-contained.
 * Works on both web (renders as <div>) and native (renders as <View>).
 */
import { View, Text, Pressable } from '../primitives';
import { Avatar } from '../avatar';
import { ROLE_COLOR } from '../theme/colors';
import type { UserProfile } from '@sams/api';
import { ScoreChip, StatusPill } from '../cards';

interface AthletePhotoCardProps {
  player: Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'> & { role?: UserProfile['role'] } & {
    sport?: string;
    health_score?: number;
    team_name?: string;
  };
  onPress?: () => void;
  compact?: boolean;
}

export function AthletePhotoCard({ player, onPress, compact = false }: AthletePhotoCardProps) {
  const color = ROLE_COLOR.Player;
  const score = player.health_score ?? 0;
  const healthColor = score >= 75 ? '#10B981' : score >= 50 ? '#FBBF24' : '#EF4444';
  const initials = `${player.first_name[0] ?? ''}${player.last_name[0] ?? ''}`.toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.88 : 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      })}
    >
      {/* Banner — diagonal gradient strip */}
      <View style={{ height: compact ? 56 : 80, backgroundColor: `${color}18`, position: 'relative', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: `${color}10` }} />
        <View style={{ position: 'absolute', bottom: -30, left: 20, width: 80, height: 80, borderRadius: 40, backgroundColor: `${color}08` }} />
        {/* Sport badge */}
        {player.sport && (
          <View style={{ position: 'absolute', top: 10, right: 10 }}>
            <StatusPill label={player.sport} color={color} size="sm" />
          </View>
        )}
      </View>

      {/* Avatar — bleeds over banner */}
      <View style={{ paddingHorizontal: 16, marginTop: compact ? -24 : -32, paddingBottom: 14 }}>
        <View style={{ marginBottom: 8 }}>
          <View style={{ borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 99, alignSelf: 'flex-start' }}>
            <Avatar user={player} size={compact ? 44 : 56} />
          </View>
        </View>

        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 1 }}>
          {player.first_name} {player.last_name}
        </Text>
        <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: compact ? 6 : 10 }}>
          {player.email}
        </Text>

        {!compact && player.health_score !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: healthColor }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: healthColor }}>
              Health {player.health_score}
            </Text>
          </View>
        )}

        {player.team_name && (
          <Text style={{ fontSize: 10, color: '#CBD5E1', marginTop: 4, fontWeight: '600' }}>
            {player.team_name}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── PS5-style grid wrapper ───────────────────────────────────────────────────
interface AthleteGridProps {
  players: AthletePhotoCardProps['player'][];
  onPlayerPress?: (id: string) => void;
  columns?: 2 | 3 | 4;
}

export function AthleteGrid({ players, onPlayerPress, columns = 3 }: AthleteGridProps) {
  return (
    <View
      className={`flex-row flex-wrap gap-4`}
      style={{ gap: 16 }}
    >
      {players.map((p) => (
        <View key={p.id} style={{ width: `${100 / columns - 2}%` }}>
          <AthletePhotoCard
            player={p}
            onPress={onPlayerPress ? () => onPlayerPress(p.id) : undefined}
          />
        </View>
      ))}
    </View>
  );
}
