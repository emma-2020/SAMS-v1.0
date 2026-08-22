// Flow test: a Player opens the wellness check-in modal and submits it.
// Exercises the real submit path (healthApi.submitHealth) rather than just
// asserting the page renders — the payload shape (1-5 scale fields + notes)
// is what every wellness KPI and AI-recommendation downstream depends on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { healthApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import PlayerHealthPage from '../../app/dashboard/player/health/page';
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

describe('Player wellness check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().login(makeSession(), makeProfile('Player', { first_name: 'Kofi' }));
    vi.mocked(healthApi.getMyHealth).mockResolvedValue([]);
    vi.mocked(healthApi.submitHealth).mockResolvedValue({
      id: 'h1', player_id: 'user-1', energy: 3, sleep: 3, muscle_soreness: 3, stress: 3,
      overall_score: 60, submitted_at: '2026-08-22T10:00:00Z',
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      session: null, user: null, isAuthenticated: false, isLoading: false, isInitialised: false, error: null,
    });
  });

  it('submits the default 1-5 scale scores and refreshes history on success', async () => {
    render(<PlayerHealthPage />);

    fireEvent.click(await screen.findByText('+ Log Wellness'));
    fireEvent.click(screen.getByRole('button', { name: /submit check-in/i }));

    await waitFor(() => {
      expect(healthApi.submitHealth).toHaveBeenCalledWith({
        energy: 3, sleep: 3, muscle_soreness: 3, stress: 3, notes: '',
      });
    });
    // onDone() re-fetches history — first call is the initial page-load GET.
    expect(healthApi.getMyHealth).toHaveBeenCalledTimes(2);
  });

  it('does not allow an Admin/Coach previewing the page to submit real data', async () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Admin', { first_name: 'Ama' }));
    render(<PlayerHealthPage />);

    fireEvent.click(await screen.findByText('+ Log Wellness'));

    expect(screen.getByText(/viewing this page as an Admin/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit check-in/i })).not.toBeInTheDocument();
    expect(healthApi.submitHealth).not.toHaveBeenCalled();
  });
});
