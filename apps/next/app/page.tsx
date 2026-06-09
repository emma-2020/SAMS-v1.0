import { redirect } from 'next/navigation';

/** Root `/` — hard server-side redirect; avoids blank-screen flash.
 *  PublicOnlyGuard handles onward redirect to the role dashboard if
 *  the user already has a valid session. */
export default function RootPage() {
  redirect('/login');
}
