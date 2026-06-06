const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot  = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Monorepo: let Metro reach the entire workspace ────────────────────────────
config.watchFolders = [workspaceRoot];

// Resolve @sams/* packages from both the app's node_modules AND the root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Enable symlink resolution for pnpm junction links (Windows) and Unix symlinks
config.resolver.unstable_enableSymlinks = true;

// Honour the "exports" field in package.json (needed for @sams/* workspace pkgs)
config.resolver.unstable_enablePackageExports = true;

// Platform-specific extensions — .native.* resolves before generic on Expo
config.resolver.sourceExts = [
  'native.tsx', 'native.ts', 'native.jsx', 'native.js',
  ...config.resolver.sourceExts,
];

// ── NativeWind v4 ─────────────────────────────────────────────────────────────
module.exports = withNativeWind(config, { input: './global.css' });
