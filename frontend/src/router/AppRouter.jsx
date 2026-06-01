// src/router/AppRouter.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './guards';
import AppShell          from '../components/layout/AppShell';
import LoginPage         from '../pages/auth/LoginPage';
import SettingsPage      from '../pages/settings/index';
import useAuthStore      from '../store/authStore';

// Admin pages
import AdminDashboard    from '../pages/admin/index';
import AdminSchedule     from '../pages/admin/SchedulePage';
import AdminInvitations  from '../pages/admin/InvitationsPage';
import AdminRoster       from '../pages/admin/RosterPage';

// Coach pages
import CoachDashboard    from '../pages/coach/index';

// Player pages
import PlayerDashboard   from '../pages/player/index';

// Parent pages
import ParentDashboard   from '../pages/parent/index';

// Shared pages (role-specific content handled inside)
import ChatPage          from '../pages/chat/index';

function SmartRoleRedirect() {
  const role = useAuthStore(s => s.user?.role);
  const dest = {
    Admin:  '/dashboard/admin',
    Coach:  '/dashboard/coach',
    Player: '/dashboard/player',
    Parent: '/dashboard/parent',
  }[role] || '/login';
  return <Navigate to={dest} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<SmartRoleRedirect />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<SmartRoleRedirect />} />

          {/* ── Admin ──────────────────────────────────────────── */}
          <Route element={<RoleRoute allowed={['Admin']} />}>
            <Route path="/dashboard/admin"           element={<AdminDashboard />} />
            <Route path="/dashboard/admin/schedule"  element={<AdminSchedule />} />
            <Route path="/dashboard/admin/invite"    element={<AdminInvitations />} />
            <Route path="/dashboard/admin/roster"    element={<AdminRoster />} />
            <Route path="/dashboard/admin/chat"      element={<ChatPage />} />
          </Route>

          {/* ── Coach ──────────────────────────────────────────── */}
          <Route element={<RoleRoute allowed={['Coach']} />}>
            <Route path="/dashboard/coach"            element={<CoachDashboard />} />
            <Route path="/dashboard/coach/schedule"   element={<CoachDashboard />} />
            <Route path="/dashboard/coach/attendance" element={<CoachDashboard />} />
            <Route path="/dashboard/coach/roster"     element={<CoachDashboard />} />
            <Route path="/dashboard/coach/health"     element={<CoachDashboard />} />
            <Route path="/dashboard/coach/chat"       element={<ChatPage />} />
          </Route>

          {/* ── Player ─────────────────────────────────────────── */}
          <Route element={<RoleRoute allowed={['Player']} />}>
            <Route path="/dashboard/player"          element={<PlayerDashboard />} />
            <Route path="/dashboard/player/schedule" element={<PlayerDashboard />} />
            <Route path="/dashboard/player/workouts" element={<PlayerDashboard />} />
            <Route path="/dashboard/player/health"   element={<PlayerDashboard />} />
            <Route path="/dashboard/player/chat"     element={<ChatPage />} />
          </Route>

          {/* ── Parent ─────────────────────────────────────────── */}
          <Route element={<RoleRoute allowed={['Parent']} />}>
            <Route path="/dashboard/parent"          element={<ParentDashboard />} />
            <Route path="/dashboard/parent/schedule" element={<ParentDashboard />} />
            <Route path="/dashboard/parent/health"   element={<ParentDashboard />} />
            <Route path="/dashboard/parent/chat"     element={<ChatPage />} />
          </Route>

          {/* ── Settings (all roles) ───────────────────────────── */}
          <Route path="/dashboard/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
