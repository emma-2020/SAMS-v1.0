// Flow test: a Coach selects a session, marks the roster, and saves
// attendance. Attendance is one of only two routes with full offline
// write support (queued + replayed via an idempotent upsert — see
// CLAUDE.md's "Offline support" section), so the POST /attendance payload
// shape is worth locking down beyond the existing dashboard-root smoke
// tests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { apiClient, scheduleApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import AttendancePage from '../../app/dashboard/coach/attendance/page';
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

const EVENT = {
  id: 'ev1',
  team_id: 'team-1',
  title: 'Tuesday Training',
  start_time: '2026-09-01T16:00:00Z',
  end_time: '2026-09-01T17:30:00Z',
  type: 'Training' as const,
  location: 'Main Pitch',
};

const ROSTER = [
  { player_id: 'p1', first_name: 'Kofi', last_name: 'Mensah', email: 'kofi@x.com', status: null, notes: null },
];

describe('Coach attendance — mark and save', () => {
  beforeEach(() => {
    useAuthStore.getState().login(makeSession(), makeProfile('Coach', { first_name: 'Cara' }));
    vi.mocked(scheduleApi.getEvents).mockResolvedValue([EVENT]);
    vi.mocked(apiClient.get).mockResolvedValue({ data: { event: EVENT, roster: ROSTER } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    useAuthStore.setState({
      session: null, user: null, isAuthenticated: false, isLoading: false, isInitialised: false, error: null,
    });
  });

  it('marks the roster Present and POSTs the correct attendance payload', async () => {
    render(<AttendancePage />);

    fireEvent.click(await screen.findByText('Tuesday Training'));
    expect(await screen.findByText('Kofi Mensah')).toBeInTheDocument();

    // "Mark all: Present" is the first Present-labelled button in DOM order
    // (it renders above the per-row toggle) — with a single-player roster
    // this has the same effect as marking that one player.
    const presentButtons = screen.getAllByRole('button', { name: /Present/i });
    fireEvent.click(presentButtons[0]);

    fireEvent.click(screen.getByRole('button', { name: /Save Attendance/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/attendance', {
        event_id: 'ev1',
        records: [{ player_id: 'p1', status: 'Present', notes: undefined }],
      });
    });
    expect(await screen.findByText('Attendance saved successfully!')).toBeInTheDocument();
  });
});
