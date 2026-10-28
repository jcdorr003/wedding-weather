import type * as z from 'zod/mini'

export class FetchError extends Error {
  constructor(
    readonly kind: 'http' | 'timeout' | 'network' | 'empty',
    readonly status?: number,
  ) {
    super(kind)
  }
}

const TIMEOUT_MS = 15_000
const retryable = (status: number) => status >= 500 || status === 429

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })

type GetOptions = { tries?: number; accept?: string; signal?: AbortSignal }

/**
 * GET a JSON document, retrying server errors, rate limits and network failures with a short backoff. Each attempt
 * times out after 15 s. `signal` (from TanStack Query) cancels everything, including the retries.
 */
export const getJSON = async (url: string, { tries = 3, accept = 'application/geo+json', signal }: GetOptions = {}) => {
  let last = new FetchError('network')
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt) await sleep(800 * attempt, signal)
    const timeout = AbortSignal.timeout(TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        headers: { Accept: accept },
        cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
      if (res.ok) return (await res.json()) as unknown
      last = new FetchError('http', res.status)
      if (!retryable(res.status)) break
    } catch (e) {
      if (signal?.aborted) throw e
      last = new FetchError(timeout.aborted ? 'timeout' : 'network')
    }
  }
  throw last
}

/** Validate only what the page reads. A shape mismatch reads as an incomplete forecast, not a crash. */
export const parse = <T>(schema: z.ZodMiniType<T>, value: unknown): T => {
  const result = schema.safeParse(value)
  if (!result.success) throw new FetchError('empty')
  return result.data
}

export const friendlyError = (e: unknown) => {
  if (!navigator.onLine) return 'Your device looks offline. Reconnect, then tap Refresh Data.'
  const err = e instanceof FetchError ? e : null
  if (err?.kind === 'timeout')
    return 'The National Weather Service is responding slowly right now. Tap Refresh Data again in a minute.'
  if (err?.kind === 'http' && err.status != null && retryable(err.status))
    return 'The National Weather Service forecast server is temporarily unavailable. This happens now and then; try again in a few minutes.'
  if (err?.kind === 'http')
    return `The National Weather Service returned an unexpected response (error ${err.status}). Try again later.`
  if (err?.kind === 'empty') return 'The forecast came back incomplete. Tap Refresh Data to try again.'
  return 'Couldn’t reach the National Weather Service. Check your connection and tap Refresh Data.'
}
