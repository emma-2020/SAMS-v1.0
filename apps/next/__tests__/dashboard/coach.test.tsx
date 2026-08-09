// Smoke test: given a mocked authenticated Coach session, does the Coach
// dashboard root page render without throwing, and show recognizable
// coach-specific content? Not exhaustive coverage — see CLAUDE.md.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@sams/store';
import CoachDashboardPage from '../../app/dashboard/coach/page';
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

describe('Coach dashboard root page', () => {
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

  it('renders for an authenticated Coach session and shows coach-specific content', () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Coach', { first_name: 'Cara' }));

    render(<CoachDashboardPage />);

    // Hero greeting includes the signed-in user's first name.
    expect(screen.getByText(/Cara/)).toBeInTheDocument();
    // Static, Coach-specific quick-action labels.
    expect(screen.getByText('Player Management')).toBeInTheDocument();
    expect(screen.getByText('Mark Attendance')).toBeInTheDocument();
  });
});
