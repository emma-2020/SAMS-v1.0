// Server component wrapper — metadata here, renders client LoginScreen
import type { Metadata } from 'next';
import { LoginScreen } from '@sams/app';

export const metadata: Metadata = { title: 'Sign In — SAMS' };

export default function LoginPage() {
  return <LoginScreen />;
}
