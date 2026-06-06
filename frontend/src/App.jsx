// src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import AuthProvider      from './context/AuthProvider';
import { ThemeProvider } from './context/ThemeContext';
import AppRouter         from './router/AppRouter';
import './styles/globals.css';
import './styles/components.css';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
