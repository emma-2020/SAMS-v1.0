import { Redirect } from 'expo-router';

/**
 * Catch-all for unmatched routes (e.g. Next.js-style paths like
 * /dashboard/admin that come from shared navigation config).
 * Redirect to root so the (tabs) layout picks up the correct screen
 * based on the authenticated user's role in Zustand.
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
