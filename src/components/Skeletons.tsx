import type { DayCard as Card, FullDay } from '../lib/forecast/day'
import type { SkeletonKind } from '../lib/skeleton'
import { CardHead, DayBody } from './DayCard'
import { Chart, ChartKey } from './timeline/Chart'

// Loading placeholders built from the real card markup with sample text, which CSS paints as bars. Same
// elements, same line heights, so the cards keep their size when the forecast replaces them.
const FULL: FullDay = {
  kind: 'full',
  hi: '58°',
  lo: 'Low 49°',
  sky: 'Chance Rain Showers',
  rain: '40%',
  rainNight: 'Night 30%',
  wind: '10–15 mph',
  windSub: 'from SW',
  detail:
    'A chance of rain showers. Mostly cloudy, with a high near 58. Southwest wind 10 to 15 mph. Chance of precipitation is 40%.',
  thunder: null,
  parts: {
    blocks: ['Early', 'Morning', 'Afternoon', 'Evening'].map((name) => ({
      name,
      range: '1a–7a',
      past: false,
      chance: 30,
      amount: 1,
    })),
    total: '0.10 in',
    totalFromNow: false,
    note: null,
  },
  night: { sky: 'Mostly Cloudy', temp: 49, wind: '5–10 mph' },
}
const SAMPLE: Record<SkeletonKind, Card> = {
  full: FULL,
  model: {
    kind: 'early',
    read: {
      head: 'Could go either way',
      sub: 'About 5 in 10 model runs show rain that day. Confidence is low this far out, so expect this to shift.',
      runs: [
        { name: 'US model (GFS)', wet: 15, total: 31, share: 48 },
        { name: 'European model (ECMWF)', wet: 25, total: 51, share: 49 },
      ],
      pending: 'The official NWS forecast for Thursday should appear around Friday, Oct 30.',
    },
  },
  passed: { kind: 'passed' },
}

/**
 * `kinds` is one kind per day when it's known (in the browser). In the prerendered HTML it isn't, so every
 * variant is rendered and CSS keeps the one the inline <head> script picked (see lib/skeleton.ts).
 */
export const DaySkeletons = ({ days, kinds }: { days: readonly string[]; kinds?: SkeletonKind[] }) => {
  return days.map((k, i) => (
    <article key={k} className="card day skeleton" aria-hidden="true">
      <CardHead day={k} />
      {kinds ? (
        <DayBody card={SAMPLE[kinds[i] ?? 'model']} loadFailed={false} />
      ) : (
        (['full', 'model', 'passed'] as const).map((v) => (
          <div key={v} className={`sk-v sk-${v}`}>
            <DayBody card={SAMPLE[v]} loadFailed={false} />
          </div>
        ))
      )}
    </article>
  ))
}

const TimelineBody = ({ day, kind }: { day: string; kind: SkeletonKind }) => {
  if (kind === 'passed')
    return (
      <div>
        <p className="verdict-sub">This day has passed.</p>
      </div>
    )
  return (
    <>
      <div>
        <p className="verdict-h">{kind === 'full' ? 'Dry from 3 PM' : 'Hourly data not out yet'}</p>
        <p className="verdict-sub">
          Rain chance reaches 20% or more between 9 AM and 2 PM, then stays under 20%. Peak 40% at 11 AM.
        </p>
      </div>
      <Chart day={day} />
      <ChartKey clear={false} />
      {kind === 'full' && (
        <details>
          <summary>Hour by hour</summary>
        </details>
      )}
    </>
  )
}

/** Hourly cards for days[1..]; `kinds` lines up with `days`, as for DaySkeletons. */
export const TimelineSkeletons = ({ days, kinds }: { days: readonly string[]; kinds?: SkeletonKind[] }) => (
  <div className="timelines" id="timelines">
    {days.slice(1).map((k, i) => (
      <article key={k} className="card tl skeleton" aria-hidden="true">
        <CardHead day={k} />
        {kinds ? (
          <TimelineBody day={k} kind={kinds[i + 1] ?? 'model'} />
        ) : (
          (['full', 'model', 'passed'] as const).map((v) => (
            <div key={v} className={`sk-v sk-${v}`}>
              <TimelineBody day={k} kind={v} />
            </div>
          ))
        )}
      </article>
    ))}
  </div>
)
