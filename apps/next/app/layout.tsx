import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './global.css';
import { AuthProvider } from '@/lib/auth/provider';
import { ThemeProvider } from '@/lib/theme/provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PlaySAMS — Sports Academy Management',
  description: 'The command centre for elite academies.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // required for env(safe-area-inset-*) on iOS notched phones
  themeColor: '#111827',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <div id="launch-splash" aria-hidden="true">
          <div className="launch-splash-glow" />
          <img src="/brand/sams-mark.svg" alt="" />
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #launch-splash {
                display: none;
                position: fixed; inset: 0; z-index: 9999;
                align-items: center; justify-content: center;
                background: linear-gradient(160deg, #111827, #0A0F1E);
                pointer-events: none;
              }
              #launch-splash.show {
                display: flex;
                animation: launchSplashHide 400ms ease-out 1100ms forwards;
              }
              .launch-splash-glow {
                position: absolute; width: 220px; height: 220px; border-radius: 50%;
                background: radial-gradient(circle, rgba(99,102,241,0.55), rgba(99,102,241,0) 70%);
                filter: blur(6px);
                opacity: 0;
              }
              #launch-splash.show .launch-splash-glow {
                animation: launchSplashGlow 900ms ease-out forwards;
              }
              #launch-splash img {
                width: 108px; height: 134px; position: relative; z-index: 2;
                opacity: 0;
              }
              #launch-splash.show img {
                animation: launchSplashPop 620ms cubic-bezier(0.34,1.56,0.64,1) forwards;
              }
              @keyframes launchSplashPop {
                from { opacity: 0; transform: scale(0.4); }
                to   { opacity: 1; transform: scale(1); }
              }
              @keyframes launchSplashGlow {
                0%   { opacity: 0; transform: scale(0.7); }
                40%  { opacity: 0.85; transform: scale(1.15); }
                100% { opacity: 0.85; transform: scale(1.15); }
              }
              @keyframes launchSplashHide {
                from { opacity: 1; }
                to   { opacity: 0; visibility: hidden; }
              }
              @media (prefers-reduced-motion: reduce) {
                #launch-splash.show { animation: launchSplashHide 1ms linear 300ms forwards; }
                #launch-splash.show .launch-splash-glow,
                #launch-splash.show img { animation: none; opacity: 1; }
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
                    document.getElementById('launch-splash').classList.add('show');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js').catch(function () {});
                  });
                }
              })();
            `,
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
