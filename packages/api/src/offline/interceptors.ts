import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getCachedResponse, setCachedResponse, cacheKeyFor } from './cache';
import { isQueueableMutation, isCacheableGet } from './config';
import { enqueueMutation, flushOfflineQueue, listQueuedMutations, PermanentQueueError, type QueuedMutation } from './queue';
import { reportNetworkOutcome, recheckConnectivity } from './network';
import { OfflineQueuedError } from './errors';
import { clearAllOfflineStores } from './storage';

// Config carries the pre-serialization request body (stashed by
// stashRawRequestData below) and an opt-out flag set only by the queue's own
// replay call, so a replay that fails doesn't get queued a second time.
interface OfflineAwareConfig extends InternalAxiosRequestConfig {
  __offlineRawData?: unknown;
  skipOfflineQueue?: boolean;
}

// Axios's default transformRequest serializes `config.data` to a JSON string
// before the request goes out. By the time a network error reaches the
// response interceptor, `err.config.data` may already be that string rather
// than the original object, so the raw object is captured here in the
// request interceptor — before any transform runs — for reliable reuse when
// queueing.
export function stashRawRequestData(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  (config as OfflineAwareConfig).__offlineRawData = config.data;
  return config;
}

export async function cacheGetResponseIfApplicable(res: {
  config: InternalAxiosRequestConfig;
  data: unknown;
}): Promise<void> {
  if ((res.config.method ?? 'get').toLowerCase() !== 'get') return;
  if (!isCacheableGet(res.config.url)) return;
  const key = cacheKeyFor('get', res.config.url ?? '', res.config.params);
  await setCachedResponse(key, res.data);
}

type OfflineOutcome =
  | { type: 'cache-hit'; data: unknown }
  | { type: 'queued'; queueId: number }
  | { type: 'none' };

function isNetworkError(err: AxiosError): boolean {
  // A server response (even a 4xx/5xx) means the request reached the
  // backend — only the true "never got a response" case is offline-worthy.
  return !err.response;
}

async function tryHandleOffline(err: AxiosError): Promise<OfflineOutcome> {
  if (!isNetworkError(err)) return { type: 'none' };

  // A real network error is a real network error regardless of whether this
  // request happens to be a queue replay — report it before the
  // skipOfflineQueue short-circuit below, otherwise the network module never
  // learns a replay attempt failed (see queue.ts's PermanentQueueError vs
  // plain-network-failure distinction, which depends on this).
  reportNetworkOutcome(false);

  const config = err.config as OfflineAwareConfig | undefined;
  if (config?.skipOfflineQueue) return { type: 'none' };

  const method = (config?.method ?? 'get').toLowerCase();
  const url    = config?.url ?? '';

  if (method === 'get') {
    if (!isCacheableGet(url)) return { type: 'none' };
    const cached = await getCachedResponse(cacheKeyFor('get', url, config?.params));
    return cached !== undefined ? { type: 'cache-hit', data: cached } : { type: 'none' };
  }

  if (isQueueableMutation(method, url)) {
    const rawData = config?.__offlineRawData ?? config?.data ?? {};
    const data = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) as Record<string, unknown>;
    const queueId = await enqueueMutation({ method: method as QueuedMutation['method'], url, data });
    return { type: 'queued', queueId };
  }

  return { type: 'none' };
}

// Called from the response error handler in client.ts, right where it would
// otherwise fall through to `throw new Error(message)`. Returns a value to
// resolve the promise with (cache hit), throws OfflineQueuedError (queued),
// or returns undefined so the caller's existing error handling proceeds
// unchanged (not a network error, or nothing to offer offline).
export async function handleOfflineOnError(err: AxiosError): Promise<unknown> {
  const outcome = await tryHandleOffline(err);
  if (outcome.type === 'cache-hit') return outcome.data;
  if (outcome.type === 'queued') throw new OfflineQueuedError(outcome.queueId);
  return undefined;
}

// Set by installOfflineSupport so recheckOfflineStateOnResume (below) can
// kick a flush attempt without installOfflineSupport's caller needing to
// thread the axios client through separately. Module-level by necessity —
// there's only ever one apiClient/offline installation per app.
let attemptFlushRef: (() => void) | null = null;

export function installOfflineSupport(client: AxiosInstance): void {
  if (typeof window === 'undefined') return;

  const sender = async (item: QueuedMutation) => {
    try {
      return await client.request({
        method: item.method,
        url: item.url,
        data: item.data,
        skipOfflineQueue: true,
      } as OfflineAwareConfig);
    } catch (err) {
      // client.ts's response interceptor normalizes every rejection to a
      // plain Error before it reaches here, tagging it with `.status` only
      // when the server actually responded (see client.ts). That means this
      // item is genuinely rejected, not "still offline" — let
      // flushOfflineQueue drop it and move on instead of blocking every
      // other queued item behind it.
      if ((err as Error & { status?: number })?.status) {
        throw new PermanentQueueError((err as Error)?.message ?? 'Request rejected.');
      }
      throw err;
    }
  };

  const attemptFlush = () => { flushOfflineQueue(sender).catch(() => {}); };
  attemptFlushRef = attemptFlush;

  window.addEventListener('online', attemptFlush);
  attemptFlush(); // in case items were queued in a previous session

  // Backstop for "connected but no real throughput" — navigator.onLine and
  // the online/offline events don't fire for that case, only real requests
  // reveal it. Only bothers making a request if something is actually queued.
  // Note: this interval (like all JS timers) is paused while an Android
  // Capacitor WebView is backgrounded, so it cannot be relied on to recover
  // promptly from a stale offline state after a resume — that's what
  // recheckOfflineStateOnResume below is for.
  setInterval(() => {
    listQueuedMutations().then((items) => { if (items.length) attemptFlush(); });
  }, 30_000);
}

// Called on app resume (native Capacitor only — see
// apps/next/lib/auth/useNativeConnectivityResume.ts). Two independent,
// idempotent corrections for the same root cause: the WebView missing a
// connectivity transition while backgrounded.
//  1. recheckConnectivity() re-reads navigator.onLine fresh rather than
//     trusting whatever the last-received (and possibly missed) event left
//     `online` as.
//  2. Kicking the flush attempt directly, rather than waiting for the
//     'online' event or the 30s backstop interval (also paused while
//     backgrounded) to get around to it — if anything is queued and
//     connectivity is actually back, this proves it immediately via a real
//     request and self-corrects `online` through reportNetworkOutcome(true).
//     A no-op if nothing is queued.
export function recheckOfflineStateOnResume(): void {
  recheckConnectivity();
  attemptFlushRef?.();
}

// Call on logout so cached reads and queued-but-unsent mutations from the
// signed-out account are never served to, or replayed under, whoever signs
// into this device next.
export async function clearOfflineData(): Promise<void> {
  await clearAllOfflineStores();
}

export { OfflineQueuedError } from './errors';
export { subscribeOfflineQueue, listQueuedMutations } from './queue';
export { isOffline, onNetworkChange } from './network';
export type { QueuedMutation, QueueEvent } from './queue';
