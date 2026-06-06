'use client';

import { useEffect, useState } from 'react';
import { coachApi } from '@sams/api';
import type { Player } from '@sams/api';
import { AthleteGrid } from '@sams/ui';
import { ROLE_COLOR } from '@sams/ui';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coachApi.getPlayers().then(setPlayers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Players</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{players.length} total</span>
      </div>
      {loading
        ? <div style={{ color: 'var(--text-muted)' }}>Loading players…</div>
        : players.length === 0
          ? <div style={{ color: 'var(--text-muted)' }}>No players found.</div>
          : <AthleteGrid
              players={players.map((p) => ({ ...p, health_score: p.latest_health?.overall_score }))}
              columns={3}
            />
      }
    </div>
  );
}
