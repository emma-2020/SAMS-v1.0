// src/__tests__/authStore.test.js
import { act } from '@testing-library/react';

// Reset the store between tests by reimporting
function getStore() {
  jest.resetModules();
  return require('../store/authStore').default;
}

describe('authStore', () => {

  const mockSession = {
    access_token:  'access.tok.123',
    refresh_token: 'refresh.tok.456',
    expires_in:    3600,
    token_type:    'Bearer',
  };

  const mockProfile = {
    id:         'user-001',
    academy_id: 'acad-001',
    email:      'coach@riverside.com',
    role:       'Coach',
    first_name: 'Marcus',
    last_name:  'Reyes',
  };

  test('initial state: unauthenticated, no user', () => {
    const useAuthStore = getStore();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  test('login() sets session, profile, and isAuthenticated', () => {
    const useAuthStore = getStore();
    act(() => {
      useAuthStore.getState().login(mockSession, mockProfile);
    });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockProfile);
    expect(state.session.access_token).toBe('access.tok.123');
  });

  test('logout() clears all auth state', () => {
    const useAuthStore = getStore();
    act(() => {
      useAuthStore.getState().login(mockSession, mockProfile);
      useAuthStore.getState().logout();
    });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  test('accessToken selector returns token from session', () => {
    const useAuthStore = getStore();
    act(() => { useAuthStore.getState().login(mockSession, mockProfile); });
    expect(useAuthStore.getState().session?.access_token).toBe('access.tok.123');
  });

  test('accessToken selector returns null when not logged in', () => {
    const useAuthStore = getStore();
    expect(useAuthStore.getState().session?.access_token).toBeNull();
  });

  test('role selector returns user role', () => {
    const useAuthStore = getStore();
    act(() => { useAuthStore.getState().login(mockSession, mockProfile); });
    expect(useAuthStore.getState().user?.role).toBe('Coach');
  });

  test('role selector returns null when not logged in', () => {
    const useAuthStore = getStore();
    expect(useAuthStore.getState().user?.role).toBeNull();
  });

  test('fullName selector concatenates first and last name', () => {
    const useAuthStore = getStore();
    act(() => { useAuthStore.getState().login(mockSession, mockProfile); });
    const u = useAuthStore.getState().user;
    const fullName = u ? `${u.first_name} ${u.last_name}` : '';
    expect(fullName).toBe('Marcus Reyes');
  });

  test('refreshSession() replaces access token without clearing user', () => {
    const useAuthStore = getStore();
    act(() => { useAuthStore.getState().login(mockSession, mockProfile); });
    act(() => {
      useAuthStore.getState().refreshSession({
        ...mockSession, access_token: 'new.access.tok',
      });
    });
    const state = useAuthStore.getState();
    expect(state.session.access_token).toBe('new.access.tok');
    expect(state.user).toEqual(mockProfile);  // profile unchanged
    expect(state.isAuthenticated).toBe(true);
  });

  test('setUser() updates profile fields', () => {
    const useAuthStore = getStore();
    act(() => { useAuthStore.getState().login(mockSession, mockProfile); });
    act(() => {
      useAuthStore.getState().setUser({ ...mockProfile, first_name: 'Updated' });
    });
    expect(useAuthStore.getState().user.first_name).toBe('Updated');
  });

  test('setError() and clearError() manage error state', () => {
    const useAuthStore = getStore();
    act(() => { useAuthStore.getState().setError('Something went wrong.'); });
    expect(useAuthStore.getState().error).toBe('Something went wrong.');
    act(() => { useAuthStore.getState().clearError(); });
    expect(useAuthStore.getState().error).toBeNull();
  });
});


// ════════════════════════════════════════════════════════════════
// ROUTE GUARDS TESTS
// ════════════════════════════════════════════════════════════════

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock the authStore for guard tests
jest.mock('../store/authStore');
const mockUseAuthStore = require('../store/authStore').default;

import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from '../router/guards';

function renderWithRouter(ui, { initialEntries = ['/'] } = {}) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('ProtectedRoute', () => {

  test('shows loading spinner when not yet initialised', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isInitialised:   false,
      user:            null,
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    );

    // Should render the SAMS wordmark in the loading screen, not the content
    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('SAMS')).toBeInTheDocument();
  });

  test('redirects to /login when unauthenticated and initialised', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isInitialised:   true,
      user:            null,
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    );

    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('renders children when authenticated and initialised', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
      user:            { role: 'Coach' },
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

describe('RoleRoute', () => {

  test('blocks access when role is not in allowed list — redirects to /dashboard', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
      user:            { role: 'Player' },
    });

    renderWithRouter(
      <Routes>
        <Route element={<RoleRoute allowed={['Admin']} />}>
          <Route path="/" element={<div>Admin Only Content</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Player Dashboard</div>} />
      </Routes>
    );

    // Player should be redirected away from Admin route
    expect(screen.queryByText('Admin Only Content')).toBeNull();
  });

  test('grants access when role matches allowed list', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
      user:            { role: 'Admin' },
    });

    renderWithRouter(
      <Routes>
        <Route element={<RoleRoute allowed={['Admin']} />}>
          <Route path="/" element={<div>Admin Only Content</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
  });

  test('grants access when role is one of multiple allowed', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
      user:            { role: 'Coach' },
    });

    renderWithRouter(
      <Routes>
        <Route element={<RoleRoute allowed={['Admin', 'Coach']} />}>
          <Route path="/" element={<div>Shared Content</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('Shared Content')).toBeInTheDocument();
  });

  test('Player blocked from Admin-only route', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
      user:            { role: 'Player' },
    });

    renderWithRouter(
      <Routes>
        <Route element={<RoleRoute allowed={['Admin']} />}>
          <Route path="/" element={<div>Admin Section</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Redirected</div>} />
      </Routes>
    );

    expect(screen.queryByText('Admin Section')).toBeNull();
  });

  test('Parent blocked from Coach-only route', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
      user:            { role: 'Parent' },
    });

    renderWithRouter(
      <Routes>
        <Route element={<RoleRoute allowed={['Coach', 'Admin']} />}>
          <Route path="/" element={<div>Coach Area</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Redirected</div>} />
      </Routes>
    );

    expect(screen.queryByText('Coach Area')).toBeNull();
  });
});

describe('PublicOnlyRoute', () => {

  test('renders children when user is not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isInitialised:   true,
    });

    renderWithRouter(
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<div>Login Page</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('redirects authenticated users away from login to /dashboard', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isInitialised:   true,
    });

    renderWithRouter(
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<div>Login Page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    );

    expect(screen.queryByText('Login Page')).toBeNull();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
