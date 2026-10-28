import { WEDDING_DAYS, WEDDING_TITLE } from '../lib/config'
import { useForecast } from '../lib/data/useForecast'
import { friendlyError } from '../lib/api/http'
import { dayCard } from '../lib/forecast/day'
import { activeAlerts, previewLine, stamp, title } from '../lib/forecast/header'
import { predictKinds } from '../lib/skeleton'
import { fmtStamp } from '../lib/time'
import { useNow } from '../lib/useNow'
import { Alerts, Notice } from './Banners'
import { DayCard } from './DayCard'
import { Header } from './Header'
import { DaysSection, Footer, TimelineSection } from './Sections'
import { DaySkeletons, TimelineSkeletons } from './Skeletons'
import { Timelines } from './timeline/Timelines'

/** The prerendered page: static title, loading line and skeletons shaped by the inline head script. */
export const Shell = () => (
  <div className="wrap">
    <Header title={WEDDING_TITLE} stamp="Loading the latest forecast…" />
    <Alerts alerts={[]} />
    <Notice lines={[]} />
    <DaysSection earlyNote="predicted">
      <DaySkeletons days={WEDDING_DAYS} />
    </DaysSection>
    <TimelineSection>
      <TimelineSkeletons days={WEDDING_DAYS} />
    </TimelineSection>
    <Footer />
  </div>
)

type Props = { days: readonly string[]; preview: boolean; savedKey: string }

export const WeatherPage = ({ days, preview, savedKey }: Props) => {
  const now = useNow()
  const { data, busy, error, saved, refresh, modelsLoading } = useForecast({ days, preview, now, savedKey })
  const loadFailed = !!error && !data
  // Nothing to show yet (first visit, nothing saved): card-shaped skeletons until the official forecast lands. If it
  // can't load, they stay in place, frozen and faded, under the error notice, so nothing collapses.
  const kinds = data ? null : predictKinds(days, now)
  const cards = days.map((day) => dayCard(day, data, now))
  // Model odds still loading for a day the NWS doesn't cover yet: keep that card's skeleton.
  const awaitingModels = (i: number) => cards[i]?.kind === 'pending' && modelsLoading

  const notice = [
    preview ? previewLine(days) : '',
    error ? friendlyError(error) : '',
    error && data ? `Still showing the last good update from ${fmtStamp(data.fetchedAt)}.` : '',
  ].filter(Boolean)

  return (
    <div className="wrap">
      <Header
        title={title(days)}
        stamp={kinds && !error ? 'Loading the latest forecast…' : stamp(data, saved, now)}
        busy={busy}
        onRefresh={refresh}
      />
      <Alerts alerts={activeAlerts(data?.alerts, now)} links={data?.links} />
      <Notice lines={notice} />
      <DaysSection
        earlyNote={kinds ? kinds.includes('model') : cards.some((c, i) => c.kind === 'early' || awaitingModels(i))}
      >
        {kinds ? (
          <DaySkeletons days={days} kinds={kinds} failed={loadFailed} />
        ) : (
          days.map((day, i) =>
            awaitingModels(i) ? (
              <DaySkeletons key={day} days={[day]} kinds={['model']} />
            ) : (
              <DayCard key={day} day={day} card={cards[i] ?? { kind: 'nodata' }} loadFailed={loadFailed} />
            ),
          )
        )}
      </DaysSection>
      <TimelineSection radar={data?.links.radar}>
        {kinds ? (
          <TimelineSkeletons days={days} kinds={kinds} failed={loadFailed} />
        ) : (
          <Timelines days={days.slice(1)} data={data} now={now} loadFailed={loadFailed} />
        )}
      </TimelineSection>
      <Footer grid={data?.grid} />
    </div>
  )
}
