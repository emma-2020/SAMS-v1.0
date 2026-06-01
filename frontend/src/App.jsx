// src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import AppRouter    from './router/AppRouter';
import './styles/globals.css';
import './styles/components.css';

/**
 * App
 * ────
 * Root component. Render order:
 *
 * BrowserRouter      — provides routing context
 *   AuthProvider     — restores persisted session on mount
 *     AppRouter      — declares all routes + guards
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
