import { useSyncExternalStore } from 'react'
import { MINUTE, clock } from './time'

// One shared clock tick, on the minute, so time-based views (past hours, passed days, alert expiry) stay current
// while the page is open. Paused while the page is hidden; catches up as soon as it's visible again.
let now: number | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

const tick = () => {
  now = clock.nowMs()
  for (const listener of listeners) listener()
}

const schedule = () => {
  clearTimeout(timer)
  if (document.visibilityState !== 'visible') return
  timer = setTimeout(
    () => {
      tick()
      schedule()
    },
    MINUTE - (clock.nowMs() % MINUTE),
  )
}

const onVisibility = () => {
  if (document.visibilityState === 'visible') tick()
  schedule()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisibility)
    schedule()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size) return
    document.removeEventListener('visibilitychange', onVisibility)
    clearTimeout(timer)
  }
}

const getSnapshot = () => (now ??= clock.nowMs())

/** The current time (epoch ms), updated every minute. Client-only. */
export const useNow = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
