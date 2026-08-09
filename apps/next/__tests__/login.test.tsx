// Smoke test for the login page: renders the email/password form, and
// submitting valid-looking input calls authApi.login with the expected
// payload. Mocks the API client — never hits a real network or Supabase.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { authApi } from '@sams/api';
import LoginPage from '../app/(auth)/login/page';
import { makeSession, makeProfile } from '../test/fixtures';

vi.mock('@sams/api', async () => {
  const { buildApiMock } = await import('../test/apiMock');
  return buildApiMock();
});

vi.mock('next/navigation', async () => {
  const { buildNavigationMock } = await import('../test/navigationMock');
  return buildNavigationMock();
});

vi.mock('@sams/store', async () => {
  const { buildStoreMock } = await import('../test/storeMock');
  return buildStoreMock();
});

describe('Login page', () => {
  beforeEach(() => {
    // authApi.login is a vi.fn() vended by the generic `@sams/api` proxy
    // mock (see test/apiMock.ts) — give it a realistic resolved value here.
    vi.mocked(authApi.login).mockResolvedValue({
      session: makeSession(),
      profile: makeProfile('Admin'),
    });
  });

  it('renders the email and password form fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /access academy/i })).toBeInTheDocument();
  });

  it('calls authApi.login with the entered credentials on submit', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/academy id/i), { target: { value: 'academy-123' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'Coach@Example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'hunter2' } });

    fireEvent.click(screen.getByRole('button', { name: /access academy/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'coach@example.com',
        password: 'hunter2',
        academy_id: 'academy-123',
      });
    });
  });
});
