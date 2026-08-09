// Smoke test: given a mocked authenticated Parent session, does the Parent
// dashboard root page render without throwing, and show recognizable
// parent-specific content? Not exhaustive coverage — see CLAUDE.md.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@sams/store';
import ParentDashboardPage from '../../app/dashboard/parent/page';
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

describe('Parent dashboard root page', () => {
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

  it('renders for an authenticated Parent session and shows parent-specific content', () => {
    useAuthStore.getState().login(makeSession(), makeProfile('Parent', { first_name: 'Pat' }));

    render(<ParentDashboardPage />);

    // Hero greeting includes the signed-in user's first name.
    expect(screen.getByText(/Pat/)).toBeInTheDocument();
    // Static "PARENT" role badge and a Parent-specific quick action.
    expect(screen.getByText('PARENT')).toBeInTheDocument();
    expect(screen.getByText("Child's Schedule")).toBeInTheDocument();
  });
});
