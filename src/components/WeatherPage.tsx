import { POINT, WEDDING_DAYS, WEDDING_TITLE } from '../lib/config'
import { activeAlerts, dayCard, fmtStamp, previewLine, stamp, title } from '../lib/forecast'
import { type Forecast, friendlyError } from '../lib/nws'
import { predictKinds } from '../lib/skeleton'
import { clock } from '../lib/time'
import { useForecast } from '../lib/useForecast'
import { DayCard } from './DayCard'
import { DaySkeletons, TimelineSkeletons } from './Skeletons'
import { Timelines } from './Timelines'

const ALERT_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.5h.01" />
  </svg>
)

type Props = {
  heading: string
  stampText: string
  busy: boolean
  onRefresh?: () => void
  alerts?: React.ReactNode
  notice: string[]
  days?: React.ReactNode
  earlyNote: boolean | 'predicted'
  timelines?: React.ReactNode
  radar: string
  footer?: React.ReactNode
}

// The page frame. Prerendered as-is (with the static title and a loading line) before any script runs.
function Frame(p: Props) {
  return (
    <div className="wrap">
      <header className="top">
        <p className="eyebrow">Wedding Weather Control Station — Park Slope, Brooklyn</p>
        <h1 id="title">{p.heading}</h1>
        <div className="controls">
          <button
            id="refresh"
            className={p.busy ? 'btn loading' : 'btn'}
            type="button"
            disabled={p.busy}
            aria-busy={p.busy || undefined}
            onClick={p.onRefresh}
          >
            <span className="spin" aria-hidden="true" />
            <span id="refresh-label">{p.busy ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
          <p className="stamp" id="stamp" aria-live="polite">
            {p.stampText}
          </p>
        </div>
      </header>

      <div id="alerts" className="alerts" role="status" hidden={!p.alerts}>
        {p.alerts}
      </div>
      <div id="notice" className="notice" role="status" hidden={!p.notice.length}>
        {p.notice.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>

      <section aria-labelledby="days-h">
        <h2 id="days-h" className="section-h">
          Day by day
        </h2>
        <div className="days" id="days">
          {p.days}
        </div>
        <p
          className={p.earlyNote === 'predicted' ? 'early-note predicted' : 'early-note'}
          id="early-note"
          hidden={!p.earlyNote}
        >
          Early model reads come from the US (GFS) and European (ECMWF) ensemble forecasts via Open-Meteo, not from the
          National Weather Service. Each model is run dozens of times with small tweaks, and the bars show how many of
          those runs produce at least 0.04 inches of rain during the day. More than a week out, storm timing still
          shifts from run to run, so expect these to move until the official forecast takes over. NWS forecasters
          explain how they read the models in their{' '}
          <a
            href="https://forecast.weather.gov/product.php?site=OKX&issuedby=OKX&product=AFD"
            target="_blank"
            rel="noopener"
          >
            forecast discussion
          </a>
          .
        </p>
      </section>

      <section aria-labelledby="tl-h">
        <h2 id="tl-h" className="section-h">
          Hourly Rain Timeline
        </h2>
        <p className="section-sub">
          Chance of rain for each hour, midnight to midnight. Tap or hover a bar for details. The dashed line is 20%,
          where the NWS starts calling it a “slight chance.” For what’s falling right now, open the{' '}
          <a id="radar-link" href={p.radar} target="_blank" rel="noopener">
            live NWS radar
          </a>
          .
        </p>
        {p.timelines ?? <div className="timelines" id="timelines" />}
      </section>

      <footer id="footer">
        {p.footer ?? 'Forecast from the National Weather Service (api.weather.gov) for 40.665° N, 73.971° W.'}
      </footer>
    </div>
  )
}

export function Shell() {
  return (
    <Frame
      heading={WEDDING_TITLE}
      stampText="Loading the latest forecast…"
      busy={false}
      notice={[]}
      days={<DaySkeletons days={WEDDING_DAYS} />}
      earlyNote="predicted"
      timelines={<TimelineSkeletons days={WEDDING_DAYS} />}
      radar="https://radar.weather.gov/"
    />
  )
}

export function WeatherPage({ days, preview }: { days: readonly string[]; preview: boolean }) {
  const { data, busy, error, saved, refresh, modelsLoading } = useForecast(days, preview)
  const loadFailed = !!error && !data
  const cards = days.map((k) => dayCard(k, data))
  const alerts = activeAlerts(data?.alerts)

  // First visit with nothing saved: skeletons and the prerendered loading line until the official forecast lands.
  const loading = !data && !error
  const kinds = loading ? predictKinds(days, clock.nowMs()) : null
  const stampText = loading ? 'Loading the latest forecast…' : stamp(data, saved)
  const notice = [
    preview ? previewLine(days) : '',
    error ? friendlyError(error) : '',
    error && data ? `Still showing the last good update from ${fmtStamp(data.fetchedAt)}.` : '',
  ].filter(Boolean)

  return (
    <Frame
      heading={title(days)}
      stampText={stampText}
      busy={busy}
      onRefresh={refresh}
      alerts={alerts.length ? <Alerts data={data} list={alerts} /> : null}
      notice={notice}
      days={
        kinds ? (
          <DaySkeletons days={days} kinds={kinds} />
        ) : (
          days.map((k, i) => {
            const card = cards[i]!
            return card.kind === 'pending' && modelsLoading ? (
              <DaySkeletons key={k} days={[k]} kinds={['model']} />
            ) : (
              <DayCard key={k} day={k} card={card} loadFailed={loadFailed} />
            )
          })
        )
      }
      earlyNote={
        kinds
          ? kinds.includes('model')
          : cards.some((c) => c.kind === 'early' || (c.kind === 'pending' && modelsLoading))
      }
      timelines={
        kinds ? (
          <TimelineSkeletons days={days} kinds={kinds} />
        ) : (
          <Timelines days={days.slice(1)} data={data} loadFailed={loadFailed} />
        )
      }
      radar={
        data?.links.radar
          ? `https://radar.weather.gov/station/${encodeURIComponent(data.links.radar.toLowerCase())}/standard`
          : 'https://radar.weather.gov/'
      }
      footer={
        data?.grid && (
          <>
            Forecast from the{' '}
            <a
              href={`https://forecast.weather.gov/MapClick.php?lat=${POINT.lat}&lon=${POINT.lon}`}
              target="_blank"
              rel="noopener"
            >
              National Weather Service
            </a>
            , {data.grid.office} grid {data.grid.x},{data.grid.y} (40.665° N, 73.971° W).
          </>
        )
      }
    />
  )
}

function Alerts({ data, list }: { data: Forecast | null; list: ReturnType<typeof activeAlerts> }) {
  const more =
    data?.links.zone && data.links.county
      ? `https://forecast.weather.gov/showsigwx.php?warnzone=${encodeURIComponent(data.links.zone)}&warncounty=${encodeURIComponent(data.links.county)}`
      : `https://forecast.weather.gov/MapClick.php?lat=${POINT.lat}&lon=${POINT.lon}`
  return list.map((a, i) => {
    const level =
      a.severity === 'Extreme' || a.severity === 'Severe' ? ' severe' : a.severity === 'Moderate' ? ' moderate' : ''
    return (
      <div key={i} className={`alert${level}`}>
        {ALERT_ICON}
        <div>
          <p className="alert-h">{a.event}</p>
          {a.headline && <p>{a.headline}</p>}
          <a href={more} target="_blank" rel="noopener">
            Read the full alert from the NWS
          </a>
        </div>
      </div>
    )
  })
}
