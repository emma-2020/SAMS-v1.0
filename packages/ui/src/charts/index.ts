// Generic fallback: re-exports the native stubs.
// Metro resolves index.native.tsx first on iOS/Android;
// Next.js webpack resolves index.web.tsx first on web.
// This file is only reached by non-platform-aware tooling (e.g., tsc).
export * from './index.native';
