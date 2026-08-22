// Global test setup — runs once per test file before its tests execute.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement matchMedia; RN-web / responsive components that
// probe it (directly or transitively via a shared component) would
// otherwise throw "matchMedia is not a function".
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

// jsdom also lacks ResizeObserver and IntersectionObserver, which recharts'
// <ResponsiveContainer> and some RN-web layout components touch.
class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = MockObserver as unknown as typeof ResizeObserver;
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;
  }
}

// jsdom doesn't implement scrollIntoView either — chat's message list and
// similar auto-scroll-to-latest views call it after loading/sending.
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
