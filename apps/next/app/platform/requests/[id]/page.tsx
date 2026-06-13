import { createElement } from 'react';
import RequestDetailClient from './RequestDetailClient';

// Returns a placeholder so Next.js static-export passes the prerenderRoutes.length check.
// Real IDs are resolved client-side at runtime via useParams(); this shell is never used directly.
export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function RequestDetailPage() {
  return createElement(RequestDetailClient);
}
