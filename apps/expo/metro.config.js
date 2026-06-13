const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot  = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Monorepo: reach the entire workspace ──────────────────────────────────────
config.watchFolders = [workspaceRoot];

// Resolution order: project node_modules → workspace root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Resolve pnpm junction links (Windows) and Unix symlinks inside workspace pkgs
config.resolver.unstable_enableSymlinks = true;

// NOTE: unstable_enablePackageExports is intentionally disabled.
// Enabling it causes Metro to follow pnpm's virtual store symlinks
// (.pnpm/expo-router@.../...) and serve package.json files with
// Content-Type: application/json, which browsers refuse to execute.
// @sams/* workspace packages are already resolved via nodeModulesPaths.

// ── next/navigation shim ──────────────────────────────────────────────────────
// Solito's useRouter (used in LoginScreen.web.tsx) internally imports
// `next/navigation` on the web platform target. In an Expo Router context
// there is no Next.js App Router, so the real hooks throw. Re-route the
// import to a local shim that re-exports the equivalent expo-router hooks.
// This alias only affects Metro — Next.js webpack sees the real package.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'next/navigation': path.resolve(projectRoot, 'shims/next-navigation.js'),
};

// ── NativeWind v4 ─────────────────────────────────────────────────────────────
module.exports = withNativeWind(config, { input: './global.css' });
