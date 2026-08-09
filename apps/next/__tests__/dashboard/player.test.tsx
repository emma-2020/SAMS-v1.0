// Smoke test: given a mocked authenticated Player session, does the Player
// dashboard root page render without throwing, and show recognizable
// player-specific content? Not exhaustive coverage — see CLAUDE.md.
//
// Unlike the other three roles, apps/next/app/dashboard/player/page.tsx is
// NOT a thin `@sams/app` screen wrapper — it's its own full client
// component (see CLAUDE.md investigation notes, item 4).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@sams/store';
import PlayerDashboardPage from '../../app/dashboard/player/page';
import { makeSession, makeProfile } from '../../test/fixtures';

vi.mock('@sams/api', async () => {
  const { buildApiMock } = await import('../../test/apiMock');
  return buildApiMock();
});

vi.mock('next/navigation', async () => {
  const { buildNavigationMock } = await import('../../test/navigationMock');
  return buildNavigationMock();
});

vi.mock('@sams/store', async () => {
  const { buildStoreMock } = await import('../../test/storeMock');
  return buildStoreMock();
});

describe('Player dashboard root page', () => {
  afterEach(() => {
    useAuthStore.setState({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialised: false,
      error: null,
    });
  });

  it('renders for an authenticated Player session and shows player-specific content', () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Player', { first_name: 'Percy' }));

    render(<PlayerDashboardPage />);

    // Hero greeting includes the signed-in user's first name.
    expect(screen.getByText(/Percy/)).toBeInTheDocument();
    // Static, Player-specific labels.
    expect(screen.getByText('Sessions This Month')).toBeInTheDocument();
    expect(screen.getByText('My Workouts')).toBeInTheDocument();
  });
});
