// src/router/guards.jsx
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Route Guards
 * ─────────────
 *
 * ProtectedRoute
 *   Blocks unauthenticated users. Preserves `from` location so after
 *   login the user lands back where they tried to go.
 *
 * RoleRoute
 *   Wraps ProtectedRoute and additionally checks role membership.
 *   Renders a dedicated 403 page for authenticated-but-wrong-role access.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 *   <Route element={<RoleRoute allowed={['Admin']} />}>
 *     <Route path="/admin/*" element={<AdminArea />} />
 *   </Route>
 */

import { Outlet } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────
// LOADING SCREEN — shown during session restoration
// ─────────────────────────────────────────────────────────────────

function InitialisingScreen() {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '100vh',
      background:     'var(--bg-base)',
      gap:            '16px',
    }}>
      <div style={{
        fontFamily:    'var(--font-display)',
        fontSize:      '1.75rem',
        fontWeight:    800,
        letterSpacing: '0.12em',
        color:         'var(--text-primary)',
      }}>
        SAMS
      </div>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 403 FORBIDDEN SCREEN
// ─────────────────────────────────────────────────────────────────

function ForbiddenScreen({ role, allowed }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '100vh',
      background:     'var(--bg-base)',
      padding:        '32px',
      textAlign:      'center',
      gap:            '12px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   '4rem',
        fontWeight: 500,
        color:      'var(--danger)',
        lineHeight: 1,
      }}>403</div>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize:   '1.75rem',
        color:      'var(--text-primary)',
      }}>Access Denied</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 380 }}>
        Your role <strong style={{ color: 'var(--accent)' }}>{role}</strong> does
        not have permission to view this section.
        {allowed?.length > 0 && (
          <> Required: {allowed.join(' or ')}.</>
        )}
      </p>
      <Navigate to="/dashboard" replace />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROTECTED ROUTE
// Redirects unauthenticated visitors to /login
// ─────────────────────────────────────────────────────────────────

export function ProtectedRoute() {
  const { isAuthenticated, isInitialised } = useAuthStore();
  const location = useLocation();

  // Wait for session restoration to complete before making a routing decision.
  // Without this check a valid persisted session would flash to /login on load.
  if (!isInitialised) {
    return <InitialisingScreen />;
  }

  if (!isAuthenticated) {
    // Preserve attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// ─────────────────────────────────────────────────────────────────
// ROLE ROUTE
// Layered on top of ProtectedRoute.
// Blocks authenticated users whose role is not in `allowed`.
//
// @param {string[]} allowed  — e.g. ['Admin'] or ['Admin', 'Coach']
// ─────────────────────────────────────────────────────────────────

export function RoleRoute({ allowed = [] }) {
  const { isAuthenticated, isInitialised, user } = useAuthStore();
  const location = useLocation();

  if (!isInitialised) return <InitialisingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowed.includes(user?.role)) {
    return <ForbiddenScreen role={user?.role} allowed={allowed} />;
  }

  return <Outlet />;
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC ONLY ROUTE
// Redirects already-authenticated users away from login/register
// ─────────────────────────────────────────────────────────────────

export function PublicOnlyRoute() {
  const { isAuthenticated, isInitialised } = useAuthStore();

  if (!isInitialised) return <InitialisingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
