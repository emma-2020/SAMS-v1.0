import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './global.css';
import { AuthProvider } from '@/lib/auth/provider';
import { ThemeProvider } from '@/lib/theme/provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SAMS — Sports Academy Management',
  description: 'The command centre for elite academies.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
