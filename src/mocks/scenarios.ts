// The six mock scenarios (labels, notes, pretend times). No MSW import, so the app shell can read it cheaply.
export const SCENARIOS = {
  wedding: {
    label: 'Wedding week',
    note: 'Pretend it’s Wed Nov 4, 6 PM. All three days are in the NWS forecast with rain amounts. Rain Thursday, clearing Friday morning; Saturday is dry.',
    now: '2026-11-04T18:00:00-05:00',
  },
  today: {
    label: 'Today (Oct 27)',
    note: 'Pretend it’s Tue Oct 27, noon. The wedding days are past the NWS range, so the early model read shows instead.',
    now: '2026-10-27T12:00:00-04:00',
  },
  halfway: {
    label: 'Halfway (Oct 31)',
    note: 'Pretend it’s Sat Oct 31. Thursday and Friday are in the official forecast but NWS rain amounts aren’t out yet, so their rain-by-time-of-day blocks show chances only, with a note on when amounts arrive. Saturday is still a model read.',
    now: '2026-10-31T10:00:00-04:00',
  },
  down: {
    label: 'NWS down',
    note: 'The forecast server returns errors. The page keeps the last good data saved on this device, if any.',
    now: '2026-11-04T18:00:00-05:00',
  },
  saturday: {
    label: 'Sat 9:30 AM',
    note: 'The wedding day itself, with a made-up Wind Advisory to show how NWS alerts appear. Earlier hours are marked as passed.',
    now: '2026-11-07T09:30:00-05:00',
  },
  overnight: {
    label: 'Sat 2:30 AM',
    note: 'Early on the wedding day, the forecast opens with an “Overnight” period (low 41°). The card must show Saturday night’s low (47°) instead. The forecast was issued the day before.',
    now: '2026-11-07T02:30:00-05:00',
  },
} as const satisfies Record<string, { label: string; note: string; now: string }>
export type Scenario = keyof typeof SCENARIOS
export const isScenario = (s: string | null | undefined): s is Scenario => !!s && s in SCENARIOS
