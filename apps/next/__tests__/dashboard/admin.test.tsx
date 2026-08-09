// Smoke test: given a mocked authenticated Admin session, does the Admin
// dashboard root page render without throwing, and show recognizable
// admin-specific content? Not exhaustive coverage — see CLAUDE.md.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@sams/store';
import AdminDashboardPage from '../../app/dashboard/admin/page';
import { makeSession, makeProfile } from '../../test/fixtures';

// vi.mock calls are hoisted above these imports by Vitest, so the mocked
// modules are already in place before AdminDashboardPage (and its `@sams/app`
// -> `@sams/api` / `next/navigation` transitive imports) are evaluated.
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

describe('Admin dashboard root page', () => {
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

  it('renders for an authenticated Admin session and shows admin-specific content', () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Admin', { first_name: 'Ada' }));

    render(<AdminDashboardPage />);

    // Hero greeting includes the signed-in user's first name.
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    // Static, Admin-specific labels — present regardless of the (mocked,
    // empty) API data. "Invite Member" appears twice (hero button + quick
    // action), so assert with getAllByText rather than the singular query.
    expect(screen.getByText('Total Members')).toBeInTheDocument();
    expect(screen.getByText('Active Teams')).toBeInTheDocument();
    expect(screen.getAllByText('Invite Member').length).toBeGreaterThan(0);
  });
});
