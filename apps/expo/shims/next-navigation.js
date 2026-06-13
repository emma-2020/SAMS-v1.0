/**
 * Metro shim: maps `next/navigation` → expo-router for the Expo web bundle.
 * Solito's useRouter calls `useNextAppDirRouter` which imports from next/navigation.
 * In an Expo Router context there is no Next.js App Router, so next/navigation
 * hooks throw. This shim re-exports the equivalent expo-router hooks instead.
 * Only Metro sees this file — Next.js webpack resolves the real next/navigation.
 */
export {
  useRouter,
  usePathname,
  useLocalSearchParams as useSearchParams,
  useLocalSearchParams as useParams,
} from 'expo-router';

// redirect / notFound are used server-side only; no-op stubs for completeness.
export const redirect = (url) => { console.warn('[shim] redirect to', url); };
export const notFound = () => { console.warn('[shim] notFound called'); };
