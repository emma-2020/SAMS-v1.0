// src/hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useApi
 * ───────
 * Generic data-fetching hook. Wraps any async function that returns data.
 * Handles loading, error, and refetch states cleanly.
 *
 * @param {Function}  fetchFn       Async function that returns data
 * @param {any[]}     deps          Dependency array — refetches when these change
 * @param {object}    options
 * @param {boolean}   options.immediate  Whether to fetch on mount (default true)
 * @param {any}       options.fallback   Default data value (default null)
 *
 * @returns {{ data, loading, error, refetch, setData }}
 *
 * Usage:
 *   const { data: events, loading, error, refetch } = useApi(
 *     () => scheduleApi.getEvents({ start, end }),
 *     [start, end]
 *   );
 */
export function useApi(fetchFn, deps = [], { immediate = true, fallback = null } = {}) {
  const [data,    setData]    = useState(fallback);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute]);

  return { data, loading, error, refetch: execute, setData };
}

/**
 * useSubmit
 * ──────────
 * Mutation hook for POST/PATCH/DELETE actions.
 * Does not auto-execute — call submit() manually.
 *
 * @returns {{ submit, loading, error, success, reset }}
 */
export function useSubmit(submitFn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await submitFn(...args);
      setSuccess(true);
      return { ok: true, data: result };
    } catch (err) {
      const msg = err.message || 'Submission failed. Please try again.';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [submitFn]);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { submit, loading, error, success, reset };
}
