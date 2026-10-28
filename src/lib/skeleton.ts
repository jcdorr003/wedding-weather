export type SkeletonKind = 'passed' | 'full' | 'model'

/**
 * Which card each day will most likely show, so the loading skeleton has the right shape and the page doesn't
 * jump when the forecast lands: the NWS 7-day forecast reaches about six days ahead; past that it's a model read.
 * Plain JS on purpose: it also runs as an inline script before first paint, where Temporal may not exist.
 */
export const predictKinds = (days: readonly string[], now: number): SkeletonKind[] => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)
  const reach = new Date(Date.parse(`${today}T12:00:00Z`) + 6 * 864e5).toISOString().slice(0, 10)
  return days.map((d) => (d < today ? 'passed' : d <= reach ? 'full' : 'model'))
}

/** Inline script for <head>: marks <html data-skel-N="kind"> so CSS shows the right prerendered skeleton. */
export const skeletonScript = (days: readonly string[], nowExpr = 'Date.now()') => {
  return `(() => { try {
  (${predictKinds.toString()})(${JSON.stringify(days)}, ${nowExpr})
    .forEach((k, i) => document.documentElement.setAttribute('data-skel-' + i, k));
} catch { /* the default skeleton shows */ } })();`
}
